import type {
  CategoryGroup,
  CostLine,
  ExpenseCategory,
  ExpenseEntry,
  FuelEntry,
  MonthSummary,
  Trip,
} from './types'
import { countsInTotals } from './rules'

export interface ReportData {
  trips: Trip[]
  fuel: FuelEntry[]
  expenses: ExpenseEntry[]
  categories: ExpenseCategory[]
}

export const GROUP_LABEL: Record<CategoryGroup | 'combustivel', string> = {
  combustivel: 'Combustível',
  viagem: 'Custos de viagem',
  manutencao: 'Manutenção e pneus',
  fixo: 'Custos fixos',
  pessoal: 'Pessoal',
  impostos: 'Impostos e taxas',
  outros: 'Outros',
}

export const GROUP_ORDER: (CategoryGroup | 'combustivel')[] = [
  'combustivel',
  'viagem',
  'manutencao',
  'pessoal',
  'fixo',
  'impostos',
  'outros',
]

const inScope = (vehicleId: string | undefined) => (x: { vehicleId: string }) =>
  !vehicleId || x.vehicleId === vehicleId

/** Mês em que a receita do frete é reconhecida: conclusão da viagem (ou início, se em andamento). */
export const tripRevenueMonth = (t: Trip) => (t.endDate ?? t.startDate).slice(0, 7)
export const tripKm = (t: Trip) => Math.max(0, (t.endKm ?? t.lastKm ?? t.startKm) - t.startKm)

export function summarizeMonth(data: ReportData, month: string, vehicleId?: string): MonthSummary {
  const scope = inScope(vehicleId)
  const trips = data.trips.filter(scope)
  const revenue = trips
    .filter((t) => t.freight && tripRevenueMonth(t) === month)
    .reduce((s, t) => s + (t.freight?.value ?? 0), 0)
  const monthTrips = trips.filter((t) => t.startDate.slice(0, 7) === month)
  const km = monthTrips.reduce((s, t) => s + tripKm(t), 0)

  const fuel = data.fuel.filter((f) => scope(f) && f.date.slice(0, 7) === month)
  const expenses = data.expenses.filter((e) => scope(e) && e.date.slice(0, 7) === month)
  const fuelCounted = fuel.filter(countsInTotals)
  const expCounted = expenses.filter(countsInTotals)

  const fuelCost = fuelCounted.reduce((s, f) => s + f.total, 0)
  const liters = fuelCounted.filter((f) => f.fuelType !== 'arla32').reduce((s, f) => s + f.liters, 0)

  const byCategory = new Map<string, number>()
  for (const e of expCounted) byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.value)

  const costLines: CostLine[] = [
    { key: 'combustivel', label: 'Combustível', group: 'combustivel', value: fuelCost },
  ]
  for (const cat of data.categories) {
    const value = byCategory.get(cat.id)
    if (value) costLines.push({ key: cat.id, label: cat.name, group: cat.group, value })
  }
  const otherCosts = expCounted.reduce((s, e) => s + e.value, 0)
  const totalCosts = fuelCost + otherCosts
  const pendingCount = [...fuel, ...expenses].filter((e) => e.status === 'pendente').length

  return {
    month,
    revenue,
    fuelCost,
    otherCosts,
    totalCosts,
    result: revenue - totalCosts,
    km,
    liters,
    kmPerLiter: liters > 0 && km > 0 ? km / liters : null,
    costPerKm: km > 0 ? totalCosts / km : null,
    trips: monthTrips.length,
    pendingCount,
    costLines,
  }
}

export function summarizeMonths(data: ReportData, months: string[], vehicleId?: string) {
  return months.map((m) => summarizeMonth(data, m, vehicleId))
}

export function groupCostLines(lines: CostLine[]) {
  const groups = new Map<CostLine['group'], { group: CostLine['group']; label: string; total: number; lines: CostLine[] }>()
  for (const line of lines) {
    const g = groups.get(line.group) ?? { group: line.group, label: GROUP_LABEL[line.group], total: 0, lines: [] }
    g.total += line.value
    g.lines.push(line)
    groups.set(line.group, g)
  }
  return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => groups.get(g)!)
}

export function totals(summaries: MonthSummary[]) {
  const revenue = summaries.reduce((s, m) => s + m.revenue, 0)
  const totalCosts = summaries.reduce((s, m) => s + m.totalCosts, 0)
  const fuelCost = summaries.reduce((s, m) => s + m.fuelCost, 0)
  const km = summaries.reduce((s, m) => s + m.km, 0)
  const liters = summaries.reduce((s, m) => s + m.liters, 0)
  return {
    revenue,
    totalCosts,
    fuelCost,
    result: revenue - totalCosts,
    km,
    liters,
    kmPerLiter: liters > 0 ? km / liters : null,
    costPerKm: km > 0 ? totalCosts / km : null,
  }
}

/** Gera CSV (separador ";" e vírgula decimal, compatível com Excel/LibreOffice em pt-BR). */
export function toCSV(rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    if (v == null) return ''
    if (typeof v === 'number') return v.toFixed(2).replace('.', ',')
    const s = String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n')
}
