import { useMemo } from 'react'
import { Download, Printer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { LoadingBlock, ErrorState } from '@/components/ui/feedback'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReportData, useVehicles } from '@/data/queries'
import { GROUP_LABEL, GROUP_ORDER, groupCostLines, summarizeMonth, summarizeMonths, toCSV, totals, tripKm, tripRevenueMonth } from '@/domain/reports'
import type { MonthSummary } from '@/domain/types'
import { currentMonth, lastMonths } from '@/lib/dates'
import {
  formatCostPerKm,
  formatDate,
  formatInt,
  formatKm,
  formatKmPerLiter,
  formatLiters,
  formatMoney,
  formatMonth,
  formatMonthShort,
  formatMonthTitle,
  formatWhole,
} from '@/lib/format'
import { cn } from '@/lib/cn'
import { ResultValue } from '@/features/shared/status'
import { MonthFilter, VehicleFilter, useManagerFilters } from './filters'

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ReportsPage() {
  const { vehicleId, month } = useManagerFilters()
  const q = useReportData()
  const vehicles = useVehicles()
  const plate = vehicleId ? (vehicles.data?.find((v) => v.id === vehicleId)?.plate ?? '') : 'Frota'

  if (q.isPending) return <LoadingBlock rows={8} />
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="O fechamento que antes era feito na planilha — calculado a partir dos lançamentos."
        filters={
          <>
            <VehicleFilter />
            <MonthFilter />
          </>
        }
      />
      <Tabs defaultValue="mensal">
        <TabsList className="no-print mb-5">
          <TabsTrigger value="mensal">Fechamento mensal</TabsTrigger>
          <TabsTrigger value="anual">Resumo de 12 meses</TabsTrigger>
        </TabsList>
        <TabsContent value="mensal">
          <MonthlyClosing data={q.data} month={month} vehicleId={vehicleId} plate={plate} />
        </TabsContent>
        <TabsContent value="anual">
          <AnnualSummary data={q.data} month={month} vehicleId={vehicleId} plate={plate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type Data = NonNullable<ReturnType<typeof useReportData>['data']>

function MonthlyClosing({ data, month, vehicleId, plate }: { data: Data; month: string; vehicleId?: string; plate: string }) {
  const s = useMemo(() => summarizeMonth(data, month, vehicleId), [data, month, vehicleId])
  const freights = data.trips
    .filter((t) => t.freight && tripRevenueMonth(t) === month && (!vehicleId || t.vehicleId === vehicleId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const groups = groupCostLines(s.costLines)

  function exportCSV() {
    const rows: (string | number | null)[][] = [
      [`Fechamento ${formatMonthTitle(month)} — ${plate}`],
      [],
      ['ENTRADAS (fretes)'],
      ['Data', 'Rota', 'Cliente', 'Km', 'Valor (R$)'],
      ...freights.map((t) => [formatDate(t.endDate ?? t.startDate), `${t.origin} → ${t.destination}`, t.freight!.client, tripKm(t), t.freight!.value]),
      ['', '', '', 'Total entradas', s.revenue],
      [],
      ['SAÍDAS'],
      ['Grupo', 'Item', '', '', 'Valor (R$)'],
      ...groups.flatMap((g) => g.lines.map((l) => [g.label, l.label, '', '', l.value])),
      ['', '', '', 'Total saídas', s.totalCosts],
      [],
      ['RESULTADO', '', '', '', s.result],
      ['Km rodados', '', '', '', s.km],
      ['Litros', '', '', '', s.liters],
      ['Custo por km (R$)', '', '', '', s.costPerKm ?? null],
      ['Lançamentos pendentes de conferência', '', '', '', String(s.pendingCount)],
    ]
    download(`fechamento-${month}-${plate.toLowerCase()}.csv`, toCSV(rows))
  }

  return (
    <div className="space-y-5">
      {s.pendingCount > 0 && (
        <Callout tone="warn" title="Fechamento pode mudar">
          {s.pendingCount} lançamento(s) deste mês ainda aguardam conferência. Eles já estão somados, marcados como pendentes.
        </Callout>
      )}
      {month === currentMonth() && <p className="text-sm text-ink-3">Mês em andamento: o fechamento mostra os valores até hoje.</p>}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-extrabold">Fechamento de {formatMonth(month)}</h2>
            <p className="text-sm text-ink-3">{plate === 'Frota' ? 'Todos os veículos' : plate}</p>
          </div>
          <div className="no-print flex gap-2">
            <Button onClick={exportCSV}>
              <Download /> Exportar para Excel (CSV)
            </Button>
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2">
          <section className="border-b border-line p-6 lg:border-r lg:border-b-0" aria-labelledby="entradas">
            <h3 id="entradas" className="flex items-baseline justify-between font-display text-lg font-bold">
              Entradas <span className="num text-go-800">{formatMoney(s.revenue)}</span>
            </h3>
            {freights.length ? (
              <ul className="mt-3 divide-y divide-line text-sm">
                {freights.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">
                        {t.origin} → {t.destination}
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        {formatDate(t.endDate ?? t.startDate)} · {t.freight!.client}
                      </span>
                    </span>
                    <span className="num shrink-0">{formatMoney(t.freight!.value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-3">Nenhum frete concluído neste mês.</p>
            )}
          </section>

          <section className="p-6" aria-labelledby="saidas">
            <h3 id="saidas" className="flex items-baseline justify-between font-display text-lg font-bold">
              Saídas <span className="num">{formatMoney(s.totalCosts)}</span>
            </h3>
            <div className="mt-3 space-y-4 text-sm">
              {groups.map((g) => (
                <div key={g.group}>
                  <p className="flex justify-between font-semibold">
                    {g.label} <span className="num">{formatMoney(g.total)}</span>
                  </p>
                  {g.lines.length > 1 || g.lines[0].label !== g.label ? (
                    <ul className="mt-1 space-y-0.5 pl-3 text-ink-2">
                      {g.lines.map((l) => (
                        <li key={l.key} className="flex justify-between">
                          {l.label} <span className="num">{formatMoney(l.value)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className={cn('flex flex-wrap items-center justify-between gap-4 border-t-2 px-6 py-5', s.result < 0 ? 'border-bad-600 bg-bad-50' : 'border-go-400 bg-go-50')}>
          <p className="font-display text-xl font-extrabold">Resultado do mês</p>
          <p className="font-kpi text-3xl font-extrabold">
            <ResultValue value={s.result} showLabel />
          </p>
        </div>
        <dl className="num grid grid-cols-2 gap-px border-t border-line bg-line text-sm sm:grid-cols-4">
          {[
            ['Km rodados', formatKm(s.km)],
            ['Litros de diesel', formatLiters(s.liters)],
            ['Consumo médio', s.kmPerLiter ? formatKmPerLiter(s.kmPerLiter) : '—'],
            ['Custo por km', s.costPerKm ? formatCostPerKm(s.costPerKm) : '—'],
          ].map(([l, v]) => (
            <div key={l} className="bg-surface px-6 py-3">
              <dt className="text-ink-3">{l}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}

function AnnualSummary({ data, month, vehicleId, plate }: { data: Data; month: string; vehicleId?: string; plate: string }) {
  const months = lastMonths(month > currentMonth() ? currentMonth() : month, 12)
  const series = useMemo(() => summarizeMonths(data, months, vehicleId), [data, months, vehicleId])
  const t = totals(series)
  const groupValue = (m: MonthSummary, g: string) => m.costLines.filter((l) => l.group === g).reduce((s, l) => s + l.value, 0)
  const groupsPresent = GROUP_ORDER.filter((g) => series.some((m) => groupValue(m, g) > 0))

  const empty = (m: MonthSummary) => m.revenue === 0 && m.totalCosts === 0 && m.km === 0
  const rows: { label: string; get: (m: MonthSummary) => number; total: number; strong?: boolean; result?: boolean; fmt?: (n: number) => string }[] = [
    { label: 'Faturamento', get: (m) => m.revenue, total: t.revenue, strong: true },
    ...groupsPresent.map((g) => ({ label: GROUP_LABEL[g], get: (m: MonthSummary) => groupValue(m, g), total: series.reduce((s, m) => s + groupValue(m, g), 0) })),
    { label: 'Total de despesas', get: (m) => m.totalCosts, total: t.totalCosts, strong: true },
    { label: 'Resultado', get: (m) => m.result, total: t.result, strong: true, result: true },
    { label: 'Km rodados', get: (m) => m.km, total: t.km, fmt: (n) => formatInt(n) },
  ]

  function exportCSV() {
    const csv = toCSV([
      [`Resumo de 12 meses — ${plate}`],
      ['', ...months.map(formatMonthShort), 'Total'],
      ...rows.map((r) => [r.label, ...series.map(r.get), r.total]),
    ])
    download(`resumo-12-meses-${months[months.length - 1]}-${plate.toLowerCase()}.csv`, csv)
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h2 className="font-display text-xl font-extrabold">
            {formatMonthTitle(months[0])} a {formatMonth(months[months.length - 1])}
          </h2>
          <p className="text-sm text-ink-3">
            Mesma leitura do resumo anual da planilha: um mês por coluna. Valores em R$ arredondados; o CSV traz os centavos.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button onClick={exportCSV}>
            <Download /> Exportar para Excel (CSV)
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
        </div>
      </div>
      <TableWrap>
        <Table className="text-[13px]">
          <thead>
            <tr>
              <Th className="sticky left-0 z-10">Item</Th>
              {months.map((m) => (
                <Th key={m} numeric className={cn('px-2', m === month && 'bg-navy-100 text-ink')}>
                  {formatMonthShort(m)}
                </Th>
              ))}
              <Th numeric className="px-2">Total</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.label} className={cn(r.result && 'bg-canvas')}>
                <Td className={cn('sticky left-0 z-10 bg-surface whitespace-nowrap', r.strong && 'font-semibold', r.result && 'bg-canvas')}>{r.label}</Td>
                {series.map((m) => {
                  const v = r.get(m)
                  return (
                    <Td key={m.month} numeric className={cn('px-2', r.strong && 'font-semibold', m.month === month && 'bg-navy-50')}>
                      {empty(m) ? '—' : r.result ? <ResultValue value={v} whole /> : r.fmt ? r.fmt(v) : v ? formatWhole(v) : '—'}
                    </Td>
                  )
                })}
                <Td numeric className="px-2 font-semibold">
                  {r.result ? <ResultValue value={r.total} whole /> : r.fmt ? r.fmt(r.total) : formatWhole(r.total)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <p className="px-6 py-3 text-sm text-ink-3">Valores negativos (−) indicam prejuízo no mês. “—” = mês sem lançamentos.</p>
    </Card>
  )
}
