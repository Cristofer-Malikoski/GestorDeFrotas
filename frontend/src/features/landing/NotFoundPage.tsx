import { Link } from 'react-router'
import { LogoSymbol } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <LogoSymbol className="size-14" />
      <h1 className="mt-6 font-display text-3xl font-extrabold">Essa rota não existe</h1>
      <p className="mt-2 max-w-md text-ink-2">O endereço pode ter mudado. Volte para o início e continue de lá.</p>
      <Button asChild variant="dark" size="lg" className="mt-6">
        <Link to="/">Ir para o início</Link>
      </Button>
    </main>
  )
}
