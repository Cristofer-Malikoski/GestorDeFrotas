import { AlertTriangle, CheckCircle2, CircleDot, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ENTRY_STATUS_LABEL, ENTRY_STATUS_SHORT, ISSUE_LABEL, TRIP_STATUS_LABEL } from '@/domain/labels'
import type { EntryStatus, Issue, TripStatus } from '@/domain/types'
import { formatMoney, formatWhole } from '@/lib/format'
import { cn } from '@/lib/cn'

const STATUS_TONE = { registrado: 'neutral', pendente: 'warn', aprovado: 'ok', devolvido: 'bad' } as const
const STATUS_ICON = { registrado: CircleDot, pendente: AlertTriangle, aprovado: CheckCircle2, devolvido: Undo2 }

export function StatusBadge({ status, short }: { status: EntryStatus; short?: boolean }) {
  const Icon = STATUS_ICON[status]
  return (
    <Badge tone={STATUS_TONE[status]} title={ENTRY_STATUS_LABEL[status]}>
      <Icon aria-hidden />
      {short ? ENTRY_STATUS_SHORT[status] : ENTRY_STATUS_LABEL[status]}
    </Badge>
  )
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return (
    <Badge tone={status === 'em_andamento' ? 'info' : 'neutral'}>
      {status === 'em_andamento' ? <CircleDot aria-hidden /> : <CheckCircle2 aria-hidden />}
      {TRIP_STATUS_LABEL[status]}
    </Badge>
  )
}

export function IssueTags({ issues, className, inline }: { issues: Issue[]; className?: string; inline?: boolean }) {
  if (!issues.length) return null
  // Dentro de botões (fila de conferência) só cabe conteúdo inline: nada de <ul>.
  if (inline) {
    return (
      <span className={cn('flex flex-wrap gap-1.5', className)}>
        <span className="sr-only">Motivos: </span>
        {issues.map((i) => (
          <Badge key={i.code} tone="warn">
            {ISSUE_LABEL[i.code]}
          </Badge>
        ))}
      </span>
    )
  }
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label="Motivos da pendência">
      {issues.map((i) => (
        <li key={i.code}>
          <Badge tone="warn">{ISSUE_LABEL[i.code]}</Badge>
        </li>
      ))}
    </ul>
  )
}

/** Resultado financeiro com sinal e palavra — cor nunca é o único indicador. */
export function ResultValue({
  value,
  className,
  showLabel,
  whole,
}: {
  value: number
  className?: string
  showLabel?: boolean
  /** sem símbolo e sem centavos (tabelas largas) */
  whole?: boolean
}) {
  const negative = value < 0
  if (whole) {
    return (
      <span className={cn('num', negative ? 'text-bad-700' : 'text-go-800', className)}>
        {negative ? '−' : '+'}
        {formatWhole(Math.abs(value))}
      </span>
    )
  }
  return (
    <span className={cn('num', negative ? 'text-bad-700' : 'text-go-800', className)}>
      {negative ? '−' : '+'}
      {formatMoney(Math.abs(value)).replace('-', '')}
      {showLabel && <span className="ml-1.5 text-[0.8em] font-semibold">{negative ? 'prejuízo' : 'lucro'}</span>}
    </span>
  )
}
