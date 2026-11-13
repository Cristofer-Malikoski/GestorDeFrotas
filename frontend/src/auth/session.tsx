/**
 * Sessão DEMONSTRATIVA: não há autenticação real. O perfil escolhido fica só nesta aba.
 * A autenticação real dependerá do backend (ver docs/product/api-needs.md).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Role } from '@/domain/types'
import { DEMO_USERS } from '@/data/mock/fixtures'

export interface Session {
  role: Role
  userId: string
  name: string
  /** veículo vinculado (motorista) */
  vehicleId?: string
}

interface SessionContextValue {
  session: Session | null
  signIn: (role: Role) => Session
  signOut: () => void
}

const KEY = 'fretuno-demo-session'
const SessionContext = createContext<SessionContextValue | null>(null)

export function sessionFor(role: Role): Session {
  return role === 'motorista'
    ? { role, userId: DEMO_USERS.motorista.id, name: DEMO_USERS.motorista.name, vehicleId: DEMO_USERS.motorista.vehicleId }
    : { role, userId: DEMO_USERS.gestor.id, name: DEMO_USERS.gestor.name }
}

function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children, initial }: { children: ReactNode; initial?: Session | null }) {
  const [session, setSession] = useState<Session | null>(() => (initial !== undefined ? initial : readStored()))
  const signIn = useCallback((role: Role) => {
    const s = sessionFor(role)
    setSession(s)
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignora */
    }
    return s
  }, [])
  const signOut = useCallback(() => {
    setSession(null)
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignora */
    }
  }, [])
  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>.')
  return ctx
}
