import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { useSession } from '@/auth/session'
import { useVehicles } from '@/data/queries'
import { DemoBanner } from '@/features/shared/DemoBanner'
import { cn } from '@/lib/cn'

export function DriverLayout() {
  const { session, signOut } = useSession()
  const vehicles = useVehicles()
  const navigate = useNavigate()
  const vehicle = vehicles.data?.find((v) => v.id === session?.vehicleId)
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative px-1 py-3 text-[15px] font-semibold transition-colors',
      isActive ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-go-400' : 'text-navy-200 hover:text-white',
    )
  return (
    <div className="min-h-screen bg-canvas">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <DemoBanner />
      <header className="on-dark bg-navy-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-3 sm:px-6">
          <Link to="/motorista" aria-label="Fretuno — início do motorista">
            <Logo variant="negative" className="h-7" />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-right sm:block">
              <span className="block font-semibold">{session?.name}</span>
              {vehicle && <span className="block text-navy-200">{vehicle.plate} · Motorista</span>}
            </span>
            <button
              type="button"
              onClick={() => {
                signOut()
                navigate('/entrar')
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-navy-200 hover:bg-navy-800 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden /> Trocar perfil
            </button>
          </div>
        </div>
        <nav aria-label="Navegação do motorista" className="mx-auto flex max-w-3xl gap-6 px-4 sm:px-6">
          <NavLink to="/motorista" end className={tab}>
            Início
          </NavLink>
          <NavLink to="/motorista/lancamentos" className={tab}>
            Meus lançamentos
          </NavLink>
        </nav>
      </header>
      <main id="conteudo" className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
