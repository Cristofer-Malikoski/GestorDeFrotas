import type { ReactNode } from 'react'
import { AlertOctagon, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-sunken', className)} aria-hidden />
}

export function LoadingBlock({ label = 'Carregando…', rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 p-5">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn('h-10', i % 2 ? 'w-11/12' : 'w-full')} />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
  icon,
  className,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-3 rounded-full bg-sunken p-3 text-slate">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <p className="font-display text-base font-bold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-3">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Algo deu errado ao carregar os dados.'
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-bad-50 p-3 text-bad-600">
        <AlertOctagon className="size-6" aria-hidden />
      </div>
      <p className="font-display text-base font-bold">Não foi possível carregar</p>
      <p className="mt-1 max-w-md text-sm text-ink-3">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/** Renderiza estados de carregamento/erro de uma query de forma consistente. */
export function QueryState({
  query,
  children,
  rows,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }
  children: ReactNode
  rows?: number
}) {
  if (query.isPending) return <LoadingBlock rows={rows} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  return <>{children}</>
}
