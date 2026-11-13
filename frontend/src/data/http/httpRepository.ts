/**
 * ADAPTER HTTP — alinhado a `contracts/openapi.yaml` (branch codex/backend-foundation, commit 1dca59b).
 *
 * Convenções do contrato: prefixo /api/v1, Bearer token, listas paginadas
 * `{ items, total, offset, limit }` (limit ≤ 100), dinheiro em centavos (`*_cents`),
 * decimais como string, datas de negócio `occurred_on` (AAAA-MM-DD, sem hora),
 * erros `{ error: { code, message, details? }, request_id }`.
 *
 * Onde o contrato não cobre algo que a interface usa, o adapter faz o mínimo no cliente
 * e a lacuna está registrada em docs/product/api-needs.md (seção "Divergências").
 */
import type { EntryFilter, FleetRepository, UploadDocumentInput } from '../repository'
import type {
  CreateResult,
  DocumentFile,
  Driver,
  Entry,
  EntryStatus,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseInput,
  ExtractedField,
  Freight,
  FuelEntry,
  FuelInput,
  FuelType,
  ReviewDecision,
  Trip,
  Vehicle,
} from '@/domain/types'
import type { ReportData } from '@/domain/reports'
import { duplicateIssue, expenseIssues, findDuplicates, fuelIssues } from '@/domain/rules'
import { formatDecimal } from '@/lib/format'

const API = '/api/v1'
const PAGE = 100

/* ---------- DTOs do contrato (somente os campos usados) ---------- */

type ReviewStatus = 'pending' | 'approved' | 'rejected'
interface Page<T> {
  items: T[]
  total: number
  offset: number
  limit: number
}
export interface VehicleDTO {
  id: string
  plate: string
  name: string
  country?: string
  active?: boolean
}
export interface DriverDTO {
  id: string
  name: string
  user_id?: string | null
  vehicle_id?: string | null
  active?: boolean
}
export interface TripDTO {
  id: string
  review_status: ReviewStatus
  vehicle_id: string
  driver_id: string
  occurred_on: string
  origin: string
  destination: string
  contractor?: string | null
  commodity?: string | null
  start_odometer_km?: string | null
  end_odometer_km?: string | null
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
}
export interface FreightDTO {
  id: string
  trip_id: string
  gross_cents: number
  net_cents?: number
  currency?: string
}
export interface FuelingDTO {
  id: string
  review_status: ReviewStatus
  vehicle_id: string
  driver_id: string
  trip_id?: string | null
  document_id?: string | null
  occurred_on: string
  liters: string
  amount_cents: number
  station: string
  odometer_km?: string | null
  /** campo adicionado no contrato em evolução (não commitado na 1dca59b) */
  fuel_type?: string | null
}
export interface ExpenseDTO {
  id: string
  review_status: ReviewStatus
  vehicle_id: string
  driver_id: string
  trip_id?: string | null
  category_id?: string | null
  document_id?: string | null
  occurred_on: string
  description: string
  amount_cents: number
}
export interface CategoryDTO {
  id: string
  name: string
}
export interface DocumentDTO {
  id: string
  created_at: string
  filename: string
  media_type: string
  size_bytes: number
}
export interface PendingDTO {
  id: string
  target: 'trips' | 'fuelings' | 'expenses'
  payload: Record<string, unknown>
  document_id?: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  warnings?: string[]
}
export interface ProfileDTO {
  id: string
  company_id: string
  name: string
  email: string
  role: 'manager' | 'driver'
}

/* ---------- Erros ---------- */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = `Erro ${res.status} ao falar com o servidor.`
  let code: string | undefined
  try {
    const body = await res.json()
    code = body?.error?.code
    message = body?.error?.message ?? message
    const details = body?.error?.details as { message?: string }[] | undefined
    if (code === 'validation_error' && details?.length) {
      message = `${message}: ${details.map((d) => d.message).filter(Boolean).join('; ')}`
    }
  } catch {
    /* corpo não-JSON */
  }
  if (res.status === 401) message = 'Sua sessão expirou. Entre novamente.'
  return new ApiError(res.status, message, code)
}

/* ---------- Conversões ---------- */

export const toCents = (v: number) => Math.round(v * 100)
export const fromCents = (c: number) => c / 100
const num = (v: string | null | undefined) => (v == null || v === '' ? undefined : Number(v))
const dateOnly = (iso: string) => iso.slice(0, 10)

export const STATUS_FROM_REVIEW: Record<ReviewStatus, EntryStatus> = {
  pending: 'pendente',
  approved: 'aprovado',
  rejected: 'devolvido',
}

