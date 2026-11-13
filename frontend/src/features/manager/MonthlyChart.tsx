import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts'
import type { MonthSummary } from '@/domain/types'
import { formatMoney, formatMoneyCompact, formatMonthShort, formatMonthTitle } from '@/lib/format'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { ResultValue } from '@/features/shared/status'

const C = { revenue: '#0e876b', cost: '#c47a12', result: '#101e2b', loss: '#c23a2f', grid: '#e6eaee', axis: '#55687a' }

function ChartTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null
  const m = payload[0].payload as MonthSummary
  return (
    <div className="rounded-lg bg-surface px-3.5 py-3 text-sm shadow-[var(--shadow-pop)]">
      <p className="font-semibold">{formatMonthTitle(m.month)}</p>
      <dl className="num mt-1.5 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
        <dt className="flex items-center gap-1.5 text-ink-3">
          <span className="size-2.5 rounded-sm" style={{ background: C.revenue }} />
          Faturamento
        </dt>
        <dd className="text-right">{formatMoney(m.revenue)}</dd>
        <dt className="flex items-center gap-1.5 text-ink-3">
          <span className="size-2.5 rounded-sm" style={{ background: C.cost }} />
          Despesas
        </dt>
        <dd className="text-right">{formatMoney(m.totalCosts)}</dd>
        <dt className="flex items-center gap-1.5 text-ink-3">
          <span className="h-0.5 w-2.5" style={{ background: C.result }} />
          Resultado
        </dt>
        <dd className="text-right font-semibold">
          <ResultValue value={m.result} showLabel />
        </dd>
      </dl>
    </div>
  )
}

/** Evolução mensal: faturamento × despesas (barras) e resultado (linha). Um único eixo em R$. */
export function MonthlyChart({ data, selected, onSelect }: { data: MonthSummary[]; selected?: string; onSelect?: (m: string) => void }) {
  const [asTable, setAsTable] = useState(false)
  const losses = data.filter((d) => d.result < 0)
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-sm text-ink-2" aria-label="Legenda">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: C.revenue }} aria-hidden /> Faturamento
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: C.cost }} aria-hidden /> Despesas
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: C.result }} aria-hidden /> Resultado
          </li>
          {losses.length > 0 && (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-2 border-white ring-2" style={{ background: C.loss, ['--tw-ring-color' as string]: C.loss }} aria-hidden />
              Mês com prejuízo
            </li>
          )}
        </ul>
        <button type="button" className="text-sm font-semibold text-info-700 underline underline-offset-4" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Ver como gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {asTable ? (
        <TableWrap className="rounded-lg border border-line">
          <Table>
            <thead>
              <tr>
                <Th>Mês</Th>
                <Th numeric>Faturamento</Th>
                <Th numeric>Despesas</Th>
                <Th numeric>Resultado</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <Tr key={m.month}>
                  <Td>{formatMonthTitle(m.month)}</Td>
                  {m.revenue === 0 && m.totalCosts === 0 ? (
                    <Td colSpan={3} className="text-ink-3">
                      Sem lançamentos
                    </Td>
                  ) : (
                    <>
                      <Td numeric>{formatMoney(m.revenue)}</Td>
                      <Td numeric>{formatMoney(m.totalCosts)}</Td>
                      <Td numeric>
                        <ResultValue value={m.result} showLabel={m.result < 0} />
                      </Td>
                    </>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : (
        <div className="h-72" role="img" aria-label={`Gráfico de faturamento, despesas e resultado de ${data.length} meses. ${losses.length ? `Meses com prejuízo: ${losses.map((l) => formatMonthTitle(l.month)).join(', ')}.` : 'Nenhum mês com prejuízo.'} Use "Ver como tabela" para os valores.`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
              barGap={2}
              barCategoryGap="22%"
              onClick={(s) => {
                const m = (s as { activeLabel?: string } | null)?.activeLabel
                if (m && onSelect) onSelect(m)
              }}
            >
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthShort}
                tick={({ x, y, payload }) => (
                  <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={12} fill={payload.value === selected ? '#101e2b' : C.axis} fontWeight={payload.value === selected ? 700 : 400}>
                    {formatMonthShort(payload.value)}
                  </text>
                )}
                axisLine={{ stroke: C.grid }}
                tickLine={false}
              />
              <YAxis tickFormatter={(v: number) => formatMoneyCompact(v)} tick={{ fontSize: 12, fill: C.axis }} axisLine={false} tickLine={false} width={72} />
              <ReferenceLine y={0} stroke={C.axis} />
              <Tooltip content={ChartTooltip} cursor={{ fill: 'rgb(16 30 43 / 0.05)' }} />
              <Bar dataKey="revenue" name="Faturamento" fill={C.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="totalCosts" name="Despesas" fill={C.cost} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Line
                dataKey="result"
                name="Resultado"
                stroke={C.result}
                strokeWidth={2}
                isAnimationActive={false}
                dot={({ cx, cy, payload, index }) => (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={(payload as MonthSummary).result < 0 ? 5.5 : 4}
                    fill={(payload as MonthSummary).result < 0 ? C.loss : C.result}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
