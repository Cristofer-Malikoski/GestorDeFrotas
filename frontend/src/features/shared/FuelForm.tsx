import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Camera, Keyboard, Paperclip, Pencil, ScanText, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { ChoiceGroup } from '@/components/ui/choice'
import { Field, Input, Select } from '@/components/ui/field'
import { useRepository } from '@/data/RepositoryProvider'
import { useCreateFuel, useDeleteEntry, useUploadDocument, useVehicles } from '@/data/queries'
import { FUEL_TYPE_LABEL, ISSUE_LABEL } from '@/domain/labels'
import { PRICE_DEVIATION } from '@/domain/rules'
import type { DocumentFile, Entry, FuelEntry, FuelType, Role } from '@/domain/types'
import { nowISO } from '@/lib/dates'
import {
  formatDateTime,
  formatKm,
  formatKmPerLiter,
  formatPricePerLiter,
} from '@/lib/format'
import { parseDecimalBR, parseIntegerBR } from '@/lib/parse'
import { cn } from '@/lib/cn'
import { DocumentPreview } from './DocumentPreview'
import { DuplicateDialog } from './DuplicateDialog'
import { useEntryContext } from './useEntryContext'

const schema = z.object({
  vehicleId: z.string().min(1, 'Escolha o veículo.'),
  date: z.string().min(1, 'Informe a data e a hora.'),
  station: z.string().trim().min(2, 'Informe o nome do posto.'),
  liters: z.string().refine((v) => {
    const n = parseDecimalBR(v)
    return n > 0 && n <= 1500
  }, 'Informe os litros. Exemplo: 312,5'),
  total: z.string().refine((v) => {
    const n = parseDecimalBR(v)
    return n > 0 && n <= 30000
  }, 'Informe o valor total pago. Exemplo: 1.935,40'),
  odometerKm: z
    .string()
    .refine((v) => !v.trim() || parseIntegerBR(v) > 0, 'Use só números. Exemplo: 523120'),
  fuelType: z.enum(['diesel_s10', 'diesel_s500', 'arla32']),
  confirmUncertain: z.boolean(),
})
type FormValues = z.infer<typeof schema>

type Method = 'digitar' | 'comprovante'

