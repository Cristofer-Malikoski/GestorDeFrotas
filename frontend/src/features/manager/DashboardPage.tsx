import { Link } from 'react-router'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ClipboardCheck, Route, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { LoadingBlock, ErrorState } from '@/components/ui/feedback'
import { useReviewQueue, useTrips, useVehicles } from '@/data/queries'
import { groupCostLines } from '@/domain/reports'
import { currentMonth, addMonths } from '@/lib/dates'
import {
  formatCostPerKm,
  formatKm,
  formatKmPerLiter,
  formatMoney,
  formatMonth,
  formatMonthShort,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/cn'
import { ResultValue } from '@/features/shared/status'
import { MonthFilter, VehicleFilter, useManagerFilters } from './filters'
import { MonthlyChart } from './MonthlyChart'
import { delta, useMonthReport } from './useReport'

export function DashboardPage() {
  const { month, vehicleId, setMonth } = useManagerFilters()
  const q = useMonthReport(month, vehicleId)
  const queue = useReviewQueue()
  const trips = useTrips()
  const vehicles = useVehicles()
  const isCurrent = month === currentMonth()

  const tripsNoFreight = (trips.data ?? []).filter((t) => t.status === 'concluida' && !t.freight && (!vehicleId || t.vehicleId === vehicleId))
  const active = (trips.data ?? []).filter((t) => t.status === 'em_andamento' && (!vehicleId || t.vehicleId === vehicleId))
  const pending = (queue.data ?? []).filter((e) => !vehicleId || e.vehicleId === vehicleId)
  const plate = (id: string) => vehicles.data?.find((v) => v.id === id)?.plate ?? ''

  return (
    <div>
      <PageHeader
        title="Painel"
        description={`Resultado da operação em ${formatMonth(month)}${vehicleId ? ` · ${plate(vehicleId)}` : ' · todos os veículos'}`}
        filters={
          <>
            <VehicleFilter />
            <MonthFilter />
          </>
        }
      />

      {q.isPending ? (
        <LoadingBlock rows={6} />
      ) : q.isError || !q.report ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="space-y-6">
          {isCurrent && (
            <Callout tone="info" title="Mês em andamento">
              Valores até hoje. Fretes entram quando a viagem termina e os custos fixos já foram lançados, então o resultado
              parcial costuma parecer pior do que o mês fechado. Compare com meses anteriores pelo gráfico.
            </Callout>
          )}

          <section aria-label="Indicadores do mês" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Faturamento (fretes)" value={formatMoney(q.report.current.revenue)} change={isCurrent ? null : delta(q.report.current.revenue, q.report.previous.revenue)} goodWhenUp month={month} />
            <Kpi label="Despesas" value={formatMoney(q.report.current.totalCosts)} change={isCurrent ? null : delta(q.report.current.totalCosts, q.report.previous.totalCosts)} goodWhenUp={false} month={month} />
            <Kpi
              label="Resultado do mês"
              value={<ResultValue value={q.report.current.result} />}
              sub={q.report.current.result < 0 ? 'Prejuízo: despesas maiores que o faturamento' : q.report.current.revenue ? `Margem de ${formatPercent(q.report.current.result / q.report.current.revenue)}` : undefined}
              emphasis={q.report.current.result < 0 ? 'bad' : 'ok'}
              month={month}
            />
            <Kpi
              label="Custo por km"
              value={q.report.current.costPerKm ? formatCostPerKm(q.report.current.costPerKm) : '—'}
              sub={`${formatKm(q.report.current.km)} rodados${q.report.current.kmPerLiter ? ` · ${formatKmPerLiter(q.report.current.kmPerLiter)}` : ''}`}
              month={month}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Evolução nos últimos 12 meses</CardTitle>
                  <p className="text-sm text-ink-3">Clique em um mês para ver os detalhes dele.</p>
                </div>
              </CardHeader>
              <CardBody>
                <MonthlyChart data={q.report.series} selected={month} onSelect={setMonth} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>O que precisa da sua atenção</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-line border-t border-line">
                <Attention
                  to="/gestor/conferencia"
                  icon={<ClipboardCheck />}
                  tone={pending.length ? 'warn' : 'ok'}
                  title={pending.length ? `${pending.length} lançamento${pending.length > 1 ? 's' : ''} para conferir` : 'Nenhum lançamento para conferir'}
                  detail={pending.length ? 'Duplicidade, leitura incerta, falta de comprovante ou km.' : 'Tudo conferido.'}
                />
                <Attention
                  to="/gestor/viagens"
                  icon={<Route />}
                  tone={tripsNoFreight.length ? 'warn' : 'ok'}
                  title={tripsNoFreight.length ? `${tripsNoFreight.length} viagem concluída sem frete` : 'Todas as viagens com frete'}
                  detail={tripsNoFreight.length ? tripsNoFreight.map((t) => `${plate(t.vehicleId)}: ${t.origin} → ${t.destination}`).join(' · ') : 'Faturamento completo.'}
                />
                <Attention
                  to="/gestor/viagens"
                  icon={<Truck />}
                  tone="info"
                  title={active.length ? `${active.length} viagem em andamento` : 'Nenhuma viagem em andamento'}
                  detail={active.map((t) => `${plate(t.vehicleId)}: ${t.origin} → ${t.destination}`).join(' · ') || 'Frota parada ou entre viagens.'}
                />
              </ul>
              {q.report.current.pendingCount > 0 && (
                <div className="p-4">
                  <Callout tone="warn">
                    O resultado de {formatMonth(month)} pode mudar: {q.report.current.pendingCount} lançamento(s) do mês ainda não conferido(s).
                  </Callout>
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Para onde foi o dinheiro em {formatMonth(month)}</CardTitle>
                <p className="text-sm text-ink-3">Despesas agrupadas como no fechamento mensal.</p>
              </div>
              <Link to="/gestor/relatorios" className="text-sm font-semibold whitespace-nowrap text-info-700 underline underline-offset-4">
                Abrir fechamento
              </Link>
            </CardHeader>
            <CardBody>
              <CostBreakdown lines={q.report.current.costLines} total={q.report.current.totalCosts} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  change,
  goodWhenUp,
  sub,
  emphasis,
  month,
}: {
  label: string
  value: ReactNode
  change?: number | null
  goodWhenUp?: boolean
  sub?: string
  emphasis?: 'ok' | 'bad'
  month: string
}) {
  const up = change != null && change >= 0
  const good = change == null ? undefined : goodWhenUp ? up : !up
  return (
    <Card className={cn('p-5', emphasis === 'bad' && 'ring-2 ring-bad-600/30')}>
      <p className="text-sm font-medium text-ink-3">{label}</p>
      <p className="font-kpi mt-2 text-[28px] leading-none font-extrabold">{value}</p>
      {change != null && (
        <p className={cn('mt-2 flex items-center gap-1 text-sm', good ? 'text-go-700' : 'text-bad-700')}>
          {up ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
          <span className="num">
            {up ? '+' : '−'}
            {formatPercent(Math.abs(change))}
          </span>
          <span className="text-ink-3">vs. {formatMonthShort(addMonths(month, -1))}</span>
        </p>
      )}
      {sub && <p className={cn('mt-2 text-sm', emphasis === 'bad' ? 'font-medium text-bad-700' : 'text-ink-3')}>{sub}</p>}
    </Card>
  )
}

function Attention({ to, icon, title, detail, tone }: { to: string; icon: ReactNode; title: string; detail: string; tone: 'warn' | 'ok' | 'info' }) {
  return (
    <li>
      <Link to={to} className="group flex gap-3 px-5 py-4 hover:bg-canvas">
        <span
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]',
            tone === 'warn' ? 'bg-amber-100 text-amber-700' : tone === 'ok' ? 'bg-go-50 text-go-700' : 'bg-info-50 text-info-700',
          )}
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-ink-3">{detail}</span>
        </span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-slate transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  )
}

function CostBreakdown({ lines, total }: { lines: Parameters<typeof groupCostLines>[0]; total: number }) {
  const groups = groupCostLines(lines)
  if (!total) return <p className="text-ink-3">Nenhuma despesa registrada neste mês.</p>
  return (
    <ul className="space-y-3">
      {groups.map((g) => (
        <li key={g.group} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-4 text-sm">
          <span className="font-medium">{g.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <span className="block h-full rounded-full bg-navy-700" style={{ width: `${Math.max(2, (g.total / total) * 100)}%` }} />
          </span>
          <span className="num w-44 text-right">
            {formatMoney(g.total)} <span className="text-ink-3">· {formatPercent(g.total / total)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
