import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Paperclip, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChoiceGroup } from '@/components/ui/choice'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { useCategories, useCreateExpense, useDeleteEntry, useUploadDocument, useVehicles } from '@/data/queries'
import { ISSUE_LABEL } from '@/domain/labels'
import { RECEIPT_REQUIRED_ABOVE } from '@/domain/rules'
import type { DocumentFile, Entry, ExpenseEntry, Role } from '@/domain/types'
import { nowISO } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { parseDecimalBR } from '@/lib/parse'
import { CategoryIcon } from './categoryIcons'
import { DuplicateDialog } from './DuplicateDialog'
import { useEntryContext } from './useEntryContext'

const schema = z.object({
  vehicleId: z.string().min(1, 'Escolha o veículo.'),
  categoryId: z.string().min(1, 'Escolha o tipo de despesa.'),
  value: z.string().refine((v) => {
    const n = parseDecimalBR(v)
    return n > 0 && n <= 200000
  }, 'Informe o valor. Exemplo: 87,40'),
  description: z.string(),
  date: z.string().min(1, 'Informe a data.'),
})
type FormValues = z.infer<typeof schema>

/** Uso frequente primeiro para o motorista. */
const DRIVER_ORDER = ['pedagio', 'alimentacao', 'estacionamento', 'oficina', 'lavagem', 'outros']

export function ExpenseForm({
  actor,
  fixedVehicleId,
  driverId,
  onDone,
  onCancel,
  initialCategory,
}: {
  actor: Role
  fixedVehicleId?: string
  driverId?: string
  onDone: (e: ExpenseEntry) => void
  onCancel: () => void
  initialCategory?: string
}) {
  const vehicles = useVehicles()
  const categories = useCategories()
  const [doc, setDoc] = useState<DocumentFile | null>(null)
  const [showDate, setShowDate] = useState(false)
  const [duplicates, setDuplicates] = useState<Entry[] | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleId: fixedVehicleId ?? '', categoryId: initialCategory ?? '', value: '', description: '', date: nowISO() },
  })
  const { register, handleSubmit, watch, setValue, setError, formState } = form
  const errors = formState.errors
  const vehicleId = watch('vehicleId')
  const categoryId = watch('categoryId')
  const ctx = useEntryContext(vehicleId || undefined)
  const create = useCreateExpense()
  const upload = useUploadDocument()
  const undo = useDeleteEntry()

  const available = (categories.data ?? []).filter((c) => actor === 'gestor' || c.driverCanUse)
  const ordered =
    actor === 'motorista'
      ? [...available].sort((a, b) => DRIVER_ORDER.indexOf(a.id) - DRIVER_ORDER.indexOf(b.id))
      : available
  const category = available.find((c) => c.id === categoryId)
  const value = parseDecimalBR(watch('value'))
  const needsReceipt =
    !doc && value > RECEIPT_REQUIRED_ABOVE && category && !['pedagio', 'estacionamento'].includes(category.id)

  useEffect(() => {
    if (categoryId) form.setFocus('value')
  }, [categoryId, form])

  async function attach(file: File | null) {
    if (!vehicleId) {
      setError('vehicleId', { message: 'Escolha o veículo antes de anexar.' })
      return
    }
    const d = await upload.mutateAsync({ kind: 'recibo', vehicleId, fileName: file?.name ?? 'recibo.jpg', useSample: false })
    setDoc(d)
  }

  async function save(values: FormValues, allowDuplicate = false) {
    if (category?.needsDescription && !values.description.trim()) {
      setError('description', { message: 'Descreva rapidamente o que foi pago.' })
      return
    }
    const result = await create.mutateAsync({
      input: {
        vehicleId: values.vehicleId,
        driverId: driverId ?? (actor === 'motorista' ? ctx.vehicle?.driverId : undefined),
        tripId: ctx.activeTrip?.id,
        date: values.date,
        categoryId: values.categoryId,
        description: values.description.trim() || undefined,
        value: parseDecimalBR(values.value),
        documentId: doc?.id,
        source: 'manual',
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
    toast.success(pending ? 'Despesa registrada — pendente de conferência' : 'Despesa registrada', {
      description: pending ? `Motivo: ${entry.issues.map((i) => ISSUE_LABEL[i.code].toLowerCase()).join(', ')}.` : undefined,
      action: { label: 'Desfazer', onClick: () => undo.mutate(entry.id, { onSuccess: () => toast('Despesa desfeita.') }) },
    })
    onDone(entry)
  }

  const onSubmit = handleSubmit((v) => save(v).catch((e: Error) => toast.error(e.message)))

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {!fixedVehicleId && (
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

      <ChoiceGroup
        name="categoryId"
        legend="O que você pagou?"
        columns={actor === 'motorista' ? 3 : 4}
        size="lg"
        value={categoryId || undefined}
        onChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
        error={errors.categoryId?.message}
        options={ordered.map((c) => ({ value: c.id, label: c.name, icon: <CategoryIcon id={c.id} /> }))}
      />

      {categoryId && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor" error={errors.value?.message}>
              {(p) => <Input {...p} {...register('value')} inputMode="decimal" autoComplete="off" suffix="R$" placeholder="0,00" />}
            </Field>
            {showDate ? (
              <Field label="Data e hora" error={errors.date?.message}>
                {(p) => <Input {...p} type="datetime-local" {...register('date')} />}
              </Field>
            ) : (
              <div className="flex flex-col justify-end pb-2 text-sm text-ink-2">
                <span>{formatDateTime(watch('date'))}</span>
                <Button variant="link" size="sm" className="self-start" onClick={() => setShowDate(true)}>
                  <Pencil className="size-3.5" /> Alterar data
                </Button>
              </div>
            )}
          </div>

          {(category?.needsDescription || actor === 'gestor') && (
            <Field
              label={category?.id === 'oficina' ? 'Qual serviço foi feito?' : 'Descrição'}
              optional={!category?.needsDescription}
              error={errors.description?.message}
            >
              {(p) => <Textarea {...p} {...register('description')} rows={2} />}
            </Field>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {doc ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-ink-2">
                  <Paperclip className="size-4" aria-hidden /> {doc.fileName}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setDoc(null)}>
                  Remover
                </Button>
              </>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-info-700 underline underline-offset-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-info-600">
                <Paperclip className="size-4" aria-hidden /> Anexar comprovante (opcional)
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => attach(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          {needsReceipt && (
            <p className="text-sm text-ink-3">
              Pode salvar sem comprovante. Despesas acima de R$ {RECEIPT_REQUIRED_ABOVE} sem comprovante ficam{' '}
              <strong className="text-amber-700">pendentes de conferência</strong>.
            </p>
          )}
          {ctx.activeTrip && (
            <p className="text-sm text-ink-3">
              Vai ser ligada à viagem {ctx.activeTrip.origin} → {ctx.activeTrip.destination}.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button type="submit" variant="primary" size="lg" loading={create.isPending} className="min-w-40">
          Salvar despesa
        </Button>
        <Button size="lg" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <DuplicateDialog
        open={!!duplicates}
        matches={duplicates ?? []}
        saving={create.isPending}
        categoryName={(id) => categories.data?.find((c) => c.id === id)?.name ?? 'Despesa'}
        onCancel={() => setDuplicates(null)}
        onConfirm={() => save(form.getValues(), true).catch((e: Error) => toast.error(e.message))}
      />
    </form>
  )
}
