import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  description,
  actions,
  filters,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-6 space-y-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] leading-tight font-extrabold text-ink">{title}</h1>
          {description && <p className="mt-1 text-[15px] text-ink-3">{description}</p>}
        </div>
        {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {filters && <div className="no-print flex flex-wrap items-end gap-3">{filters}</div>}
    </header>
  )
}
