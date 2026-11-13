import type {
  CreateOptions,
  CreateResult,
  DocumentFile,
  DocumentKind,
  Driver,
  Entry,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseInput,
  Freight,
  FuelEntry,
  FuelInput,
  ReviewDecision,
  StartTripInput,
  Trip,
  Vehicle,
} from '@/domain/types'
import type { ReportData } from '@/domain/reports'

export interface EntryFilter {
  vehicleId?: string
  driverId?: string
  /** yyyy-mm */
  month?: string
}

export interface UploadDocumentInput {
  kind: DocumentKind
  vehicleId: string
  fileName: string
  /** Na demonstração usamos um comprovante de exemplo em vez de ler o arquivo. */
  useSample: boolean
}

/**
 * Porta de acesso a dados da interface.
 * Componentes dependem somente desta interface; a implementação é escolhida
 * por configuração (VITE_DATA_SOURCE = "mock" | "api").
 */
export interface FleetRepository {
  readonly kind: 'mock' | 'api'

  listVehicles(): Promise<Vehicle[]>
  listDrivers(): Promise<Driver[]>

  listTrips(filter?: EntryFilter): Promise<Trip[]>
  startTrip(input: StartTripInput): Promise<Trip>
  updateTripKm(tripId: string, km: number): Promise<Trip>
  finishTrip(tripId: string, endKm: number, endDate: string): Promise<Trip>
  createTrip(input: StartTripInput & { endKm?: number; endDate?: string; freight?: Freight }): Promise<Trip>
  setFreight(tripId: string, freight: Freight): Promise<Trip>

  listFuel(filter?: EntryFilter): Promise<FuelEntry[]>
  createFuel(input: FuelInput, options: CreateOptions): Promise<CreateResult<FuelEntry>>

  listExpenses(filter?: EntryFilter): Promise<ExpenseEntry[]>
  createExpense(input: ExpenseInput, options: CreateOptions): Promise<CreateResult<ExpenseEntry>>

  listCategories(): Promise<ExpenseCategory[]>
  createCategory(input: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory>

  /** Correção de lançamento pelo motorista (reenvio de devolvido) ou pelo gestor. */
  updateEntry(id: string, patch: Partial<FuelInput & ExpenseInput>): Promise<Entry>
  /** Desfazer imediatamente após criar. */
  deleteEntry(id: string): Promise<void>

  listReviewQueue(): Promise<Entry[]>
  review(id: string, decision: ReviewDecision): Promise<Entry | null>

  listDocuments(): Promise<DocumentFile[]>
  uploadDocument(input: UploadDocumentInput): Promise<DocumentFile>

  /** Dados agregáveis para painel e relatórios. */
  getReportData(): Promise<ReportData>

  /** Restaura o estado inicial (apenas mock). */
  reset?(): Promise<void>
}
