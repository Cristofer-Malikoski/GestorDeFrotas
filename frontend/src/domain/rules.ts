import type {
  Entry,
  EntryStatus,
  ExpenseCategory,
  ExpenseInput,
  FuelEntry,
  FuelInput,
  Issue,
  Trip,
  Vehicle,
} from './types'
import { formatKm, formatPricePerLiter } from '@/lib/format'

/** Tolerância de valor para considerar duplicidade (1%). */
export const DUPLICATE_TOLERANCE = 0.01
/** Variação de preço por litro que dispara alerta (15%). */
export const PRICE_DEVIATION = 0.15
/** Despesas acima deste valor sem comprovante vão para conferência. */
export const RECEIPT_REQUIRED_ABOVE = 100
/** Categorias normalmente pagas por tag/cartão, sem comprovante em papel. */
const RECEIPT_EXEMPT = new Set(['pedagio', 'estacionamento'])

const valueOf = (e: Entry) => (e.kind === 'abastecimento' ? e.total : e.value)

interface DuplicateCandidate {
  kind: Entry['kind']
  vehicleId: string
  date: string
  value: number
  categoryId?: string
}

export function findDuplicates(candidate: DuplicateCandidate, entries: Entry[]): Entry[] {
  const day = candidate.date.slice(0, 10)
  return entries.filter((e) => {
    if (e.kind !== candidate.kind || e.vehicleId !== candidate.vehicleId) return false
    if (e.status === 'devolvido') return false
    if (e.date.slice(0, 10) !== day) return false
    if (e.kind === 'despesa' && candidate.categoryId && e.categoryId !== candidate.categoryId) return false
    const v = valueOf(e)
    return Math.abs(v - candidate.value) <= Math.max(v, candidate.value) * DUPLICATE_TOLERANCE
  })
}

/** Último km conhecido do veículo antes de uma data (abastecimentos e viagens). */
export function lastKnownKm(
  vehicle: Vehicle | undefined,
  fuel: FuelEntry[],
  trips: Trip[],
  beforeDate?: string,
): number | undefined {
  const values: number[] = []
  for (const f of fuel) {
    if (f.vehicleId !== vehicle?.id || f.odometerKm == null || f.status === 'devolvido') continue
    if (beforeDate && f.date >= beforeDate) continue
    values.push(f.odometerKm)
  }
  for (const t of trips) {
    if (t.vehicleId !== vehicle?.id) continue
    if (beforeDate && t.startDate >= beforeDate) continue
    values.push(t.endKm ?? t.lastKm ?? t.startKm)
  }
  if (!beforeDate && vehicle) values.push(vehicle.odometerKm)
  return values.length ? Math.max(...values) : vehicle?.odometerKm
}

/** Preço médio por litro dos últimos abastecimentos do veículo. */
export function recentPricePerLiter(vehicleId: string, fuel: FuelEntry[], take = 5): number | undefined {
  const recent = fuel
    .filter((f) => f.vehicleId === vehicleId && f.status !== 'devolvido' && f.liters > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, take)
  if (!recent.length) return undefined
  const liters = recent.reduce((s, f) => s + f.liters, 0)
  const total = recent.reduce((s, f) => s + f.total, 0)
  return total / liters
}

export interface FuelContext {
  lastKm?: number
  recentPrice?: number
}

export function fuelIssues(input: FuelInput, ctx: FuelContext): Issue[] {
  const issues: Issue[] = []
  if (input.hadUncertainFields) {
    issues.push({
      code: 'leitura_incerta',
      message: 'Comprovante com campos de leitura incerta. Conferir valores com o documento.',
    })
  }
  if (input.odometerKm == null) {
    issues.push({ code: 'km_ausente', message: 'O km do hodômetro não foi informado.' })
  } else if (ctx.lastKm != null && input.odometerKm < ctx.lastKm) {
    issues.push({
      code: 'km_inconsistente',
      message: `Km informado (${formatKm(input.odometerKm)}) é menor que o último registrado (${formatKm(ctx.lastKm)}).`,
    })
  }
  if (ctx.recentPrice && input.liters > 0) {
    const ppl = input.total / input.liters
    if (Math.abs(ppl - ctx.recentPrice) / ctx.recentPrice > PRICE_DEVIATION) {
      issues.push({
        code: 'preco_atipico',
        message: `Preço de ${formatPricePerLiter(ppl)} difere da média recente (${formatPricePerLiter(ctx.recentPrice)}).`,
      })
    }
  }
  if (!input.documentId) {
    issues.push({ code: 'sem_comprovante', message: 'Abastecimento sem comprovante anexado.' })
  }
  return issues
}

export function expenseIssues(input: ExpenseInput, category: ExpenseCategory | undefined): Issue[] {
  const issues: Issue[] = []
  const exempt = category ? RECEIPT_EXEMPT.has(category.id) : false
  if (!input.documentId && !exempt && input.value > RECEIPT_REQUIRED_ABOVE) {
    issues.push({
      code: 'sem_comprovante',
      message: `Despesa acima de R$ ${RECEIPT_REQUIRED_ABOVE} sem comprovante anexado.`,
    })
  }
  return issues
}

export function statusFromIssues(issues: Issue[]): EntryStatus {
  return issues.length ? 'pendente' : 'registrado'
}

export function entryValue(e: Entry) {
  return valueOf(e)
}

/** Lançamentos que entram nos totais (devolvidos ficam de fora até a correção). */
export function countsInTotals(e: Entry) {
  return e.status !== 'devolvido'
}
