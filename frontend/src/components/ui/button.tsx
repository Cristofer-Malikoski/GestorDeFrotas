import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-go-400 text-navy-900 hover:bg-go-500 active:bg-go-500',
        dark: 'bg-navy-900 text-white hover:bg-navy-700',
        secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken',
        ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
        danger: 'bg-bad-600 text-white hover:bg-bad-700',
        'danger-outline': 'border border-bad-600 text-bad-700 bg-surface hover:bg-bad-50',
        link: 'text-info-700 underline underline-offset-4 hover:text-info-600 px-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-sm [&_svg]:size-4',
        md: 'h-10 px-4 text-[15px] [&_svg]:size-4',
        lg: 'h-12 px-5 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, type, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        type={type ?? 'button'}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
