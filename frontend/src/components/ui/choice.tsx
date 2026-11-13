import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ChoiceOption<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
  icon?: ReactNode
}

/** Opções como botões grandes, com radio nativo por baixo (teclado e leitores de tela). */
export function ChoiceGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 3,
  size = 'md',
  error,
}: {
  name: string
  legend: ReactNode
  options: ChoiceOption<T>[]
  value: T | undefined
  onChange: (v: T) => void
  columns?: 2 | 3 | 4
  size?: 'md' | 'lg'
  error?: string
}) {
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[columns]
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{legend}</legend>
      <div className={cn('grid gap-2', cols)}>
        {options.map((o) => {
          const checked = value === o.value
          return (
            <label
              key={o.value}
              className={cn(
                'relative flex cursor-pointer items-center gap-2.5 rounded-lg border bg-surface px-3 text-[15px] font-medium transition-colors',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-info-600',
                size === 'lg' ? 'min-h-14 py-2' : 'min-h-11 py-1.5',
                checked ? 'border-navy-900 bg-navy-50 ring-1 ring-navy-900' : 'border-line-strong hover:border-slate',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.icon && <span className={cn('shrink-0', checked ? 'text-navy-900' : 'text-slate')}>{o.icon}</span>}
              <span className="min-w-0">
                <span className="block leading-tight">{o.label}</span>
                {o.description && <span className="block text-[13px] font-normal text-ink-3">{o.description}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {error && <p className="mt-1.5 text-[13px] font-medium text-bad-700">{error}</p>}
    </fieldset>
  )
}
