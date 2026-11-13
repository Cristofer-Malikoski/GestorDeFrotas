import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 transition-colors hover:border-slate focus:border-info-600 focus:outline-none focus:ring-2 focus:ring-info-600/25 aria-[invalid=true]:border-bad-600 aria-[invalid=true]:ring-bad-600/20 disabled:bg-sunken disabled:text-ink-3'

export interface ControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  className?: string
  children: (props: ControlProps) => ReactNode
}

/** Rótulo sempre visível, dica e erro associados ao campo (WCAG 1.3.1 / 3.3.1). */
export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-3">(opcional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-[13px] text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-[13px] font-medium text-bad-700">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { suffix?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, suffix, ...props }, ref) => {
  if (!suffix) return <input ref={ref} className={cn(control, 'h-11', className)} {...props} />
  return (
    <div className="relative">
      <input ref={ref} className={cn(control, 'h-11 pr-14', className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-3" aria-hidden>
        {suffix}
      </span>
    </div>
  )
})
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(control, 'min-h-20 py-2.5', className)} {...props} />,
)
Textarea.displayName = 'Textarea'

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2355687a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(control, 'h-11 appearance-none bg-no-repeat pr-9', className)}
      style={{ backgroundImage: chevron, backgroundPosition: 'right 10px center', backgroundSize: '16px', ...style }}
      {...props}
    />
  ),
)
Select.displayName = 'Select'
