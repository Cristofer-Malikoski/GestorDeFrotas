import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { useSession } from '@/auth/session'
import { FuelForm } from '@/features/shared/FuelForm'
import { ExpenseForm } from '@/features/shared/ExpenseForm'

export function DriverPageShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div>
      <Link to="/motorista" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Voltar ao início
      </Link>
      <h1 className="font-display text-[28px] leading-tight font-extrabold">{title}</h1>
      {description && <p className="mt-1 text-ink-3">{description}</p>}
      <Card className="mt-6 p-5 sm:p-6">{children}</Card>
    </div>
  )
}

export function DriverFuelPageImpl() {
  const { session } = useSession()
  const navigate = useNavigate()
  return (
    <DriverPageShell title="Registrar abastecimento" description="Já preenchemos o que sabemos. Confira e salve.">
      <FuelForm
        actor="motorista"
        fixedVehicleId={session?.vehicleId}
        driverId={session?.userId}
        onDone={() => navigate('/motorista')}
        onCancel={() => navigate('/motorista')}
      />
    </DriverPageShell>
  )
}

export function DriverExpensePageImpl() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  return (
    <DriverPageShell title="Registrar despesa" description="Escolha o tipo e informe o valor.">
      <ExpenseForm
        actor="motorista"
        fixedVehicleId={session?.vehicleId}
        driverId={session?.userId}
        initialCategory={params.get('categoria') ?? undefined}
        onDone={() => navigate('/motorista')}
        onCancel={() => navigate('/motorista')}
      />
    </DriverPageShell>
  )
}
