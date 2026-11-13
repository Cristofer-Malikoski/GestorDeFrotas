import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingBlock, ErrorState } from '@/components/ui/feedback'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDrivers, useReportData, useTrips, useVehicles } from '@/data/queries'
import { summarizeMonth, summarizeMonths, totals } from '@/domain/reports'
import { FUEL_TYPE_LABEL } from '@/domain/labels'
import { lastMonths } from '@/lib/dates'
import { formatCostPerKm, formatKm, formatKmPerLiter, formatMoney, formatMonth, formatPercent } from '@/lib/format'
import { ResultValue } from '@/features/shared/status'
import { MonthFilter, useManagerFilters } from './filters'

type Period = 'mes' | '12m'

export function VehiclesPage() {
  const { month } = useManagerFilters()
  const vehicles = useVehicles()
  const drivers = useDrivers()
  const trips = useTrips()
  const report = useReportData()
  const [period, setPeriod] = useState<Period>('mes')

  const rows = useMemo(() => {
    if (!report.data || !vehicles.data) return []
    return vehicles.data.map((v) => {
      const t =
        period === 'mes'
          ? (() => {
              const s = summarizeMonth(report.data!, month, v.id)
              return { revenue: s.revenue, totalCosts: s.totalCosts, result: s.result, km: s.km, kmPerLiter: s.kmPerLiter, costPerKm: s.costPerKm }
            })()
          : totals(summarizeMonths(report.data!, lastMonths(month, 12), v.id))
      return { vehicle: v, ...t }
    })
  }, [report.data, vehicles.data, period, month])

  if (vehicles.isPending || report.isPending) return <LoadingBlock rows={6} />
  if (vehicles.isError || report.isError) return <ErrorState error={vehicles.error ?? report.error} onRetry={() => vehicles.refetch()} />

  const best = rows.length > 1 ? Math.max(...rows.map((r) => r.result)) : undefined

  return (
    <div>
      <PageHeader title="Veículos" description={`${vehicles.data.length} caminhões ativos na frota`} />
      <div className="grid gap-4 md:grid-cols-2">
        {vehicles.data.map((v) => {
          const active = trips.data?.find((t) => t.vehicleId === v.id && t.status === 'em_andamento')
          return (
            <Card key={v.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl font-extrabold">{v.plate}</p>
                  <p className="text-ink-2">
                    {v.model}
                    {v.year ? ` · ${v.year}` : ''}
                  </p>
                  <p className="text-sm text-ink-3">{v.description}</p>
                </div>
                {active ? <Badge tone="info">Em viagem</Badge> : <Badge>Disponível</Badge>}
              </div>
              <dl className="num mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-ink-3">Hodômetro</dt>
                  <dd className="font-semibold">{v.odometerKm ? formatKm(v.odometerKm) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Motorista</dt>
                  <dd className="font-semibold">{drivers.data?.find((d) => d.id === v.driverId)?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Combustível</dt>
                  <dd className="font-semibold">{FUEL_TYPE_LABEL[v.fuelType]}</dd>
                </div>
              </dl>
              {active && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-2">
                  <MapPin className="size-4 text-go-700" aria-hidden /> {active.origin} → {active.destination}
                </p>
              )}
            </Card>
          )
        })}
      </div>

      {rows.length > 1 && (
        <section className="mt-10" aria-labelledby="comparacao">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="comparacao" className="font-display text-xl font-extrabold">
                Comparação entre veículos
              </h2>
              <p className="text-sm text-ink-3">{period === 'mes' ? formatMonth(month) : `12 meses até ${formatMonth(month)}`}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList>
                  <TabsTrigger value="mes">Mês</TabsTrigger>
                  <TabsTrigger value="12m">12 meses</TabsTrigger>
                </TabsList>
              </Tabs>
              <MonthFilter />
            </div>
          </div>
          <Card>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Veículo</Th>
                    <Th numeric>Faturamento</Th>
                    <Th numeric>Despesas</Th>
                    <Th numeric>Resultado</Th>
                    <Th numeric>Margem</Th>
                    <Th numeric>Km</Th>
                    <Th numeric>Consumo</Th>
                    <Th numeric>Custo por km</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.vehicle.id}>
                      <Td>
                        <span className="font-semibold">{r.vehicle.plate}</span>
                        <span className="block text-xs text-ink-3">{r.vehicle.model}</span>
                      </Td>
                      <Td numeric>{formatMoney(r.revenue)}</Td>
                      <Td numeric>{formatMoney(r.totalCosts)}</Td>
                      <Td numeric className="font-semibold">
                        <ResultValue value={r.result} showLabel={r.result < 0} />
                        {best === r.result && r.result > 0 && <span className="ml-2 text-xs font-semibold text-go-700">melhor</span>}
                      </Td>
                      <Td numeric>{r.revenue ? formatPercent(r.result / r.revenue) : '—'}</Td>
                      <Td numeric>{formatKm(r.km)}</Td>
                      <Td numeric>{r.kmPerLiter ? formatKmPerLiter(r.kmPerLiter) : '—'}</Td>
                      <Td numeric>{r.costPerKm ? formatCostPerKm(r.costPerKm) : '—'}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
        </section>
      )}
    </div>
  )
}
