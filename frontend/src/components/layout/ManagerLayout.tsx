import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  ChartColumn,
  ClipboardCheck,
  Files,
  Fuel,
  LayoutDashboard,
  LogOut,
  Receipt,
  Route,
  Truck,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { useSession } from '@/auth/session'
import { useReviewQueue } from '@/data/queries'
import { DemoBanner } from '@/features/shared/DemoBanner'
import { ManagerFiltersProvider } from '@/features/manager/filters'
import { cn } from '@/lib/cn'

function Item({ to, icon, children, end, badge }: { to: string; icon: ReactNode; children: ReactNode; end?: boolean; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-md px-3 py-2 text-[15px] font-medium transition-colors [&_svg]:size-[18px]',
          isActive ? 'bg-navy-700 text-white' : 'text-navy-200 hover:bg-navy-800 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn(isActive ? 'text-go-400' : 'text-navy-200 group-hover:text-white')}>{icon}</span>
          <span className="flex-1">{children}</span>
          {!!badge && (
            <span className="num rounded-full bg-amber-400 px-2 text-xs leading-5 font-bold text-navy-900" aria-label={`${badge} pendentes`}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export function ManagerLayout() {
  const { session, signOut } = useSession()
  const navigate = useNavigate()
  const queue = useReviewQueue()
  return (
    <ManagerFiltersProvider>
      <div className="min-h-screen bg-canvas lg:pl-64">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Pular para o conteúdo
        </a>
        <aside className="on-dark no-print flex flex-col bg-navy-900 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64">
          <div className="px-5 pt-5 pb-4">
            <NavLink to="/gestor" aria-label="Fretuno — painel">
              <Logo variant="negative" className="h-7" />
            </NavLink>
          </div>
          <nav aria-label="Navegação do gestor" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
            <div>
              <p className="px-3 pb-1.5 text-xs font-semibold tracking-wider text-navy-200/80 uppercase">Acompanhar</p>
              <div className="space-y-0.5">
                <Item to="/gestor" end icon={<LayoutDashboard />}>
                  Painel
                </Item>
                <Item to="/gestor/conferencia" icon={<ClipboardCheck />} badge={queue.data?.length}>
                  Conferir lançamentos
                </Item>
                <Item to="/gestor/relatorios" icon={<ChartColumn />}>
                  Relatórios
                </Item>
              </div>
            </div>
            <div>
              <p className="px-3 pb-1.5 text-xs font-semibold tracking-wider text-navy-200/80 uppercase">Operar</p>
              <div className="space-y-0.5">
                <Item to="/gestor/viagens" icon={<Route />}>
                  Viagens e fretes
                </Item>
                <Item to="/gestor/abastecimentos" icon={<Fuel />}>
                  Abastecimentos
                </Item>
                <Item to="/gestor/despesas" icon={<Receipt />}>
                  Despesas
                </Item>
                <Item to="/gestor/veiculos" icon={<Truck />}>
                  Veículos
                </Item>
                <Item to="/gestor/documentos" icon={<Files />}>
                  Documentos
                </Item>
              </div>
            </div>
          </nav>
          <div className="border-t border-navy-700 px-5 py-4 text-sm">
            <p className="font-semibold">{session?.name}</p>
            <p className="text-navy-200">Gestor</p>
            <button
              type="button"
              onClick={() => {
                signOut()
                navigate('/entrar')
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md py-1 text-navy-200 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden /> Trocar perfil
            </button>
          </div>
        </aside>
        <div className="flex min-h-screen flex-col">
          <DemoBanner />
          <main id="conteudo" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ManagerFiltersProvider>
  )
}