export function FuelForm({
  actor,
  fixedVehicleId,
  driverId,
  onDone,
  onCancel,
}: {
  actor: Role
  /** Motorista: veículo vinculado (não editável). Gestor: undefined = escolher. */
  fixedVehicleId?: string
  driverId?: string
  onDone: (entry: FuelEntry) => void
  onCancel: () => void
}) {
  const vehicles = useVehicles()
  const isMock = useRepository().kind === 'mock'
  const [method, setMethod] = useState<Method>('digitar')
  const [doc, setDoc] = useState<DocumentFile | null>(null)
  const [localImage, setLocalImage] = useState<string>()
  const [showMore, setShowMore] = useState(false)
  const [duplicates, setDuplicates] = useState<Entry[] | null>(null)
  const prefilled = useRef<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleId: fixedVehicleId ?? '',
      date: nowISO(),
      station: '',
      liters: '',
      total: '',
      odometerKm: '',
      fuelType: 'diesel_s10',
      confirmUncertain: false,
    },
  })
  const { register, handleSubmit, watch, setValue, formState, setError } = form
  const vehicleId = watch('vehicleId')
  const ctx = useEntryContext(vehicleId || undefined)

  // Pré-preenche o que o sistema já sabe assim que o contexto do veículo carrega.
  useEffect(() => {
    // Espera veículo E histórico carregarem; senão o posto anterior não seria sugerido.
    if (!ctx.vehicle || ctx.isLoading || prefilled.current === ctx.vehicle.id) return
    prefilled.current = ctx.vehicle.id
    setValue('fuelType', ctx.vehicle.fuelType)
    if (!form.getValues('station') && ctx.lastFuel) setValue('station', ctx.lastFuel.station)
  }, [ctx.vehicle, ctx.isLoading, ctx.lastFuel, setValue, form])

  useEffect(() => () => (localImage ? URL.revokeObjectURL(localImage) : undefined), [localImage])

  const upload = useUploadDocument()
  const create = useCreateFuel()
  const undo = useDeleteEntry()

  const liters = parseDecimalBR(watch('liters'))
  const total = parseDecimalBR(watch('total'))
  const km = watch('odometerKm') ? parseIntegerBR(watch('odometerKm')) : NaN
  const ppl = liters > 0 && total > 0 ? total / liters : null
  const kmSinceLast = ctx.lastFuelWithKm?.odometerKm != null && km > 0 ? km - ctx.lastFuelWithKm.odometerKm : null
  const consumption = kmSinceLast && kmSinceLast > 0 && liters > 0 ? kmSinceLast / liters : null
  const priceOff = ppl && ctx.recentPrice ? Math.abs(ppl - ctx.recentPrice) / ctx.recentPrice > PRICE_DEVIATION : false
  const kmBelow = km > 0 && ctx.lastKm != null && km < ctx.lastKm
  const uncertainFields = doc?.extraction?.fields.filter((f) => f.confidence === 'baixa') ?? []
  const uncertainKeys = new Set(uncertainFields.map((f) => f.key))

  const pendingReasons = useMemo(() => {
    const r: string[] = []
    if (!watch('odometerKm')?.trim()) r.push(ISSUE_LABEL.km_ausente.toLowerCase())
    if (!doc) r.push(ISSUE_LABEL.sem_comprovante.toLowerCase())
    if (uncertainFields.length) r.push('leitura incerta')
    if (kmBelow) r.push('km menor que o anterior')
    if (priceOff) r.push('preço fora do padrão')
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch('odometerKm'), doc, uncertainFields.length, kmBelow, priceOff])

  async function attach(file: File | null, useSample: boolean) {
    if (!vehicleId) {
      setError('vehicleId', { message: 'Escolha o veículo antes de anexar o comprovante.' })
      return
    }
    if (file && file.type.startsWith('image/')) setLocalImage(URL.createObjectURL(file))
    else setLocalImage(undefined)
    const d = await upload.mutateAsync({
      kind: 'cupom_combustivel',
      vehicleId,
      fileName: file?.name ?? 'comprovante-exemplo.jpg',
      useSample,
      file: file ?? undefined,
    })
    setDoc(d)
    if (useSample && d.extraction) {
      setLocalImage(undefined)
      // A data/hora do cupom substitui "agora": não pedir de novo o que o documento já diz.
      if (d.synthetic?.date && d.extraction.fields.some((f) => f.key === 'date')) {
        setValue('date', d.synthetic.date.slice(0, 16), { shouldValidate: true })
      }
      for (const f of d.extraction.fields) {
        if (f.key === 'station') setValue('station', f.value, { shouldValidate: true })
        if (f.key === 'liters') setValue('liters', f.value, { shouldValidate: true })
        if (f.key === 'total') setValue('total', f.value, { shouldValidate: true })
      }
      setValue('confirmUncertain', false)
    }
  }

  function removeDoc() {
    setDoc(null)
    setLocalImage(undefined)
    setValue('confirmUncertain', false)
  }

  async function save(values: FormValues, allowDuplicate = false) {
    if (uncertainFields.length && !values.confirmUncertain) {
      setError('confirmUncertain', { message: 'Confira os campos destacados com o comprovante e marque a confirmação.' })
      return
    }
    const vehicle = ctx.vehicle
    const result = await create.mutateAsync({
      input: {
        vehicleId: values.vehicleId,
        driverId: driverId ?? vehicle?.driverId,
        tripId: ctx.activeTrip?.id,
        date: values.date,
        station: values.station.trim(),
        liters: parseDecimalBR(values.liters),
        total: parseDecimalBR(values.total),
        odometerKm: values.odometerKm.trim() ? parseIntegerBR(values.odometerKm) : undefined,
        fuelType: values.fuelType as FuelType,
        documentId: doc?.id,
        source: doc?.extraction ? 'comprovante' : 'manual',
        hadUncertainFields: uncertainFields.length > 0,
        confirmedUncertain: values.confirmUncertain,
      },
      options: { actor, allowDuplicate },
    })
    if (result.status === 'possible_duplicate') {
      setDuplicates(result.matches)
      return
    }
    setDuplicates(null)
    const entry = result.entry
    const pending = entry.status === 'pendente'
    toast.success(pending ? 'Abastecimento registrado — pendente de conferência' : 'Abastecimento registrado', {
      description: pending ? `Motivo: ${entry.issues.map((i) => ISSUE_LABEL[i.code].toLowerCase()).join(', ')}.` : undefined,
      action: {
        label: 'Desfazer',
        onClick: () => undo.mutate(entry.id, { onSuccess: () => toast('Abastecimento desfeito.') }),
      },
    })
    onDone(entry)
  }

  const onSubmit = handleSubmit((v) => save(v).catch((e: Error) => toast.error(e.message)))
  const errors = formState.errors

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Contexto que o sistema já sabe */}
      {fixedVehicleId ? (
        <ContextLine ctx={ctx} />
      ) : (
        <Field label="Veículo" error={errors.vehicleId?.message}>
          {(p) => (
            <Select {...p} {...register('vehicleId')}>
              <option value="">Escolha o veículo</option>
              {vehicles.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.model}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <ChoiceGroup<Method>
        name="method"
        legend="Como você quer informar?"
        columns={2}
        size="lg"
        value={method}
        onChange={(m) => {
          setMethod(m)
          if (m === 'digitar' && doc?.extraction) removeDoc()
        }}
        options={[
          { value: 'digitar', label: 'Digitar valores', description: 'Litros, valor e km', icon: <Keyboard className="size-5" /> },
          {
            value: 'comprovante',
            label: 'Usar foto do comprovante',
            description: 'Preenchemos para você conferir',
            icon: <Camera className="size-5" />,
          },
        ]}
      />

      {method === 'comprovante' && !doc && (
        <div className="rounded-lg border-2 border-dashed border-line-strong bg-surface p-5">
          <p className="font-semibold">Envie a foto do cupom do posto</p>
          {isMock ? (
            <p className="mt-1 text-sm text-ink-3">
              <strong className="font-semibold text-amber-700">Demonstração:</strong> nenhuma leitura real é feita. Para ver como
              funciona, usamos um comprovante de exemplo — inclusive com um campo difícil de ler.
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-3">Lemos o cupom e preenchemos os campos para você conferir antes de salvar.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {isMock && (
              <Button variant="dark" onClick={() => attach(null, true)} loading={upload.isPending}>
                <ScanText /> Usar comprovante de exemplo
              </Button>
            )}
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-[15px] font-semibold hover:bg-sunken has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-info-600">
              <Paperclip className="size-4" aria-hidden />
              Escolher arquivo
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => attach(e.target.files?.[0] ?? null, true)}
              />
            </label>
          </div>
        </div>
      )}

      <div className={cn('grid gap-6', doc && method === 'comprovante' && 'lg:grid-cols-[minmax(0,280px)_1fr]')}>
        {doc && method === 'comprovante' && (
          <div className="space-y-2">
            <DocumentPreview doc={doc} localImageUrl={localImage} />
            <Button size="sm" variant="ghost" onClick={removeDoc}>
              Trocar comprovante
            </Button>
          </div>
        )}

        <div className="space-y-5">
          {doc?.extraction && (
            <Callout tone="warn" title={doc.extraction.simulated ? 'Leitura simulada — confira antes de salvar' : 'Leitura automática — confira antes de salvar'}>
              {doc.extraction.simulated ? (
                <>
                  Os valores abaixo são de um <strong>comprovante de exemplo</strong>, não da sua imagem.
                </>
              ) : (
                <>Os valores abaixo foram lidos do documento e podem ter erros.</>
              )}
              {uncertainFields.length > 0 && (
                <> Campos destacados ficaram com leitura incerta: {uncertainFields.map((f) => f.label.toLowerCase()).join(', ')}.</>
              )}
            </Callout>
          )}

          <div className={cn('grid gap-4', !(doc && method === 'comprovante') && 'sm:grid-cols-2')}>
            <Field
              label="Litros"
              error={errors.liters?.message}
              hint={uncertainKeys.has('liters') ? 'Leitura incerta: confira no comprovante.' : undefined}
            >
              {(p) => (
                <Input
                  {...p}
                  {...register('liters')}
                  inputMode="decimal"
                  autoComplete="off"
                  suffix="L"
                  placeholder="0,0"
                  className={cn(uncertainKeys.has('liters') && 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/40')}
                  autoFocus={method === 'digitar'}
                />
              )}
            </Field>
            <Field label="Valor total pago" error={errors.total?.message}>
              {(p) => <Input {...p} {...register('total')} inputMode="decimal" autoComplete="off" suffix="R$" placeholder="0,00" />}
            </Field>
            <Field
              label="Km do hodômetro"
              optional
              error={errors.odometerKm?.message}
              hint={ctx.lastKm ? `Último registrado: ${formatKm(ctx.lastKm)}` : undefined}
            >
              {(p) => <Input {...p} {...register('odometerKm')} inputMode="numeric" autoComplete="off" suffix="km" />}
            </Field>
            <Field label="Posto" error={errors.station?.message} hint={
                doc?.extraction
                  ? 'Lido do comprovante.'
                  : ctx.lastFuel && watch('station') === ctx.lastFuel.station
                    ? 'Preenchido com o último posto usado.'
                    : undefined
              }>
              {(p) => (
                <>
                  <Input {...p} {...register('station')} list={`${p.id}-list`} autoComplete="off" />
                  <datalist id={`${p.id}-list`}>
                    {ctx.recentStations.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          </div>

          {showMore ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data e hora" error={errors.date?.message}>
                {(p) => <Input {...p} type="datetime-local" {...register('date')} />}
              </Field>
              <Field label="Combustível">
                {(p) => (
                  <Select {...p} {...register('fuelType')}>
                    {Object.entries(FUEL_TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          ) : (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
              <span>
                {formatDateTime(watch('date'))} · {FUEL_TYPE_LABEL[watch('fuelType') as FuelType]}
              </span>
              <Button variant="link" size="sm" onClick={() => setShowMore(true)}>
                <Pencil className="size-3.5" /> Alterar data ou combustível
              </Button>
            </p>
          )}

          {method === 'digitar' && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {doc ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-ink-2">
                    <Paperclip className="size-4" aria-hidden /> {doc.fileName}
                  </span>
                  <Button size="sm" variant="ghost" onClick={removeDoc}>
                    Remover
                  </Button>
                </>
              ) : (
                <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-info-700 underline underline-offset-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-info-600">
                  <Paperclip className="size-4" aria-hidden /> Anexar comprovante (opcional)
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => attach(e.target.files?.[0] ?? null, false)} />
                </label>
              )}
            </div>
          )}

          {/* Resumo calculado antes de salvar */}
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm">
            <Summary label="Preço por litro" value={ppl ? formatPricePerLiter(ppl) : '—'} warn={priceOff} />
            <Summary label="Km desde o último" value={kmSinceLast != null ? formatKm(kmSinceLast) : '—'} warn={kmBelow} />
            <Summary label="Consumo" value={consumption ? formatKmPerLiter(consumption) : '—'} />
          </dl>
          {(priceOff || kmBelow) && (
            <ul className="space-y-1 text-sm text-amber-700">
              {priceOff && ctx.recentPrice && (
                <li className="flex gap-1.5">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Preço por litro diferente da média recente ({formatPricePerLiter(ctx.recentPrice)}). Confira o valor e os litros.
                </li>
              )}
              {kmBelow && ctx.lastKm && (
                <li className="flex gap-1.5">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  O km está menor que o último registrado ({formatKm(ctx.lastKm)}). Confira o hodômetro.
                </li>
              )}
            </ul>
          )}

          {uncertainFields.length > 0 && (
            <div>
              <label className="flex items-start gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-[15px]">
                <input type="checkbox" {...register('confirmUncertain')} className="mt-1 size-5 accent-navy-900" />
                <span>
                  <strong>Conferi os campos destacados com o comprovante.</strong>
                  <span className="block text-sm text-ink-2">O gestor também verá o documento ao conferir.</span>
                </span>
              </label>
              {errors.confirmUncertain && (
                <p className="mt-1.5 text-[13px] font-medium text-bad-700">{errors.confirmUncertain.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {pendingReasons.length > 0 && (
        <p className="text-sm text-ink-3">
          Pode salvar assim. Vai ficar <strong className="text-amber-700">pendente de conferência</strong>: {pendingReasons.join(', ')}.
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button type="submit" variant="primary" size="lg" loading={create.isPending} className="min-w-40">
          Salvar abastecimento
        </Button>
        <Button size="lg" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <DuplicateDialog
        open={!!duplicates}
        matches={duplicates ?? []}
        saving={create.isPending}
        onCancel={() => setDuplicates(null)}
        onConfirm={() => save(form.getValues(), true).catch((e: Error) => toast.error(e.message))}
      />
    </form>
  )
}

function Summary({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('bg-surface px-3 py-2.5', warn && 'bg-amber-50')}>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={cn('num mt-0.5 font-semibold', warn && 'text-amber-700')}>{value}</dd>
    </div>
  )
}

function ContextLine({ ctx }: { ctx: ReturnType<typeof useEntryContext> }) {
  if (!ctx.vehicle) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-navy-50 px-4 py-3 text-sm">
      <span>
        <span className="text-ink-3">Veículo </span>
        <strong className="font-semibold">{ctx.vehicle.plate}</strong> · {ctx.vehicle.model}
      </span>
      {ctx.activeTrip ? (
        <span>
          <span className="text-ink-3">Viagem </span>
          <strong className="font-semibold">
            {ctx.activeTrip.origin} → {ctx.activeTrip.destination}
          </strong>
        </span>
      ) : (
        <span className="text-ink-3">Sem viagem em andamento</span>
      )}
    </div>
  )
}
