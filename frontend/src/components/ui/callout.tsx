import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const callout = cva('flex gap-3 rounded-lg border px-4 py-3 text-[15px]', {
  variants: {
    tone: {
      info: 'border-info-600/25 bg-info-50 text-ink',
      warn: 'border-amber-400/70 bg-amber-50 text-ink',
      bad: 'border-bad-600/30 bg-bad-50 text-ink',
      ok: 'border-go-400/60 bg-go-50 text-ink',
    },
  },
  defaultVariants: { tone: 'info' },
})

const ICON = { info: Info, warn: AlertTriangle, bad: XCircle, ok: CheckCircle2 }
const ICON_COLOR = { info: 'text-info-600', warn: 'text-amber-700', bad: 'text-bad-600', ok: 'text-go-700' }

interface CalloutProps extends VariantProps<typeof callout> {
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
  role?: 'status' | 'alert'
}

export function Callout({ tone, title, children, action, className, role }: CalloutProps) {
  const t = tone ?? 'info'
  const Icon = ICON[t]
  return (
    <div className={cn(callout({ tone: t }), className)} role={role}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_COLOR[t])} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-ink-2', title ? 'mt-0.5' : undefined)}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}