function fuelTypeFrom(v?: string | null): FuelType {
  const s = (v ?? '').toLowerCase()
  if (s.includes('arla')) return 'arla32'
  if (s.includes('500')) return 'diesel_s500'
  return 'diesel_s10'
}

export function mapVehicle(v: VehicleDTO, drivers: DriverDTO[]): Vehicle {
  return {
    id: v.id,
    plate: v.plate,
    model: v.name,
    description: '',
    year: 0,
    fuelType: 'diesel_s10',
    odometerKm: 0,
    driverId: drivers.find((d) => d.vehicle_id === v.id && d.active !== false)?.id,
    active: v.active !== false,
  }
}

export function mapDriver(d: DriverDTO): Driver {
  return { id: d.id, name: d.name, vehicleId: d.vehicle_id ?? '' }
}

export function mapTrip(t: TripDTO, freight?: FreightDTO): Trip {
  const done = t.status === 'completed'
  return {
    id: t.id,
    vehicleId: t.vehicle_id,
    driverId: t.driver_id,
    origin: t.origin,
    destination: t.destination,
    startDate: t.occurred_on,
    // O contrato não tem data de chegada: usamos a data da viagem.
    endDate: done ? t.occurred_on : undefined,
    startKm: num(t.start_odometer_km) ?? 0,
    endKm: done ? num(t.end_odometer_km) : undefined,
    status: done ? 'concluida' : 'em_andamento',
    freight: freight
      ? { client: t.contractor ?? 'Cliente não informado', cargo: t.commodity ?? '', value: fromCents(freight.gross_cents) }
      : undefined,
  }
}

export function mapFuel(f: FuelingDTO): FuelEntry {
  const base: FuelEntry = {
    id: f.id,
    kind: 'abastecimento',
    vehicleId: f.vehicle_id,
    driverId: f.driver_id,
    tripId: f.trip_id ?? undefined,
    documentId: f.document_id ?? undefined,
    date: f.occurred_on,
    station: f.station,
    liters: Number(f.liters),
    total: fromCents(f.amount_cents),
    odometerKm: num(f.odometer_km),
    fuelType: fuelTypeFrom(f.fuel_type),
    status: STATUS_FROM_REVIEW[f.review_status],
    issues: [],
    source: f.document_id ? 'comprovante' : 'manual',
    createdBy: 'motorista',
  }
  // O contrato não devolve motivos de pendência: mostramos os que a interface consegue inferir.
  if (base.status === 'pendente') base.issues = fuelIssues(base, {})
  return base
}

export function mapExpense(e: ExpenseDTO, categories: ExpenseCategory[]): ExpenseEntry {
  const categoryId = e.category_id ?? 'sem-categoria'
  const base: ExpenseEntry = {
    id: e.id,
    kind: 'despesa',
    vehicleId: e.vehicle_id,
    driverId: e.driver_id,
    tripId: e.trip_id ?? undefined,
    documentId: e.document_id ?? undefined,
    date: e.occurred_on,
    categoryId,
    description: e.description,
    value: fromCents(e.amount_cents),
    status: STATUS_FROM_REVIEW[e.review_status],
    issues: [],
    source: 'manual',
    createdBy: 'motorista',
  }
  if (base.status === 'pendente') base.issues = expenseIssues(base, categories.find((c) => c.id === categoryId))
  return base
}

export function mapCategory(c: CategoryDTO): ExpenseCategory {
  // Grupo do fechamento, permissão do motorista e exigência de descrição não existem no contrato.
  return { id: c.id, name: c.name, group: 'outros', driverCanUse: true, needsDescription: false }
}

export function mapDocument(d: DocumentDTO): DocumentFile {
  return {
    id: d.id,
    kind: d.media_type === 'application/pdf' ? 'nota_servico' : 'recibo',
    fileName: d.filename,
    uploadedAt: d.created_at.slice(0, 16),
    vehicleId: '',
    synthetic: { issuer: d.filename, date: d.created_at.slice(0, 16), lines: [{ label: 'Tipo', value: d.media_type }], total: '—' },
  }
}

