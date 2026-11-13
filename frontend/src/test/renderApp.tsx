import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders, routes } from '@/App'
import { sessionFor } from '@/auth/session'
import { createMockRepository } from '@/data/mock/mockRepository'
import type { Role } from '@/domain/types'
import type { FleetRepository } from '@/data/repository'
import { todayISO } from '@/lib/dates'

/** Renderiza o app completo em memória, com o adapter mock sem latência nem persistência. */
export function renderApp(path: string, role?: Role, repo?: FleetRepository) {
  const repository = repo ?? createMockRepository({ latency: 0, persist: false, today: todayISO() })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const utils = render(
    <AppProviders repository={repository} initialSession={role ? sessionFor(role) : null}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...utils, user, router, repository }
}
