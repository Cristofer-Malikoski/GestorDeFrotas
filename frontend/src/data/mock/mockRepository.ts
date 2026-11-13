/**
 * ADAPTER MOCK — usado na demonstração (GitHub Pages) e nos testes.
 *
 * - Dados sintéticos gerados por `buildFixtures`.
 * - Alterações ficam apenas nesta aba do navegador (sessionStorage) e podem ser
 *   descartadas em "Restaurar dados de demonstração". Não há servidor.
 * - Regras de pendência/duplicidade usam o mesmo módulo de domínio da interface
 *   (`domain/rules.ts`); o backend real deve ser a fonte de verdade.
 * - Nenhum documento é lido: a "leitura" devolve um comprovante de exemplo
 *   explicitamente marcado como simulado.
 */
import type { FleetRepository, EntryFilter, UploadDocumentInput } from '../repository'
import type {
  CreateOptions,
  CreateResult,
  DocumentFile,
  Entry,
  ExpenseEntry,
  ExpenseInput,
  Freight,
  FuelEntry,
  FuelInput,
  ReviewDecision,
  StartTripInput,
  Trip,
} from '@/domain/types'
import {
  duplicateIssue,
  expenseIssues,
  findDuplicates,
  fuelIssues,
  lastKnownKm,
  recentPricePerLiter,
  statusFromIssues,
} from '@/domain/rules'
import { ISSUE_SEVERITY } from '@/domain/labels'
import { nowISO, todayISO } from '@/lib/dates'
import { buildFixtures, sampleExtraction, type FleetState } from './fixtures'

// Altere a versão quando as fixtures mudarem, para não reaproveitar estado antigo da sessão.
const STORAGE_KEY = 'fretuno-demo-state-v2'