/** Converte a proposta de extração (payload livre) nos campos que o formulário entende. */
export function mapExtraction(p: PendingDTO): ExtractedField[] {
  const out: ExtractedField[] = []
  const pl = p.payload ?? {}
  // O contrato não informa confiança por campo: tudo é tratado como "a conferir".
  if (typeof pl.station === 'string') out.push({ key: 'station', label: 'Posto', value: pl.station, confidence: 'baixa' })
  if (pl.liters != null) out.push({ key: 'liters', label: 'Litros', value: formatDecimal(Number(pl.liters), 1), confidence: 'baixa' })
  if (typeof pl.amount_cents === 'number') {
    const key = p.target === 'expenses' ? 'value' : 'total'
    out.push({ key, label: key === 'value' ? 'Valor' : 'Valor total', value: formatDecimal(fromCents(pl.amount_cents), 2), confidence: 'baixa' })
  }
  if (typeof pl.occurred_on === 'string') out.push({ key: 'date', label: 'Data', value: pl.occurred_on, confidence: 'baixa' })
  if (typeof pl.description === 'string') out.push({ key: 'description', label: 'Descrição', value: pl.description, confidence: 'baixa' })
  return out
}

/* ---------- Cliente ---------- */

export interface HttpClient {
  request<T>(path: string, init?: RequestInit): Promise<T>
  listAll<T>(path: string, params?: Record<string, string | undefined>): Promise<T[]>
}

export function createHttpClient(baseUrl: string, getToken?: () => string | null): HttpClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
    const token = getToken?.()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    let res: Response
    try {
      res = await fetch(`${baseUrl}${path}`, { ...init, headers })
    } catch {
      throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.')
    }
    if (!res.ok) throw await errorFrom(res)
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  }
  async function listAll<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T[]> {
    const items: T[] = []
    for (let offset = 0; ; offset += PAGE) {
      const q = new URLSearchParams({ offset: String(offset), limit: String(PAGE) })
      for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
      const page = await request<Page<T>>(`${path}?${q}`)
      items.push(...page.items)
      if (items.length >= page.total || page.items.length < PAGE) return items
    }
  }
  return { request, listAll }
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) })
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) })

/* ---------- Autenticação ---------- */

export async function apiLogin(client: HttpClient, input: { companySlug: string; email: string; password: string }) {
  return client.request<{ access_token: string; token_type: 'bearer'; expires_in: number }>(
    `${API}/auth/login`,
    post({ company_slug: input.companySlug, email: input.email, password: input.password }),
  )
}

export async function apiMe(client: HttpClient) {
  const profile = await client.request<ProfileDTO>(`${API}/auth/me`)
  // O perfil não traz motorista/veículo: o vínculo é DriverRead.user_id → vehicle_id.
  let driver: DriverDTO | undefined
  if (profile.role === 'driver') {
    const drivers = await client.listAll<DriverDTO>(`${API}/drivers`)
    driver = drivers.find((d) => d.user_id === profile.id)
  }
  return { profile, driver }
}

/* ---------- Repositório ---------- */

