import { createContext, useContext, type ReactNode } from 'react'
import type { FleetRepository } from './repository'

const RepositoryContext = createContext<FleetRepository | null>(null)

export function RepositoryProvider({ repository, children }: { repository: FleetRepository; children: ReactNode }) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
}

export function useRepository() {
  const repo = useContext(RepositoryContext)
  if (!repo) throw new Error('useRepository precisa estar dentro de <RepositoryProvider>.')
  return repo
}
