import { lazy, Suspense, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import { Toaster } from 'sonner'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import type { FleetRepository } from '@/data/repository'
import { SessionProvider, useSession, type Session } from '@/auth/session'
import type { Role } from '@/domain/types'
import { LoginPage } from '@/features/landing/LoginPage'
import { NotFoundPage } from '@/features/landing/NotFoundPage'
import { LoadingBlock } from '@/components/ui/feedback'
import { DriverLayout } from '@/components/layout/DriverLayout'
import { ManagerLayout } from '@/components/layout/ManagerLayout'

const LandingPage = lazy(() => import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })))
const DriverHome = lazy(() => import('@/features/driver/DriverHome').then((m) => ({ default: m.DriverHome })))
const DriverFuelPage = lazy(() => import('@/features/driver/DriverFuelPage').then((m) => ({ default: m.DriverFuelPage })))
const DriverExpensePage = lazy(() => import('@/features/driver/DriverExpensePage').then((m) => ({ default: m.DriverExpensePage })))
const DriverTripPage = lazy(() => import('@/features/driver/DriverTripPage').then((m) => ({ default: m.DriverTripPage })))
const DriverEntriesPage = lazy(() => import('@/features/driver/DriverEntriesPage').then((m) => ({ default: m.DriverEntriesPage })))
const DashboardPage = lazy(() => import('@/features/manager/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ReviewPage = lazy(() => import('@/features/manager/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const TripsPage = lazy(() => import('@/features/manager/TripsPage').then((m) => ({ default: m.TripsPage })))
const FuelPage = lazy(() => import('@/features/manager/FuelPage').then((m) => ({ default: m.FuelPage })))
const ExpensesPage = lazy(() => import('@/features/manager/ExpensesPage').then((m) => ({ default: m.ExpensesPage })))
const VehiclesPage = lazy(() => import('@/features/manager/VehiclesPage').then((m) => ({ default: m.VehiclesPage })))
const ReportsPage = lazy(() => import('@/features/manager/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const DocumentsPage = lazy(() => import('@/features/manager/DocumentsPage').then((m) => ({ default: m.DocumentsPage })))

/** Divide o bundle por tela: cada página carrega só quando visitada. */
function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingBlock rows={5} />}>{children}</Suspense>
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/entrar" replace />
  if (session.role !== role) return <Navigate to={session.role === 'motorista' ? '/motorista' : '/gestor'} replace />
  return <>{children}</>
}

export const routes: RouteObject[] = [
  { path: '/', element: <Lazy><LandingPage /></Lazy> },
  { path: '/entrar', element: <LoginPage /> },
  {
    path: '/motorista',
    element: (
      <RequireRole role="motorista">
        <DriverLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Lazy><DriverHome /></Lazy> },
      { path: 'abastecer', element: <Lazy><DriverFuelPage /></Lazy> },
      { path: 'despesa', element: <Lazy><DriverExpensePage /></Lazy> },
      { path: 'viagem', element: <Lazy><DriverTripPage /></Lazy> },
      { path: 'lancamentos', element: <Lazy><DriverEntriesPage /></Lazy> },
    ],
  },
  {
    path: '/gestor',
    element: (
      <RequireRole role="gestor">
        <ManagerLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Lazy><DashboardPage /></Lazy> },
      { path: 'conferencia', element: <Lazy><ReviewPage /></Lazy> },
      { path: 'viagens', element: <Lazy><TripsPage /></Lazy> },
      { path: 'abastecimentos', element: <Lazy><FuelPage /></Lazy> },
      { path: 'despesas', element: <Lazy><ExpensesPage /></Lazy> },
      { path: 'veiculos', element: <Lazy><VehiclesPage /></Lazy> },
      { path: 'relatorios', element: <Lazy><ReportsPage /></Lazy> },
      { path: 'documentos', element: <Lazy><DocumentsPage /></Lazy> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]

export function AppProviders({
  repository,
  children,
  initialSession,
}: {
  repository: FleetRepository
  children: ReactNode
  initialSession?: Session | null
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <RepositoryProvider repository={repository}>
        <SessionProvider initial={initialSession}>
          {children}
          <Toaster
            position="bottom-right"
            closeButton
            duration={6000}
            toastOptions={{ classNames: { toast: 'font-sans', actionButton: '!bg-navy-900 !text-white !font-semibold' } }}
          />
        </SessionProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  )
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function App({ repository }: { repository: FleetRepository }) {
  const [router] = useState(() => createBrowserRouter(routes, { basename }))
  return (
    <AppProviders repository={repository}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

