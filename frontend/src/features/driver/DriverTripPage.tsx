import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { MapPin, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { LoadingBlock } from '@/components/ui/feedback'
import { useFinishTrip, useStartTrip, useUpdateTripKm } from '@/data/queries'
import type { Trip } from '@/domain/types'
import { todayISO } from '@/lib/dates'
import { formatDate, formatKm } from '@/lib/format'
import { parseIntegerBR } from '@/lib/parse'
import { useEntryContext } from '@/features/shared/useEntryContext'
import { DriverPageShell } from './DriverFormPages'
import { useDriverData } from './useDriverData'

export function DriverTripPage() {
  const d = useDriverData()
  if (d.isPending) return <LoadingBlock />
  return d.activeTrip ? (
    <DriverPageShell title="Viagem em andamento" description="Atualize o km ou encerre ao chegar.">
      <ActiveTrip trip={d.activeTrip} />
    </DriverPageShell>
  ) : (
    <DriverPageShell title="Nova viagem" description="Origem e km de saída já vêm sugeridos.">
      <StartTrip />
    </DriverPageShell>
  )
}

const startSchema = z.object({
  origin: z.string().trim().min(2, 'Informe a cidade de origem.'),
  destination: z.string().trim().min(2, 'Informe o destino. Exemplo: São Paulo/SP'),
  startKm: z.string().refine((v) => parseIntegerBR(v) > 0, 'Informe o km do hodômetro na saída.'),
  startDate: z.string().min(1, 'Informe a data de saída.'),
})

function StartTrip() {
  const d = useDriverData()
  const ctx = useEntryContext(d.vehicleId)
  const navigate = useNavigate()
  const start = useStartTrip()
  const lastDestination = d.trips.find((t) => t.status === 'concluida')?.destination ?? ''
  const [showDate, setShowDate] = useState(false)
  const form = useForm<z.infer<typeof startSchema>>({
    resolver: zodResolver(startSchema),
    defaultValues: {
      origin: lastDestination,
      destination: '',
      startKm: String(ctx.lastKm ?? d.vehicle?.odometerKm ?? ''),
      startDate: todayISO(),
    },
  })
  const { register, formState, handleSubmit } = form
  const e = formState.errors
  const onSubmit = handleSubmit(async (v) => {
    try {
      await start.mutateAsync({
        vehicleId: d.vehicleId!,
        driverId: d.driverId!,
        origin: v.origin.trim(),
        destination: v.destination.trim(),
        startKm: parseIntegerBR(v.startKm),
        startDate: v.startDate,
      })
      toast.success('Viagem iniciada. Boa estrada!')
      navigate('/motorista')
    } catch (err) {
      toast.error((err as Error).message)
    }
  })
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Saindo de" error={e.origin?.message} hint={lastDestination ? 'Destino da sua última viagem.' : undefined}>
          {(p) => <Input {...p} {...register('origin')} list="cidades" autoComplete="off" />}
        </Field>
        <Field label="Indo para" error={e.destination?.message}>
          {(p) => <Input {...p} {...register('destination')} list="cidades" autoComplete="off" autoFocus />}
        </Field>
        <Field label="Km na saída" error={e.startKm?.message} hint="Último km registrado do caminhão.">
          {(p) => <Input {...p} {...register('startKm')} inputMode="numeric" suffix="km" />}
        </Field>
        {showDate ? (
          <Field label="Data de saída" error={e.startDate?.message}>
            {(p) => <Input {...p} type="date" {...register('startDate')} />}
          </Field>
        ) : (
          <div className="flex flex-col justify-end pb-2 text-sm text-ink-2">
            <span>Saída hoje, {formatDate(form.watch('startDate'))}</span>
            <Button variant="link" size="sm" className="self-start" onClick={() => setShowDate(true)}>
              <Pencil className="size-3.5" /> Alterar data
            </Button>
          </div>
        )}
      </div>
      <datalist id="cidades">
        {ctx.recentDestinations.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <p className="text-sm text-ink-3">Cliente e valor do frete são registrados pelo gestor — você não precisa informar.</p>
      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button type="submit" variant="primary" size="lg" loading={start.isPending}>
          Iniciar viagem
        </Button>
        <Button size="lg" variant="ghost" onClick={() => navigate('/motorista')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function ActiveTrip({ trip }: { trip: Trip }) {
  const navigate = useNavigate()
  const update = useUpdateTripKm()
  const finish = useFinishTrip()
  const current = trip.lastKm ?? trip.startKm
  const [km, setKm] = useState('')
  const [error, setError] = useState<string>()
  const parsed = parseIntegerBR(km)

  function validate() {
    if (!km.trim() || !(parsed > 0)) return 'Informe o km do hodômetro. Use só números.'
    if (parsed < trip.startKm) return `O km não pode ser menor que o da saída (${formatKm(trip.startKm)}).`
    return undefined
  }

  async function run(kind: 'update' | 'finish') {
    const err = validate()
    setError(err)
    if (err) return
    try {
      if (kind === 'update') {
        await update.mutateAsync({ tripId: trip.id, km: parsed })
        toast.success('Km da viagem atualizado.')
      } else {
        await finish.mutateAsync({ tripId: trip.id, endKm: parsed, endDate: todayISO() })
        toast.success('Viagem encerrada. O gestor vai registrar o frete.')
      }
      navigate('/motorista')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-navy-50 p-4">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <MapPin className="size-4 text-go-700" aria-hidden /> {trip.origin} → {trip.destination}
        </p>
        <dl className="num mt-2 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-ink-3">Saída</dt>
            <dd className="font-semibold">{formatDate(trip.startDate)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Km na saída</dt>
            <dd className="font-semibold">{formatKm(trip.startKm)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Rodados até agora</dt>
            <dd className="font-semibold">{formatKm(current - trip.startKm)}</dd>
          </div>
        </dl>
      </div>
      <Field
        label="Km do hodômetro agora"
        error={error}
        hint={`Último informado: ${formatKm(current)}${parsed > trip.startKm ? ` · viagem com ${formatKm(parsed - trip.startKm)}` : ''}`}
      >
        {(p) => (
          <Input
            {...p}
            value={km}
            onChange={(e) => setKm(e.target.value)}
            inputMode="numeric"
            suffix="km"
            containerClassName="max-w-xs"
            autoFocus
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button variant="primary" size="lg" onClick={() => run('finish')} loading={finish.isPending}>
          Encerrar viagem
        </Button>
        <Button size="lg" onClick={() => run('update')} loading={update.isPending}>
          Só atualizar o km
        </Button>
      </div>
    </div>
  )
}
