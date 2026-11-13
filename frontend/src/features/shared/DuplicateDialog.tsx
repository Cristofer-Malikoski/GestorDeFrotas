import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { Entry } from '@/domain/types'
import { formatDateTime, formatLiters, formatMoney } from '@/lib/format'
import { StatusBadge } from './status'

/** Confirmação de possível duplicidade — o usuário decide, o sistema não bloqueia. */
export function DuplicateDialog({
  matches,
  open,
  onCancel,
  onConfirm,
  saving,
  categoryName,
}: {
  matches: Entry[]
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  saving?: boolean
  categoryName?: (id: string) => string
}) {
  const kindLabel = matches[0]?.kind === 'abastecimento' ? 'abastecimento' : 'despesa'
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      layout="center"
      title="Parece que isso já foi registrado"
      description={`Encontramos ${matches.length === 1 ? 'um lançamento' : 'lançamentos'} com o mesmo valor, no mesmo dia e veículo.`}
      footer={
        <>
          <Button onClick={onCancel}>Não salvar</Button>
          <Button variant="dark" onClick={onConfirm} loading={saving}>
            É outro {kindLabel} — salvar
          </Button>
        </>
      }
    >
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id} className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {m.kind === 'abastecimento' ? m.station : (categoryName?.(m.categoryId) ?? 'Despesa')}
              </p>
              <StatusBadge status={m.status} short />
            </div>
            <p className="num mt-1 text-sm text-ink-2">
              {formatDateTime(m.date)} · {m.kind === 'abastecimento' ? `${formatLiters(m.liters)} · ` : ''}
              <strong>{formatMoney(m.kind === 'abastecimento' ? m.total : m.value)}</strong>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-3">
        Se salvar mesmo assim, o lançamento vai para a conferência do gestor marcado como possível duplicidade.
      </p>
    </Sheet>
  )
}