export interface MockOptions {
  /** Latência artificial para exibir estados de carregamento (ms). */
  latency?: number
  /** Data de referência das fixtures (yyyy-mm-dd). */
  today?: string
  /** Persistir na sessionStorage (desligado nos testes). */
  persist?: boolean
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} não encontrado(a).`)
  }
}

export function createMockRepository(options: MockOptions = {}): FleetRepository {
  const latency = options.latency ?? 250
  const persist = options.persist ?? true
  const today = options.today ?? todayISO()

  let state: FleetState = load() ?? buildFixtures(today)

  function load(): FleetState | null {
    if (!persist) return null
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as FleetState & { today?: string }
      return parsed.today === today ? parsed : null
    } catch {
      return null
    }
  }
  function save() {
    if (!persist) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, today }))
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  }

  const delay = <T,>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latency))
  const fail = (err: Error): Promise<never> =>
    new Promise((_, reject) => setTimeout(() => reject(err), latency))

  const nextId = (prefix: string) => `${prefix}-${String(++state.seq).padStart(4, '0')}`

  const byFilter =
    (f: EntryFilter = {}) =>
    (e: { vehicleId: string; driverId?: string; date: string }) =>
      (!f.vehicleId || e.vehicleId === f.vehicleId) &&
      (!f.driverId || e.driverId === f.driverId) &&
      (!f.month || e.date.startsWith(f.month))

  const allEntries = (): Entry[] => [...state.fuel, ...state.expenses]
  const findEntry = (id: string) => allEntries().find((e) => e.id === id)

  function touchOdometer(vehicleId: string, km?: number) {
    const v = state.vehicles.find((x) => x.id === vehicleId)
    if (v && km != null && km > v.odometerKm) v.odometerKm = km
  }

  function linkDocument(documentId: string | undefined, entryId: string) {
    if (!documentId) return
    const doc = state.documents.find((d) => d.id === documentId)
    if (doc) doc.entryId = entryId
  }

  const repo: FleetRepository = {
    kind: 'mock',

    listVehicles: () => delay(state.vehicles),
    listDrivers: () => delay(state.drivers),

    listTrips: (filter = {}) =>
      delay(
        state.trips.filter(
          (t) =>
            (!filter.vehicleId || t.vehicleId === filter.vehicleId) &&
            (!filter.driverId || t.driverId === filter.driverId) &&
            (!filter.month || t.startDate.startsWith(filter.month) || (t.endDate ?? '').startsWith(filter.month)),
        ),
      ),

    startTrip(input: StartTripInput) {
      const active = state.trips.find((t) => t.vehicleId === input.vehicleId && t.status === 'em_andamento')
      if (active) return fail(new Error('Já existe uma viagem em andamento para este veículo. Encerre-a antes de iniciar outra.'))
      const trip: Trip = { id: nextId('via'), ...input, status: 'em_andamento' }
      state.trips.unshift(trip)
      touchOdometer(input.vehicleId, input.startKm)
      save()
      return delay(trip)
    },

    updateTripKm(tripId, km) {
      const trip = state.trips.find((t) => t.id === tripId)
      if (!trip) return fail(new NotFoundError('Viagem'))
      if (km < trip.startKm) return fail(new Error('O km não pode ser menor que o km de saída.'))
      trip.lastKm = km
      touchOdometer(trip.vehicleId, km)
      save()
      return delay(trip)
    },

    finishTrip(tripId, endKm, endDate) {
      const trip = state.trips.find((t) => t.id === tripId)
      if (!trip) return fail(new NotFoundError('Viagem'))
      if (endKm < trip.startKm) return fail(new Error('O km final não pode ser menor que o km de saída.'))
      Object.assign(trip, { endKm, endDate, status: 'concluida' as const })
      touchOdometer(trip.vehicleId, endKm)
      save()
      return delay(trip)
    },

    createTrip(input) {
      const trip: Trip = {
        id: nextId('via'),
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        origin: input.origin,
        destination: input.destination,
        startDate: input.startDate,
        startKm: input.startKm,
        endKm: input.endKm,
        endDate: input.endDate,
        freight: input.freight,
        status: input.endKm != null ? 'concluida' : 'em_andamento',
      }
      state.trips.unshift(trip)
      touchOdometer(trip.vehicleId, trip.endKm ?? trip.startKm)
      save()
      return delay(trip)
    },

    setFreight(tripId: string, freight: Freight) {
      const trip = state.trips.find((t) => t.id === tripId)
      if (!trip) return fail(new NotFoundError('Viagem'))
      trip.freight = freight
      save()
      return delay(trip)
    },

    listFuel: (filter) => delay(state.fuel.filter(byFilter(filter))),

    createFuel(input: FuelInput, opts: CreateOptions): Promise<CreateResult<FuelEntry>> {
      const matches = findDuplicates(
        { kind: 'abastecimento', vehicleId: input.vehicleId, date: input.date, value: input.total },
        allEntries(),
      )
      if (matches.length && !opts.allowDuplicate) return delay({ status: 'possible_duplicate', matches })

      const vehicle = state.vehicles.find((v) => v.id === input.vehicleId)
      const issues = fuelIssues(input, {
        lastKm: lastKnownKm(vehicle, state.fuel, state.trips, input.date),
        recentPrice: recentPricePerLiter(input.vehicleId, state.fuel),
      })
      if (matches.length) {
        issues.unshift(duplicateIssue(matches[0], true))
      }
      const entry: FuelEntry = {
        id: nextId('abs'),
        kind: 'abastecimento',
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        tripId: input.tripId,
        date: input.date,
        station: input.station,
        liters: input.liters,
        total: input.total,
        odometerKm: input.odometerKm,
        fuelType: input.fuelType,
        documentId: input.documentId,
        source: input.source,
        createdBy: opts.actor,
        issues,
        status: statusFromIssues(issues),
      }
      state.fuel.unshift(entry)
      linkDocument(entry.documentId, entry.id)
      touchOdometer(entry.vehicleId, entry.odometerKm)
      save()
      return delay({ status: 'created', entry })
    },

    listExpenses: (filter) => delay(state.expenses.filter(byFilter(filter))),

    createExpense(input: ExpenseInput, opts: CreateOptions): Promise<CreateResult<ExpenseEntry>> {
      const matches = findDuplicates(
        { kind: 'despesa', vehicleId: input.vehicleId, date: input.date, value: input.value, categoryId: input.categoryId },
        allEntries(),
      )
      if (matches.length && !opts.allowDuplicate) return delay({ status: 'possible_duplicate', matches })
      const category = state.categories.find((c) => c.id === input.categoryId)
      const issues = expenseIssues(input, category)
      if (matches.length) {
        issues.unshift(duplicateIssue(matches[0], true))
      }
      const entry: ExpenseEntry = {
        id: nextId('desp'),
        kind: 'despesa',
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        tripId: input.tripId,
        date: input.date,
        categoryId: input.categoryId,
        description: input.description,
        value: input.value,
        documentId: input.documentId,
        source: input.source,
        createdBy: opts.actor,
        issues,
        status: statusFromIssues(issues),
      }
      state.expenses.unshift(entry)
      linkDocument(entry.documentId, entry.id)
      save()
      return delay({ status: 'created', entry })
    },

    listCategories: () => delay(state.categories),

    createCategory(input) {
      const name = input.name.trim()
      if (state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return fail(new Error(`Já existe a categoria "${name}".`))
      }
      const category = { ...input, name, id: nextId('cat') }
      state.categories.push(category)
      save()
      return delay(category)
    },

    updateEntry(id, patch) {
      const entry = findEntry(id)
      if (!entry) return fail(new NotFoundError('Lançamento'))
      Object.assign(entry, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)))
      // Reavalia pendências após a correção
      if (entry.kind === 'abastecimento') {
        const vehicle = state.vehicles.find((v) => v.id === entry.vehicleId)
        const others = state.fuel.filter((f) => f.id !== entry.id)
        entry.issues = fuelIssues(
          { ...entry, hadUncertainFields: entry.issues.some((i) => i.code === 'leitura_incerta') },
          {
            lastKm: lastKnownKm(vehicle, others, state.trips, entry.date),
            recentPrice: recentPricePerLiter(entry.vehicleId, others),
          },
        )
      } else {
        entry.issues = expenseIssues(entry, state.categories.find((c) => c.id === entry.categoryId))
      }
      linkDocument(entry.documentId, entry.id)
      const wasReturned = entry.status === 'devolvido'
      entry.status = wasReturned ? 'pendente' : statusFromIssues(entry.issues)
      if (wasReturned) entry.resubmittedAt = nowISO()
      entry.returnReason = undefined
      save()
      return delay(entry)
    },

    deleteEntry(id) {
      state.fuel = state.fuel.filter((e) => e.id !== id)
      state.expenses = state.expenses.filter((e) => e.id !== id)
      for (const d of state.documents) if (d.entryId === id) d.entryId = undefined
      save()
      return delay(undefined)
    },

    listReviewQueue() {
      const severity = (e: Entry) => Math.min(...e.issues.map((i) => ISSUE_SEVERITY[i.code]), 99)
      return delay(
        allEntries()
          .filter((e) => e.status === 'pendente')
          .sort((a, b) => severity(a) - severity(b) || b.date.localeCompare(a.date)),
      )
    },

    review(id, decision: ReviewDecision) {
      const entry = findEntry(id)
      if (!entry) return fail(new NotFoundError('Lançamento'))
      if (decision.action === 'excluir') {
        return repo.deleteEntry(id).then(() => null)
      }
      if (decision.action === 'devolver') {
        if (!decision.reason?.trim()) return fail(new Error('Informe o motivo da devolução.'))
        entry.status = 'devolvido'
        entry.returnReason = decision.reason.trim()
      } else {
        if (decision.patch) {
          Object.assign(entry, Object.fromEntries(Object.entries(decision.patch).filter(([, v]) => v !== undefined)))
        }
        entry.status = 'aprovado'
      }
      entry.reviewedAt = nowISO()
      save()
      return delay(entry)
    },

    listDocuments: () => delay([...state.documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))),

    uploadDocument(input: UploadDocumentInput) {
      const kind = input.kind === 'cupom_combustivel' ? 'cupom_combustivel' : 'recibo'
      const sample = sampleExtraction(kind, todayISO())
      const doc: DocumentFile = {
        id: nextId('doc'),
        kind: input.kind,
        fileName: input.fileName,
        uploadedAt: nowISO(),
        vehicleId: input.vehicleId,
        // Sem leitura: o arquivo do usuário não sai do navegador; mostramos apenas um marcador.
        synthetic: input.useSample
          ? sample.synthetic
          : { issuer: 'Arquivo anexado', date: nowISO(), lines: [{ label: 'Arquivo', value: input.fileName }], total: '—' },
        extraction: input.useSample ? { simulated: true, fields: sample.fields } : undefined,
      }
      state.documents.push(doc)
      save()
      return delay(doc)
    },

    getReportData: () =>
      delay({ trips: state.trips, fuel: state.fuel, expenses: state.expenses, categories: state.categories }),

    async reset() {
      state = buildFixtures(today)
      if (persist) {
        try {
          sessionStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignora */
        }
      }
    },
  }
  return repo
}
