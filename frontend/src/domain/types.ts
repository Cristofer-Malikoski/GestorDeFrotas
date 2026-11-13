/**
 * Modelo de domínio consumido pela interface.
 *
 * IMPORTANTE: enquanto contracts/openapi.yaml não existir, estes tipos são a
 * expectativa do front-end, não o contrato oficial. Divergências devem ser
 * resolvidas a favor do contrato publicado pelo backend (ver docs/product/api-needs.md).
 */

export type Role = 'motorista' | 'gestor'

export type FuelType = 'diesel_s10' | 'diesel_s500' | 'arla32'

export interface Driver {
  id: string
  name: string
  vehicleId: string
}

export interface Vehicle {
  id: string
  plate: string
  model: string
  year: number
  description: string
  fuelType: FuelType
  odometerKm: number
  driverId?: string
  active: boolean
}

export type TripStatus = 'em_andamento' | 'concluida'

export interface Freight {
  client: string
  value: number
  cargo: string
}

export interface Trip {
  id: string
  vehicleId: string
  driverId: string
  origin: string
  destination: string
  startDate: string
  endDate?: string
  startKm: number
  /** km mais recente informado durante a viagem */
  lastKm?: number
  endKm?: number
  status: TripStatus
  freight?: Freight
}

export type EntryStatus = 'registrado' | 'pendente' | 'aprovado' | 'devolvido'

export type IssueCode =
  | 'sem_comprovante'
  | 'km_ausente'
  | 'km_inconsistente'
  | 'possivel_duplicado'
  | 'leitura_incerta'
  | 'preco_atipico'

export interface Issue {
  code: IssueCode
  message: string
  relatedEntryId?: string
}

export type EntrySource = 'manual' | 'comprovante'

interface BaseEntry {
  id: string
  vehicleId: string
  driverId?: string
  tripId?: string
  /** data e hora local, ISO yyyy-mm-ddThh:mm */
  date: string
  status: EntryStatus
  issues: Issue[]
  documentId?: string
  source: EntrySource
  createdBy: Role
  returnReason?: string
  reviewedAt?: string
  /** Motorista corrigiu um lançamento devolvido; volta para conferência. */
  resubmittedAt?: string
}

export interface FuelEntry extends BaseEntry {
  kind: 'abastecimento'
  station: string
  liters: number
  total: number
  odometerKm?: number
  fuelType: FuelType
}

export interface ExpenseEntry extends BaseEntry {
  kind: 'despesa'
  categoryId: string
  description?: string
  value: number
}

export type Entry = FuelEntry | ExpenseEntry

export type CategoryGroup = 'viagem' | 'manutencao' | 'fixo' | 'pessoal' | 'impostos' | 'outros'

export interface ExpenseCategory {
  id: string
  name: string
  group: CategoryGroup
  /** Categorias que o motorista pode lançar. As demais são exclusivas do gestor. */
  driverCanUse: boolean
  /** Exige descrição ao lançar (ex.: oficina) */
  needsDescription: boolean
}

export type DocumentKind = 'cupom_combustivel' | 'recibo' | 'nota_servico'

export type Confidence = 'alta' | 'baixa'

export interface ExtractedField {
  key: 'station' | 'liters' | 'total' | 'date' | 'value' | 'description'
  label: string
  value: string
  confidence: Confidence
}

export interface Extraction {
  /** Sempre true na demonstração: nenhum documento é lido de verdade. */
  simulated: boolean
  fields: ExtractedField[]
}

export interface DocumentFile {
  id: string
  kind: DocumentKind
  fileName: string
  uploadedAt: string
  entryId?: string
  vehicleId: string
  /** Pré-visualização: em mock, um cupom sintético renderizado; em API, URL do arquivo */
  previewUrl?: string
  synthetic?: { issuer: string; lines: { label: string; value: string }[]; total: string; date: string }
  extraction?: Extraction
}

/* ---------- Entradas de formulário ---------- */

export interface FuelInput {
  vehicleId: string
  driverId?: string
  tripId?: string
  date: string
  station: string
  liters: number
  total: number
  odometerKm?: number
  fuelType: FuelType
  documentId?: string
  source: EntrySource
  /** campos de baixa confiança que o usuário confirmou explicitamente */
  confirmedUncertain?: boolean
  hadUncertainFields?: boolean
}

export interface ExpenseInput {
  vehicleId: string
  driverId?: string
  tripId?: string
  date: string
  categoryId: string
  description?: string
  value: number
  documentId?: string
  source: EntrySource
}

export interface CreateOptions {
  /** usuário confirmou que não é duplicidade */
  allowDuplicate?: boolean
  actor: Role
}

export type CreateResult<T extends Entry> =
  | { status: 'created'; entry: T }
  | { status: 'possible_duplicate'; matches: Entry[] }

export interface StartTripInput {
  vehicleId: string
  driverId: string
  origin: string
  destination: string
  startKm: number
  startDate: string
}

export interface ReviewDecision {
  action: 'aprovar' | 'devolver' | 'excluir'
  reason?: string
  /** correções aplicadas pelo gestor antes de aprovar */
  patch?: Partial<Pick<FuelEntry, 'liters' | 'total' | 'odometerKm' | 'station'>> &
    Partial<Pick<ExpenseEntry, 'value' | 'description' | 'categoryId'>>
}

/* ---------- Relatórios ---------- */

export interface CostLine {
  key: string
  label: string
  group: CategoryGroup | 'combustivel'
  value: number
}

export interface MonthSummary {
  month: string
  revenue: number
  fuelCost: number
  otherCosts: number
  totalCosts: number
  result: number
  km: number
  liters: number
  kmPerLiter: number | null
  costPerKm: number | null
  trips: number
  pendingCount: number
  costLines: CostLine[]
}

export interface Scope {
  /** undefined = todos os veículos */
  vehicleId?: string
  month: string
}
