import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Fuel, Trash2, Undo2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Field, Input, Textarea } from '@/components/ui/field'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { useCategories, useDocuments, useDrivers, useExpenses, useFuel, useReview, useReviewQueue, useVehicles } from '@/data/queries'
import { ISSUE_LABEL } from '@/domain/labels'
import type { Entry, ReviewDecision } from '@/domain/types'
import { formatDateTime, formatDecimal, formatInt, formatKm, formatLiters, formatMoney, formatPricePerLiter } from '@/lib/format'
import { parseDecimalBR, parseIntegerBR } from '@/lib/parse'
import { cn } from '@/lib/cn'
import { CategoryIcon } from '@/features/shared/categoryIcons'
import { DocumentPreview } from '@/features/shared/DocumentPreview'
import { IssueTags, StatusBadge } from '@/features/shared/status'

export function ReviewPage() {
  const queue = useReviewQueue()
  const [selectedId, setSelectedId] = useState<string>()
  const items = useMemo(() => queue.data ?? [], [queue.data])
  const selected = items.find((e) => e.id === selectedId) ?? items[0]

  return (
    <div>
      <PageHeader
        title="Conferir lançamentos"
        description={
          items.length
            ? `${items.length} lançamento${items.length > 1 ? 's' : ''} aguardando você. Os mais importantes aparecem primeiro.`
            : 'Lançamentos com alguma dúvida aparecem aqui para você decidir.'
        }
      />
      <QueryState query={queue}>
        {items.length === 0 ? (
          <Card>
            <EmptyState title="Tudo conferido" icon={<CheckCircle2 className="size-6 text-go-700" aria-hidden />}>
              Quando um lançamento chegar com dúvida — duplicidade, leitura incerta, falta de comprovante ou de km — ele aparece aqui.
            </EmptyState>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <Card className="h-fit overflow-hidden">
              <ul aria-label="Fila de conferência" className="divide-y divide-line">
                {items.map((e) => (
                  <QueueItem key={e.id} entry={e} active={e.id === selected?.id} onSelect={() => setSelectedId(e.id)} />
                ))}
              </ul>
            </Card>
            {selected && (
              <ReviewDetail
                key={selected.id}
                entry={selected}
                onDone={() => {
                  const idx = items.findIndex((e) => e.id === selected.id)
                  setSelectedId(items[idx + 1]?.id ?? items[idx - 1]?.id)
                }}
              />
            )}
          </div>
        )}
      </QueryState>
    </div>
  )
}

