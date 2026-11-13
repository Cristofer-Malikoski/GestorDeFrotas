import type { ReactNode } from 'react'
import { Fuel } from 'lucide-react'
import type { Entry, ExpenseCategory } from '@/domain/types'
import { formatLiters, formatMoney, formatRelativeDay } from '@/lib/format'
import { todayISO } from '@/lib/dates'
import { CategoryIcon } from '@/features/shared/categoryIcons'
import { IssueTags, StatusBadge } from '@/features/shared/status'

export function entryTitle(e: Entry, categories: ExpenseCategory[]) {
  if (e.kind === 'abastecimento') return `Abastecimento · ${e.station}`
  const name = categories.find((c) => c.id === e.categoryId)?.name ?? 'Despesa'
  return e.description ? `${name} · ${e.description}` : name
}

/** Linha de lançamento usada nas listas do motorista. */
export function EntryRow({ entry, categories, action }: { entry: Entry; categories: ExpenseCategory[]; action?: ReactNode }) {
  const value = entry.kind === 'abastecimento' ? entry.total : entry.value
  return (
    <li className="flex gap-3 px-5 py-4">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-2" aria-hidden>
        {entry.kind === 'abastecimento' ? <Fuel className="size-5" /> : <CategoryIcon id={entry.categoryId} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="truncate font-semibold">{entryTitle(entry, categories)}</p>
          <p className="num font-semibold">{formatMoney(value)}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-3">
          <span>
            {formatRelativeDay(entry.date, todayISO())}
            {entry.date.length > 10 && ` às ${entry.date.slice(11, 16)}`}
            {entry.kind === 'abastecimento' && ` · ${formatLiters(entry.liters)}`}
          </span>
          <StatusBadge status={entry.status} short />
        </div>
        {entry.status === 'pendente' && <IssueTags issues={entry.issues} className="mt-2" />}
        {entry.status === 'devolvido' && entry.returnReason && (
          <p className="mt-2 rounded-md bg-bad-50 px-3 py-2 text-sm text-ink">
            <strong className="text-bad-700">Gestor pediu correção:</strong> {entry.returnReason}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </li>
  )
}