export function createHttpRepository(baseUrl: string, getToken?: () => string | null): FleetRepository {
  const client = createHttpClient(baseUrl, getToken)
  const { request, listAll } = client

  const filterParams = (f: EntryFilter = {}) => ({ vehicle_id: f.vehicleId, month: f.month })
  const byDriver = <T extends { driverId?: string }>(items: T[], f: EntryFilter = {}) =>
    f.driverId ? items.filter((i) => i.driverId === f.driverId) : items

  async function categories() {
    return (await listAll<CategoryDTO>(`${API}/categories`)).map(mapCategory)
  }

  async function freightOf(tripId: string) {
    try {
      return await request<FreightDTO>(`${API}/trips/${tripId}/freight`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return undefined
      throw e
    }
  }

  async function trips(f: EntryFilter = {}) {
    const list = (await listAll<TripDTO>(`${API}/trips`, filterParams(f))).filter((t) => t.status !== 'cancelled')
    // O contrato não embute o frete na viagem: uma chamada por viagem (ver api-needs.md).
    const freights = await Promise.all(list.map((t) => freightOf(t.id)))
    return byDriver(
      list.map((t, i) => mapTrip(t, freights[i])),
      f,
    )
  }

  async function getTrip(id: string) {
    const [t, fr] = await Promise.all([request<TripDTO>(`${API}/trips/${id}`), freightOf(id)])
    return mapTrip(t, fr)
  }

  async function fuel(f: EntryFilter = {}) {
    return byDriver((await listAll<FuelingDTO>(`${API}/fuelings`, filterParams(f))).map(mapFuel), f)
  }

  async function expenses(f: EntryFilter = {}) {
    const cats = await categories()
    return byDriver((await listAll<ExpenseDTO>(`${API}/expenses`, filterParams(f))).map((e) => mapExpense(e, cats)), f)
  }

  /** Descobre se o id é abastecimento ou despesa (não há recurso genérico de lançamento). */
  async function kindOf(id: string): Promise<'fuelings' | 'expenses'> {
    try {
      await request(`${API}/fuelings/${id}`)
      return 'fuelings'
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return 'expenses'
      throw e
    }
  }

  async function readEntry(kind: 'fuelings' | 'expenses', id: string): Promise<Entry> {
    if (kind === 'fuelings') return mapFuel(await request<FuelingDTO>(`${API}/fuelings/${id}`))
    return mapExpense(await request<ExpenseDTO>(`${API}/expenses/${id}`), await categories())
  }

  function requireDriver(driverId: string | undefined): string {
    if (!driverId) throw new ApiError(422, 'Este veículo não tem motorista vinculado. Vincule um motorista antes de lançar.')
    return driverId
  }

  return {
    kind: 'api',

    async listVehicles() {
      const [vs, ds] = await Promise.all([listAll<VehicleDTO>(`${API}/vehicles`), listAll<DriverDTO>(`${API}/drivers`)])
      return vs.map((v) => mapVehicle(v, ds))
    },
    async listDrivers() {
      return (await listAll<DriverDTO>(`${API}/drivers`)).map(mapDriver)
    },

    listTrips: trips,

    async startTrip(input) {
      const t = await request<TripDTO>(
        `${API}/trips`,
        post({
          vehicle_id: input.vehicleId,
          driver_id: input.driverId,
          occurred_on: input.startDate,
          origin: input.origin,
          destination: input.destination,
          start_odometer_km: input.startKm,
          status: 'in_progress',
        }),
      )
      return mapTrip(t)
    },

    async updateTripKm() {
      throw new ApiError(501, 'A API ainda não registra o km parcial da viagem. Informe o km ao encerrar.', 'not_supported')
    },

    async finishTrip(tripId, endKm) {
      await request(`${API}/trips/${tripId}`, patch({ end_odometer_km: endKm, status: 'completed' }))
      return getTrip(tripId)
    },

    async createTrip(input) {
      const t = await request<TripDTO>(
        `${API}/trips`,
        post({
          vehicle_id: input.vehicleId,
          driver_id: input.driverId,
          occurred_on: input.startDate,
          origin: input.origin,
          destination: input.destination,
          start_odometer_km: input.startKm,
          end_odometer_km: input.endKm,
          status: input.endKm != null ? 'completed' : 'in_progress',
          contractor: input.freight?.client,
          commodity: input.freight?.cargo,
        }),
      )
      if (input.freight) await request(`${API}/trips/${t.id}/freight`, put({ gross_cents: toCents(input.freight.value), currency: 'BRL', deductions: [] }))
      return getTrip(t.id)
    },

    async setFreight(tripId, freight: Freight) {
      await request(`${API}/trips/${tripId}`, patch({ contractor: freight.client, commodity: freight.cargo }))
      await request(`${API}/trips/${tripId}/freight`, put({ gross_cents: toCents(freight.value), currency: 'BRL', deductions: [] }))
      return getTrip(tripId)
    },

    listFuel: fuel,

    async createFuel(input: FuelInput, opts): Promise<CreateResult<FuelEntry>> {
      // O contrato não detecta duplicidade em lançamentos manuais: checagem no cliente.
      const sameMonth = await fuel({ vehicleId: input.vehicleId, month: input.date.slice(0, 7) })
      const matches = findDuplicates({ kind: 'abastecimento', vehicleId: input.vehicleId, date: input.date, value: input.total }, sameMonth)
      if (matches.length && !opts.allowDuplicate) return { status: 'possible_duplicate', matches }
      const created = await request<FuelingDTO>(
        `${API}/fuelings`,
        post({
          vehicle_id: input.vehicleId,
          driver_id: requireDriver(input.driverId),
          trip_id: input.tripId,
          document_id: input.documentId,
          occurred_on: dateOnly(input.date),
          liters: input.liters,
          amount_cents: toCents(input.total),
          station: input.station,
          odometer_km: input.odometerKm,
          currency: 'BRL',
        }),
      )
      const entry = mapFuel(created)
      if (input.hadUncertainFields) entry.issues = fuelIssues({ ...entry, hadUncertainFields: true }, {})
      if (matches.length) entry.issues.unshift(duplicateIssue(matches[0], true))
      return { status: 'created', entry }
    },

    listExpenses: expenses,

    async createExpense(input: ExpenseInput, opts): Promise<CreateResult<ExpenseEntry>> {
      const cats = await categories()
      const sameMonth = await expenses({ vehicleId: input.vehicleId, month: input.date.slice(0, 7) })
      const matches = findDuplicates(
        { kind: 'despesa', vehicleId: input.vehicleId, date: input.date, value: input.value, categoryId: input.categoryId },
        sameMonth,
      )
      if (matches.length && !opts.allowDuplicate) return { status: 'possible_duplicate', matches }
      const category = cats.find((c) => c.id === input.categoryId)
      const created = await request<ExpenseDTO>(
        `${API}/expenses`,
        post({
          vehicle_id: input.vehicleId,
          driver_id: requireDriver(input.driverId),
          trip_id: input.tripId,
          category_id: category ? input.categoryId : undefined,
          document_id: input.documentId,
          occurred_on: dateOnly(input.date),
          // `description` é obrigatória no contrato.
          description: input.description?.trim() || category?.name || 'Despesa',
          amount_cents: toCents(input.value),
          currency: 'BRL',
          kind: 'operating',
        }),
      )
      const entry = mapExpense(created, cats)
      if (matches.length) entry.issues.unshift(duplicateIssue(matches[0], true))
      return { status: 'created', entry }
    },

    listCategories: categories,

    async createCategory(input) {
      return mapCategory(await request<CategoryDTO>(`${API}/categories`, post({ name: input.name })))
    },

    async updateEntry(id, p) {
      const kind = await kindOf(id)
      const body =
        kind === 'fuelings'
          ? {
              liters: p.liters,
              amount_cents: p.total != null ? toCents(p.total) : undefined,
              odometer_km: p.odometerKm,
              station: p.station,
              document_id: p.documentId,
            }
          : {
              amount_cents: p.value != null ? toCents(p.value) : undefined,
              description: p.description,
              category_id: p.categoryId,
              document_id: p.documentId,
            }
      await request(`${API}/${kind}/${id}`, patch(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))))
      return readEntry(kind, id)
    },

    async deleteEntry(id) {
      await request(`${API}/${await kindOf(id)}/${id}`, { method: 'DELETE' })
    },

    async listReviewQueue() {
      const [f, e] = await Promise.all([
        listAll<FuelingDTO>(`${API}/fuelings`, { review_status: 'pending' }),
        listAll<ExpenseDTO>(`${API}/expenses`, { review_status: 'pending' }),
      ])
      const cats = await categories()
      return [...f.map(mapFuel), ...e.map((x) => mapExpense(x, cats))].sort((a, b) => b.date.localeCompare(a.date))
    },

    async review(id, decision: ReviewDecision) {
      const kind = await kindOf(id)
      if (decision.action === 'excluir') {
        await request(`${API}/${kind}/${id}`, { method: 'DELETE' })
        return null
      }
      if (decision.patch) {
        const p = decision.patch
        const body =
          kind === 'fuelings'
            ? { liters: p.liters, amount_cents: p.total != null ? toCents(p.total) : undefined, odometer_km: p.odometerKm, station: p.station }
            : { amount_cents: p.value != null ? toCents(p.value) : undefined, description: p.description, category_id: p.categoryId }
        await request(`${API}/${kind}/${id}`, patch(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))))
      }
      // "Devolver" vira `rejected`; o contrato não guarda o motivo (ver api-needs.md).
      await request(`${API}/${kind}/${id}/review`, post({ review_status: decision.action === 'aprovar' ? 'approved' : 'rejected' }))
      const entry = await readEntry(kind, id)
      if (decision.action === 'devolver') entry.returnReason = decision.reason
      return entry
    },

    async listDocuments() {
      return (await listAll<DocumentDTO>(`${API}/documents`)).map(mapDocument)
    },

    async uploadDocument(input: UploadDocumentInput) {
      if (!input.file) throw new ApiError(422, 'Escolha o arquivo do comprovante.')
      const form = new FormData()
      form.append('file', input.file)
      const doc = mapDocument(await request<DocumentDTO>(`${API}/documents`, { method: 'POST', body: form }))
      doc.kind = input.kind
      doc.vehicleId = input.vehicleId
      if (input.useSample) {
        // Leitura real: proposta de extração para o usuário conferir (sem confiança por campo no contrato).
        const pending = await request<PendingDTO>(
          `${API}/documents/${doc.id}/extract`,
          post({ mode: 'ocr', target: input.kind === 'cupom_combustivel' ? 'fuelings' : 'expenses' }),
        )
        doc.extraction = { simulated: false, fields: mapExtraction(pending) }
      }
      return doc
    },

    async getReportData(): Promise<ReportData> {
      // /analytics/dashboard é só da frota inteira e sem linhas por categoria;
      // os relatórios por veículo são montados a partir das listas (ver api-needs.md).
      const [t, f, cats] = await Promise.all([trips(), fuel(), categories()])
      const e = (await listAll<ExpenseDTO>(`${API}/expenses`)).map((x) => mapExpense(x, cats))
      return { trips: t, fuel: f, expenses: e, categories: cats }
    },
  }
}
