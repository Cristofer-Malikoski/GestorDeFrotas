/** Utilitários de data em horário local, trabalhando com strings ISO para evitar problemas de fuso. */
const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function toISODateTime(d: Date) {
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function todayISO() {
  return toISODate(new Date())
}
export function nowISO() {
  return toISODateTime(new Date())
}
export function currentMonth() {
  return todayISO().slice(0, 7)
}
export function monthOf(iso: string) {
  return iso.slice(0, 7)
}
export function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
/** Lista dos últimos `n` meses terminando em `end` (inclusive), do mais antigo ao mais recente. */
export function lastMonths(end: string, n: number) {
  return Array.from({ length: n }, (_, i) => addMonths(end, i - (n - 1)))
}
export function daysInMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
export function addDays(isoDate: string, delta: number) {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + delta))
}
