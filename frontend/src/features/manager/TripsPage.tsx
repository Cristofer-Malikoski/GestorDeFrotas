import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select } from '@/components/ui/field'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useCreateTrip, useDrivers, useSetFreight, useTrips, useVehicles } from '@/data/queries'
import { tripKm, tripRevenueMonth } from '@/domain/reports'
import type { Trip } from '@/domain/types'
import { todayISO } from '@/lib/dates'
import { formatCostPerKm, formatDate, formatDecimal, formatKm, formatMoney, formatMonth } from '@/lib/format'
import { parseDecimalBR, parseIntegerBR } from '@/lib/parse'
import { TripStatusBadge } from '@/features/shared/status'
import { MonthFilter, VehicleFilter, useManagerFilters } from './filters'

export function TripsPage() {
  const { vehicleId, month } = useManagerFilters()
  const trips = useTrips()
  const vehicles = useVehicles()
  const drivers = useDrivers()
  const [freightTrip, setFreightTrip] = useState<Trip>()
  const [creating, setCreating] = useState(false)

  const list = useMemo(
    () =>
      (trips.data ?? []).filter(
        (t) => (!vehicleId || t.vehicleId === vehicleId) && (t.startDate.startsWith(month) || tripRevenueMonth(t) === month || t.status === 'em_andamento'),
      ),
    [trips.data, vehicleId, month],
  )
  const missing = list.filter((t) => t.status === 'concluida' && !t.freight)
  const revenue = list.filter((t) => tripRevenueMonth(t) === month).reduce((s, t) => s + (t.freight?.value ?? 0), 0)
  const plate = (id: string) => vehicles.data?.find((v) => v.id === id)?.plate ?? '—'
  const driver = (id: string) => drivers.data?.find((d) => d.id === id)?.name ?? '—'

  return (
    <div>
      <PageHeader
        title="Viagens e fretes"
        description={`${list.length} viagens em ${formatMonth(month)} · fretes reconhecidos: ${formatMoney(revenue)}`}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus /> Nova viagem
          </Button>
        }
        filters={
          <>
            <VehicleFilter />
            <MonthFilter />
          </>
        }
      />
      {missing.length > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-[15px] ring-1 ring-amber-400/60">
          <strong>{missing.length} viagem concluída sem frete.</strong> Registre o valor para o faturamento do mês ficar completo.
        </p>
      )}
      <Card>
        <QueryState query={trips}>
          {list.length ? (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Saída</Th>
                    <Th>Veículo</Th>
                    <Th>Rota</Th>
                    <Th numeric>Km</Th>
                    <Th>Cliente / carga</Th>
                    <Th numeric>Frete</Th>
                    <Th numeric>R$/km</Th>
                    <Th>Estado</Th>
                    <Th>
                      <span className="sr-only">Ações</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => {
                    const km = tripKm(t)
                    return (
                      <Tr key={t.id}>
                        <Td className="num whitespace-nowrap">{formatDate(t.startDate)}</Td>
                        <Td>
                          <span className="font-medium">{plate(t.vehicleId)}</span>
                          <span className="block text-xs text-ink-3">{driver(t.driverId)}</span>
                        </Td>
                        <Td className="min-w-48">
                          {t.origin} → {t.destination}
                        </Td>
                        <Td numeric>{km ? formatKm(km) : '—'}</Td>
                        <Td className="max-w-56">
                          {t.freight ? (
                            <>
                              <span className="block truncate">{t.freight.client}</span>
                              <span className="block truncate text-xs text-ink-3">{t.freight.cargo}</span>
                            </>
                          ) : (
                            <Badge tone="warn">Sem frete</Badge>
                          )}
                        </Td>
                        <Td numeric className="font-semibold">{t.freight ? formatMoney(t.freight.value) : '—'}</Td>
                        <Td numeric>{t.freight && km ? formatCostPerKm(t.freight.value / km) : '—'}</Td>
                        <Td>
                          <TripStatusBadge status={t.status} />
                        </Td>
                        <Td className="text-right">
                          <Button size="sm" variant={t.freight ? 'ghost' : 'dark'} onClick={() => setFreightTrip(t)}>
                            {t.freight ? 'Editar frete' : 'Registrar frete'}
                          </Button>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState
              title="Nenhuma viagem neste período"
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  <Plus /> Nova viagem
                </Button>
              }
            >
              Viagens iniciadas pelo motorista aparecem aqui automaticamente.
            </EmptyState>
          )}
        </QueryState>
      </Card>

      {freightTrip && <FreightSheet trip={freightTrip} clients={[...new Set((trips.data ?? []).map((t) => t.freight?.client).filter(Boolean) as string[])]} onClose={() => setFreightTrip(undefined)} />}
      {creating && <NewTripSheet onClose={() => setCreating(false)} />}
    </div>
  )
}

const freightSchema = z.object({
  client: z.string().trim().min(2, 'Informe o cliente.'),
  cargo: z.string().trim().min(2, 'Informe a carga.'),
  value: z.string().refine((v) => parseDecimalBR(v) > 0, 'Informe o valor do frete. Exemplo: 6.200,00'),
})

