import { useMemo } from 'react'
import { useReportData } from '@/data/queries'
import { summarizeMonth, summarizeMonths } from '@/domain/reports'
import { addMonths, currentMonth, lastMonths } from '@/lib/dates'

/** Resumos mensais calculados a partir dos lançamentos (no mock; com API, idealmente no backend). */
export function useMonthReport(month: string, vehicleId?: string) {
  const q = useReportData()
  const value = useMemo(() => {
    if (!q.data) return null
    const end = month > currentMonth() ? currentMonth() : month
    const months = lastMonths(end, 12)
    return {
      data: q.data,
      current: summarizeMonth(q.data, month, vehicleId),
      previous: summarizeMonth(q.data, addMonths(month, -1), vehicleId),
      series: summarizeMonths(q.data, months, vehicleId),
    }
  }, [q.data, month, vehicleId])
  return { ...q, report: value }
}

/** Variação percentual com texto legível. */
export function delta(current: number, previous: number) {
  if (!previous) return null
  return (current - previous) / Math.abs(previous)
}