function useLookups() {
  const vehicles = useVehicles()
  const drivers = useDrivers()
  const categories = useCategories()
  return {
    plate: (id: string) => vehicles.data?.find((v) => v.id === id)?.plate ?? '—',
    driver: (id?: string) => (id ? (drivers.data?.find((d) => d.id === id)?.name ?? '—') : 'Gestor'),
    category: (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Despesa',
  }
}

function QueueItem({ entry, active, onSelect }: { entry: Entry; active: boolean; onSelect: () => void }) {
  const l = useLookups()
  const value = entry.kind === 'abastecimento' ? entry.total : entry.value
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={cn('flex w-full gap-3 px-4 py-3.5 text-left hover:bg-canvas', active && 'bg-navy-50 shadow-[inset_3px_0_0_var(--color-navy-900)]')}
      >
        <span className="mt-0.5 text-slate" aria-hidden>
          {entry.kind === 'abastecimento' ? <Fuel className="size-5" /> : <CategoryIcon id={entry.categoryId} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex justify-between gap-2">
            <span className="truncate font-semibold">{entry.kind === 'abastecimento' ? entry.station : l.category(entry.categoryId)}</span>
            <span className="num font-semibold">{formatMoney(value)}</span>
          </span>
          <span className="block text-sm text-ink-3">
            {l.plate(entry.vehicleId)} · {formatDateTime(entry.date)}
          </span>
          {entry.resubmittedAt && <span className="mt-1 block text-sm font-medium text-info-700">Corrigido pelo motorista</span>}
          <IssueTags issues={entry.issues} className="mt-1.5" />
        </span>
      </button>
    </li>
  )
}

function ReviewDetail({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const l = useLookups()
  const docs = useDocuments()
  const fuel = useFuel()
  const expenses = useExpenses()
  const review = useReview()
  const doc = docs.data?.find((d) => d.id === entry.documentId)
  const dupIssue = entry.issues.find((i) => i.code === 'possivel_duplicado')
  const related = dupIssue ? [...(fuel.data ?? []), ...(expenses.data ?? [])].find((e) => e.id === dupIssue.relatedEntryId) : undefined
  const uncertain = entry.issues.some((i) => i.code === 'leitura_incerta')

  const [form, setForm] = useState(() =>
    entry.kind === 'abastecimento'
      ? { liters: formatDecimal(entry.liters, 1), total: formatDecimal(entry.total), km: entry.odometerKm ? formatInt(entry.odometerKm) : '', description: '' }
      : { liters: '', total: formatDecimal(entry.value), km: '', description: entry.description ?? '' },
  )
  const [checked, setChecked] = useState(false)
  const [returning, setReturning] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string>()

  const total = parseDecimalBR(form.total)
  const liters = parseDecimalBR(form.liters)
  const changed =
    entry.kind === 'abastecimento'
      ? total !== entry.total || liters !== entry.liters || (form.km ? parseIntegerBR(form.km) : undefined) !== entry.odometerKm
      : total !== entry.value || (form.description || undefined) !== entry.description

  async function decide(decision: ReviewDecision, message: string) {
    try {
      await review.mutateAsync({ id: entry.id, decision })
      toast.success(message)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function approve() {
    if (!(total > 0) || (entry.kind === 'abastecimento' && !(liters > 0))) return setError('Confira os valores: precisam ser números maiores que zero.')
    if (uncertain && !checked) return setError('Confirme que conferiu os valores com o documento antes de aprovar.')
    setError(undefined)
    const patch: ReviewDecision['patch'] = changed
      ? entry.kind === 'abastecimento'
        ? { liters, total, odometerKm: form.km.trim() ? parseIntegerBR(form.km) : undefined }
        : { value: total, description: form.description.trim() || undefined }
      : undefined
    decide({ action: 'aprovar', patch }, changed ? 'Corrigido e aprovado.' : 'Lançamento aprovado.')
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">
            {entry.kind === 'abastecimento' ? 'Abastecimento' : 'Despesa'} · {l.plate(entry.vehicleId)} · {l.driver(entry.driverId)}
          </p>
          <h2 className="font-display text-xl font-extrabold">
            {entry.kind === 'abastecimento' ? entry.station : l.category(entry.categoryId)}
          </h2>
          <p className="text-sm text-ink-2">{formatDateTime(entry.date)}</p>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <ul className="mt-5 space-y-2">
        {entry.issues.map((i) => (
          <li key={i.code}>
            <Callout tone="warn" title={ISSUE_LABEL[i.code]}>
              {i.message}
            </Callout>
          </li>
        ))}
        {entry.resubmittedAt && (
          <li>
            <Callout tone="info" title="Corrigido pelo motorista">
              Reenviado em {formatDateTime(entry.resubmittedAt)} após a sua devolução.
            </Callout>
          </li>
        )}
      </ul>

      {related && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Comparar com o lançamento parecido</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CompareBox title="Este lançamento" entry={entry} highlight />
            <CompareBox title="Já registrado antes" entry={related} />
          </div>
        </div>
      )}

      <div className={cn('mt-6 grid gap-6', doc && 'xl:grid-cols-[minmax(0,300px)_1fr]')}>
        {doc && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-2">Documento anexado</h3>
            <DocumentPreview doc={doc} />
            {doc.extraction && (
              <table className="mt-3 w-full text-sm">
                <caption className="mb-1 text-left text-xs text-ink-3">Leitura simulada (demonstração)</caption>
                <tbody>
                  {doc.extraction.fields.map((f) => (
                    <tr key={f.key} className="border-t border-line">
                      <th scope="row" className="py-1.5 text-left font-medium">{f.label}</th>
                      <td className="num py-1.5 text-right">{f.value}</td>
                      <td className="py-1.5 pl-2 text-right">
                        <span className={cn('text-xs font-semibold', f.confidence === 'baixa' ? 'text-amber-700' : 'text-go-700')}>
                          {f.confidence === 'baixa' ? 'incerta' : 'ok'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-ink-2">Valores do lançamento — corrija se precisar</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {entry.kind === 'abastecimento' && (
              <Field label="Litros">
                {(p) => <Input {...p} value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} inputMode="decimal" suffix="L" className={cn(uncertain && 'border-amber-400 bg-amber-50')} />}
              </Field>
            )}
            <Field label={entry.kind === 'abastecimento' ? 'Valor total' : 'Valor'}>
              {(p) => <Input {...p} value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} inputMode="decimal" suffix="R$" />}
            </Field>
            {entry.kind === 'abastecimento' && (
              <Field label="Km do hodômetro" optional>
                {(p) => <Input {...p} value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} inputMode="numeric" suffix="km" />}
              </Field>
            )}
            {entry.kind === 'abastecimento' && liters > 0 && total > 0 && (
              <div className="flex flex-col justify-end pb-2 text-sm">
                <span className="text-ink-3">Preço por litro</span>
                <span className="num font-semibold">{formatPricePerLiter(total / liters)}</span>
              </div>
            )}
            {entry.kind === 'despesa' && (
              <Field label="Descrição" className="sm:col-span-2">
                {(p) => <Textarea {...p} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />}
              </Field>
            )}
          </div>

          {uncertain && (
            <label className="flex items-start gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-[15px]">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 size-5 accent-navy-900" />
              <span>
                <strong>Conferi litros e valor com o documento.</strong>
                <span className="block text-sm text-ink-2">Exigido porque a leitura do comprovante ficou incerta.</span>
              </span>
            </label>
          )}

          {error && (
            <p className="text-sm font-medium text-bad-700" role="alert">
              {error}
            </p>
          )}

          {returning ? (
            <div className="space-y-3 rounded-lg border border-line p-4">
              <Field label="O que o motorista precisa corrigir?" hint="Ele verá esta mensagem na tela inicial.">
                {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus />}
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="dark"
                  loading={review.isPending}
                  onClick={() => {
                    if (!reason.trim()) return setError('Escreva o motivo da devolução.')
                    decide({ action: 'devolver', reason }, 'Devolvido ao motorista.')
                  }}
                >
                  <Undo2 /> Devolver ao motorista
                </Button>
                <Button variant="ghost" onClick={() => setReturning(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button variant="primary" size="lg" onClick={approve} loading={review.isPending}>
                <CheckCircle2 /> {changed ? 'Corrigir e aprovar' : 'Aprovar'}
              </Button>
              {entry.driverId && (
                <Button size="lg" onClick={() => setReturning(true)}>
                  <Undo2 /> Devolver ao motorista
                </Button>
              )}
              {dupIssue && (
                <Button size="lg" variant="danger-outline" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Excluir duplicado
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        layout="center"
        title="Excluir este lançamento?"
        description="Ele sai dos totais e não pode ser recuperado. O lançamento original continua."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Manter</Button>
            <Button variant="danger" loading={review.isPending} onClick={() => decide({ action: 'excluir' }, 'Duplicado excluído.')}>
              Excluir duplicado
            </Button>
          </>
        }
      >
        <CompareBox title="Será excluído" entry={entry} highlight />
      </Sheet>
    </Card>
  )
}

function CompareBox({ title, entry, highlight }: { title: string; entry: Entry; highlight?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3 text-sm', highlight ? 'border-amber-400 bg-amber-50' : 'border-line')}>
      <p className="font-semibold">{title}</p>
      <dl className="num mt-1.5 grid grid-cols-2 gap-y-0.5">
        <dt className="text-ink-3">Data</dt>
        <dd>{formatDateTime(entry.date)}</dd>
        <dt className="text-ink-3">Valor</dt>
        <dd className="font-semibold">{formatMoney(entry.kind === 'abastecimento' ? entry.total : entry.value)}</dd>
        {entry.kind === 'abastecimento' && (
          <>
            <dt className="text-ink-3">Litros</dt>
            <dd>{formatLiters(entry.liters)}</dd>
            <dt className="text-ink-3">Km</dt>
            <dd>{entry.odometerKm ? formatKm(entry.odometerKm) : '—'}</dd>
          </>
        )}
        <dt className="text-ink-3">Comprovante</dt>
        <dd>{entry.documentId ? 'Sim' : 'Não'}</dd>
      </dl>
    </div>
  )
}
