import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Paperclip } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Field, Input, Textarea } from '@/components/ui/field'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { useUpdateEntry, useUploadDocument } from '@/data/queries'
import type { Entry, EntryStatus } from '@/domain/types'
import { formatDecimal, formatInt } from '@/lib/format'
import { parseDecimalBR, parseIntegerBR } from '@/lib/parse'
import { cn } from '@/lib/cn'
import { useDriverData } from './useDriverData'
import { EntryRow, entryTitle } from './EntryRow'

type Kind = 'todos' | 'abastecimento' | 'despesa'
type StatusFilter = 'todos' | EntryStatus

export function DriverEntriesPage() {
  const d = useDriverData()
  const [params, setParams] = useSearchParams()
  const [kind, setKind] = useState<Kind>('todos')
  const [status, setStatus] = useState<StatusFilter>('todos')
  const editingId = params.get('corrigir')
  const editing = d.entries.find((e) => e.id === editingId)

  const list = d.entries.filter((e) => (kind === 'todos' || e.kind === kind) && (status === 'todos' || e.status === status))
  const count = (s: EntryStatus) => d.entries.filter((e) => e.status === s).length

  return (
    <div>
      <h1 className="font-display text-[28px] leading-tight font-extrabold">Meus lançamentos</h1>
      <p className="mt-1 text-ink-3">Acompanhe o que já foi conferido pelo gestor e corrija o que for pedido.</p>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
        <Pills
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            ['todos', 'Todos'],
            ['abastecimento', 'Abastecimentos'],
            ['despesa', 'Despesas'],
          ]}
        />
        <Pills
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            ['todos', 'Todos'],
            ['pendente', `Pendentes (${count('pendente')})`],
            ['devolvido', `Para corrigir (${count('devolvido')})`],
            ['aprovado', 'Aprovados'],
          ]}
        />
      </div>

      <Card className="mt-4">
        <QueryState query={d}>
          {list.length ? (
            <ul className="divide-y divide-line">
              {list.slice(0, 60).map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  categories={d.categories}
                  action={
                    e.status === 'devolvido' || e.status === 'pendente' ? (
                      <Button size="sm" variant={e.status === 'devolvido' ? 'dark' : 'secondary'} onClick={() => setParams({ corrigir: e.id })}>
                        {e.status === 'devolvido' ? 'Corrigir e reenviar' : 'Completar informações'}
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhum lançamento com esse filtro">Mude o tipo ou o estado para ver outros lançamentos.</EmptyState>
          )}
          {list.length > 60 && <p className="border-t border-line px-5 py-3 text-sm text-ink-3">Mostrando os 60 mais recentes.</p>}
        </QueryState>
      </Card>

      {editing && (
        <CorrectionSheet
          entry={editing}
          title={entryTitle(editing, d.categories)}
          onClose={() => setParams({})}
        />
      )}
    </div>
  )
}

function Pills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm font-semibold text-ink-3">{label}:</span>
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm font-medium',
            value === v ? 'border-navy-900 bg-navy-900 text-white' : 'border-line-strong bg-surface text-ink-2 hover:border-slate',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/** Correção simples: só os campos que podem estar errados + anexo. */
function CorrectionSheet({ entry, title, onClose }: { entry: Entry; title: string; onClose: () => void }) {
  const update = useUpdateEntry()
  const upload = useUploadDocument()
  const [documentId, setDocumentId] = useState(entry.documentId)
  const [fileName, setFileName] = useState<string>()
  const [values, setValues] = useState(() =>
    entry.kind === 'abastecimento'
      ? { liters: formatDecimal(entry.liters, 1), total: formatDecimal(entry.total), km: entry.odometerKm ? formatInt(entry.odometerKm) : '', description: '' }
      : { liters: '', total: formatDecimal(entry.value), km: '', description: entry.description ?? '' },
  )
  const [error, setError] = useState<string>()

  async function save() {
    const total = parseDecimalBR(values.total)
    if (!(total > 0)) return setError('Informe um valor válido. Exemplo: 1.250,00')
    const patch =
      entry.kind === 'abastecimento'
        ? {
            liters: parseDecimalBR(values.liters),
            total,
            odometerKm: values.km.trim() ? parseIntegerBR(values.km) : undefined,
            documentId,
          }
        : { value: total, description: values.description.trim() || undefined, documentId }
    if (entry.kind === 'abastecimento' && !(patch.liters! > 0)) return setError('Informe os litros. Exemplo: 312,5')
    setError(undefined)
    try {
      const updated = await update.mutateAsync({ id: entry.id, patch })
      toast.success(updated.status === 'pendente' ? 'Correção enviada — segue para conferência' : 'Correção salva')
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title="Corrigir lançamento"
      description={title}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} loading={update.isPending}>
            Salvar correção
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {entry.returnReason && (
          <p className="rounded-md bg-bad-50 px-3 py-2 text-sm">
            <strong className="text-bad-700">Pedido do gestor:</strong> {entry.returnReason}
          </p>
        )}
        {entry.kind === 'abastecimento' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Litros">
              {(p) => <Input {...p} value={values.liters} onChange={(e) => setValues({ ...values, liters: e.target.value })} inputMode="decimal" suffix="L" />}
            </Field>
            <Field label="Km do hodômetro" optional>
              {(p) => <Input {...p} value={values.km} onChange={(e) => setValues({ ...values, km: e.target.value })} inputMode="numeric" suffix="km" />}
            </Field>
          </div>
        )}
        <Field label={entry.kind === 'abastecimento' ? 'Valor total pago' : 'Valor'} error={error}>
          {(p) => <Input {...p} value={values.total} onChange={(e) => setValues({ ...values, total: e.target.value })} inputMode="decimal" suffix="R$" />}
        </Field>
        {entry.kind === 'despesa' && (
          <Field label="Descrição">
            {(p) => <Textarea {...p} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} rows={2} />}
          </Field>
        )}
        <div className="text-sm">
          {documentId ? (
            <p className="inline-flex items-center gap-1.5 text-ink-2">
              <Paperclip className="size-4" aria-hidden /> {fileName ?? 'Comprovante anexado'}
            </p>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-info-700 underline underline-offset-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-info-600">
              <Paperclip className="size-4" aria-hidden /> Anexar comprovante
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const d = await upload.mutateAsync({ kind: entry.kind === 'abastecimento' ? 'cupom_combustivel' : 'recibo', vehicleId: entry.vehicleId, fileName: f.name, useSample: false })
                  setDocumentId(d.id)
                  setFileName(f.name)
                }}
              />
            </label>
          )}
        </div>
      </div>
    </Sheet>
  )
}
