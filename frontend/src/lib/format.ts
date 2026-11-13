const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const dec1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })

export const formatMoney = (v: number) => brl.format(v)
export const formatMoneyCompact = (v: number) => brlCompact.format(v)
export const formatKm = (v: number) => `${int.format(v)} km`
export const formatLiters = (v: number) => `${dec1.format(v)} L`
export const formatPricePerLiter = (v: number) => `${brl.format(v)}/L`
export const formatKmPerLiter = (v: number) => `${dec2.format(v)} km/L`
export const formatCostPerKm = (v: number) => `${brl.format(v)}/km`
export const formatPercent = (v: number) => pct.format(v)
export const formatInt = (v: number) => int.format(v)
/** Valor em reais sem centavos e sem símbolo, para tabelas largas (ex.: 99.550). */
export const formatWhole = (v: number) => int.format(Math.round(v))
export const formatDecimal = (v: number, digits = 2) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)

/** Datas ISO (yyyy-mm-dd ou datetime) → dd/mm/aaaa, sem deslocamento de fuso. */
export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso: string) {
  const time = iso.length > 10 ? iso.slice(11, 16) : ''
  return time ? `${formatDate(iso)} às ${time}` : formatDate(iso)
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "2026-11" → "novembro de 2026" */
export function formatMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} de ${y}`
}
/** "2026-11" → "Novembro de 2026" */
export function formatMonthTitle(month: string) {
  const s = formatMonth(month)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
/** "2026-11" → "nov/26" */
export function formatMonthShort(month: string) {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`
}

export function formatRelativeDay(iso: string, today: string) {
  const d = iso.slice(0, 10)
  if (d === today) return 'Hoje'
  const diff = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000)
  if (diff === 1) return 'Ontem'
  if (diff > 1 && diff < 7) return `Há ${diff} dias`
  return formatDate(iso)
}
