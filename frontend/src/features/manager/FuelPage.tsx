import { useMemo, useState } from 'react'
import { Paperclip, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useFuel, useVehicles } from '@/data/queries'
import { countsInTotals } from '@/domain/rules'
import type { FuelEntry } from '@/domain/types'
import { formatDateTime, formatKm, formatKmPerLiter, formatLiters, formatMoney, formatMonth, formatPricePerLiter } from '@/lib/format'
import { FuelForm } from '@/features/shared/FuelForm'
import { StatusBadge } from '@/features/shared/status'
import { MonthFilter, VehicleFilter, useManagerFilters } from './filters'

/** km/L de cada abastecimento: km desde o abastecimento anterior com km ÷ litros deste. */
function consumptionByEntry(entries: FuelEntry[]) {
  const map = new Map<string, number>()
  const byVehicle = new Map<string, FuelEntry[]>()
  for (const e of entries) byVehicle.set(e.vehicleId, [...(byVehicle.get(e.vehicleId) ?? []), e])
  for (const list of byVehicle.values()) {
    const sorted = list.filter((e) => e.odometerKm != null && countsInTotals(e) && e.fuelType !== 'arla32').sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 1; i < sorted.length; i++) {
      const km = sorted[i].odometerKm! - sorted[i - 1].odometerKm!
      if (km > 0 && sorted[i].liters > 0) map.set(sorted[i].id, km / sorted[i].liters)
    }
  }
  return map
}

export function FuelPage() {
  const { vehicleId, month } = useManagerFilters()
  const all = useFuel()
  const vehicles = useVehicles()
  const [creating, setCreating] = useState(false)
  const plate = (id: string) => vehicles.data?.find((v) => v.id === id)?.plate ?? '—'

  const consumption = useMemo(() => consumptionByEntry(all.data ?? []), [all.data])
  const list = (all.data ?? []).filter((f) => (!vehicleId || f.vehicleId === vehicleId) && f.date.startsWith(month))
  const counted = list.filter(countsInTotals)
  const liters = counted.reduce((s, f) => s + f.liters, 0)
  const total = counted.reduce((s, f) => s + f.total, 0)
  const kml = counted.map((f) => consumption.get(f.id)).filter((v): v is number => v != null)
  const avgKml = kml.length ? kml.reduce((a, b) => a + b, 0) / kml.length : null

  return (
    <div>
      <PageHeader
        title="Abastecimentos"
        description={`${list.length} abastecimentos em ${formatMonth(month)}`}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus /> Registrar abastecimento
          </Button>
        }
        filters={
          <>
            <VehicleFilter />
            <MonthFilter />
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gasto com combustível" value={formatMoney(total)} />
        <Stat label="Litros" value={formatLiters(liters)} />
        <Stat label="Preço médio" value={liters ? formatPricePerLiter(total / liters) : '—'} />
        <Stat label="Consumo médio" value={avgKml ? formatKmPerLiter(avgKml) : '—'} />
      </div>
      <Card>
        <QueryState query={all}>
          {list.length ? (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Data</Th>
                    <Th>Veículo</Th>
                    <Th>Posto</Th>
                    <Th numeric>Litros</Th>
                    <Th numeric>Valor</Th>
                    <Th numeric>R$/L</Th>
                    <Th numeric>Km</Th>
                    <Th numeric>km/L</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => (
                    <Tr key={f.id}>
                      <Td className="num whitespace-nowrap">{formatDateTime(f.date)}</Td>
                      <Td className="font-medium">{plate(f.vehicleId)}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5">
                          {f.station}
                          {f.documentId && <Paperclip className="size-3.5 text-slate" aria-label="com comprovante" />}
                        </span>
                      </Td>
                      <Td numeric>{formatLiters(f.liters)}</Td>
                      <Td numeric className="font-semibold">{formatMoney(f.total)}</Td>
                      <Td numeric>{formatPricePerLiter(f.total / f.liters)}</Td>
                      <Td numeric>{f.odometerKm ? formatKm(f.odometerKm) : '—'}</Td>
                      <Td numeric>{consumption.has(f.id) ? formatKmPerLiter(consumption.get(f.id)!) : '—'}</Td>
                      <Td>
                        <StatusBadge status={f.status} short />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState title="Nenhum abastecimento neste período">Os abastecimentos registrados pelos motoristas aparecem aqui.</EmptyState>
          )}
        </QueryState>
      </Card>
      <Sheet open={creating} onOpenChange={setCreating} title="Registrar abastecimento" description="Use quando o motorista não registrou.">
        <FuelForm actor="gestor" fixedVehicleId={undefined} onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Sheet>
    </div>
  )
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="font-kpi mt-1 text-xl font-extrabold">{value}</p>
      {sub && <p className="text-sm text-ink-3">{sub}</p>}
    </Card>
  )
}