function FreightSheet({ trip, clients, onClose }: { trip: Trip; clients: string[]; onClose: () => void }) {
  const save = useSetFreight()
  const form = useForm<z.infer<typeof freightSchema>>({
    resolver: zodResolver(freightSchema),
    defaultValues: { client: trip.freight?.client ?? '', cargo: trip.freight?.cargo ?? '', value: trip.freight ? formatDecimal(trip.freight.value) : '' },
  })
  const e = form.formState.errors
  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ tripId: trip.id, freight: { client: v.client.trim(), cargo: v.cargo.trim(), value: parseDecimalBR(v.value) } })
      toast.success('Frete registrado.')
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  })
  const km = tripKm(trip)
  const value = parseDecimalBR(form.watch('value'))
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={trip.freight ? 'Editar frete' : 'Registrar frete'}
      description={`${trip.origin} → ${trip.destination} · saída em ${formatDate(trip.startDate)}${km ? ` · ${formatKm(km)}` : ''}`}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} loading={save.isPending}>
            Salvar frete
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <p className="text-sm text-ink-3">Rota, datas e km já vêm da viagem registrada pelo motorista.</p>
        <Field label="Cliente" error={e.client?.message}>
          {(p) => (
            <>
              <Input {...p} {...form.register('client')} list="clientes" autoComplete="off" autoFocus />
              <datalist id="clientes">
                {clients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Carga" error={e.cargo?.message}>
          {(p) => <Input {...p} {...form.register('cargo')} />}
        </Field>
        <Field label="Valor do frete" error={e.value?.message} hint={value > 0 && km ? `${formatCostPerKm(value / km)} rodado` : undefined}>
          {(p) => <Input {...p} {...form.register('value')} inputMode="decimal" suffix="R$" />}
        </Field>
        <button type="submit" className="sr-only">
          Salvar
        </button>
      </form>
    </Sheet>
  )
}

const tripSchema = z.object({
  vehicleId: z.string().min(1, 'Escolha o veículo.'),
  origin: z.string().trim().min(2, 'Informe a origem.'),
  destination: z.string().trim().min(2, 'Informe o destino.'),
  startDate: z.string().min(1, 'Informe a data de saída.'),
  startKm: z.string().refine((v) => parseIntegerBR(v) > 0, 'Informe o km de saída.'),
  endKm: z.string(),
  endDate: z.string(),
  client: z.string(),
  cargo: z.string(),
  value: z.string(),
})

function NewTripSheet({ onClose }: { onClose: () => void }) {
  const vehicles = useVehicles()
  const create = useCreateTrip()
  const form = useForm<z.infer<typeof tripSchema>>({
    resolver: zodResolver(tripSchema),
    defaultValues: { vehicleId: '', origin: '', destination: '', startDate: todayISO(), startKm: '', endKm: '', endDate: '', client: '', cargo: '', value: '' },
  })
  const { register, setValue, watch, setError } = form
  const e = form.formState.errors
  const vehicle = vehicles.data?.find((v) => v.id === watch('vehicleId'))

  const onSubmit = form.handleSubmit(async (v) => {
    const startKm = parseIntegerBR(v.startKm)
    const endKm = v.endKm.trim() ? parseIntegerBR(v.endKm) : undefined
    if (endKm != null && endKm < startKm) return setError('endKm', { message: 'O km de chegada não pode ser menor que o de saída.' })
    const value = v.value.trim() ? parseDecimalBR(v.value) : undefined
    if (v.value.trim() && !(value! > 0)) return setError('value', { message: 'Valor inválido. Exemplo: 6.200,00' })
    try {
      await create.mutateAsync({
        vehicleId: v.vehicleId,
        driverId: vehicle?.driverId ?? '',
        origin: v.origin.trim(),
        destination: v.destination.trim(),
        startDate: v.startDate,
        startKm,
        endKm,
        endDate: endKm != null ? v.endDate || v.startDate : undefined,
        freight: value ? { client: v.client.trim() || 'Não informado', cargo: v.cargo.trim() || 'Não informada', value } : undefined,
      })
      toast.success('Viagem criada.')
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  })

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Nova viagem"
      description="Para registrar uma viagem que o motorista não lançou."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} loading={create.isPending}>
            Criar viagem
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Veículo" error={e.vehicleId?.message} hint={vehicle ? `Motorista vinculado e km atual preenchidos.` : undefined}>
          {(p) => (
            <Select
              {...p}
              {...register('vehicleId', {
                onChange: (ev) => {
                  const v = vehicles.data?.find((x) => x.id === ev.target.value)
                  if (v) setValue('startKm', String(v.odometerKm))
                },
              })}
            >
              <option value="">Escolha o veículo</option>
              {vehicles.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.model}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Origem" error={e.origin?.message}>
            {(p) => <Input {...p} {...register('origin')} />}
          </Field>
          <Field label="Destino" error={e.destination?.message}>
            {(p) => <Input {...p} {...register('destination')} />}
          </Field>
          <Field label="Data de saída" error={e.startDate?.message}>
            {(p) => <Input {...p} type="date" {...register('startDate')} />}
          </Field>
          <Field label="Km de saída" error={e.startKm?.message}>
            {(p) => <Input {...p} {...register('startKm')} inputMode="numeric" suffix="km" />}
          </Field>
          <Field label="Km de chegada" optional error={e.endKm?.message} hint="Deixe vazio se ainda está em andamento.">
            {(p) => <Input {...p} {...register('endKm')} inputMode="numeric" suffix="km" />}
          </Field>
          <Field label="Data de chegada" optional>
            {(p) => <Input {...p} type="date" {...register('endDate')} />}
          </Field>
        </div>
        <fieldset className="space-y-4 rounded-lg border border-line p-4">
          <legend className="px-1 text-sm font-semibold">Frete (opcional agora)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente">{(p) => <Input {...p} {...register('client')} />}</Field>
            <Field label="Carga">{(p) => <Input {...p} {...register('cargo')} />}</Field>
            <Field label="Valor" error={e.value?.message}>
              {(p) => <Input {...p} {...register('value')} inputMode="decimal" suffix="R$" />}
            </Field>
          </div>
        </fieldset>
        <button type="submit" className="sr-only">
          Criar
        </button>
      </form>
    </Sheet>
  )
}
