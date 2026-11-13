import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useVehicles } from '@/data/queries'
import { addMonths, currentMonth } from '@/lib/dates'
import { formatMonthTitle } from '@/lib/format'
import { Select } from '@/components/ui/field'
import { cn } from '@/lib/cn'

interface Filters {
  vehicleId: string | undefined
  month: string
  setVehicleId: (v: string | undefined) => void
  setMonth: (m: string) => void
}

const Ctx = createContext<Filters | null>(null)
const KEY = 'fretuno-gestor-filtros'

/** Veículo e mês são filtros persistentes do gestor (não abas copiadas como na planilha). */
export function ManagerFiltersProvider({ children }: { children: ReactNode }) {
  const stored = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { vehicleId?: string; month?: string } | null
    } catch {
      return null
    }
  })()
  const [vehicleId, setVehicleId] = useState<string | undefined>(stored?.vehicleId)
  // Abre no último mês fechado: o mês corrente ainda está incompleto.
  const [month, setMonth] = useState<string>(stored?.month ?? addMonths(currentMonth(), -1))
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ vehicleId, month }))
    } catch {
      /* ignora */
    }
  }, [vehicleId, month])
  const value = useMemo(() => ({ vehicleId, month, setVehicleId, setMonth }), [vehicleId, month])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useManagerFilters() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useManagerFilters fora de ManagerFiltersProvider')
  return ctx
}

export function VehicleFilter({ allowAll = true }: { allowAll?: boolean }) {
  const { vehicleId, setVehicleId } = useManagerFilters()
  const vehicles = useVehicles()
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink-3">Veículo</span>
      <Select
        className="h-10 min-w-56"
        value={vehicleId ?? ''}
        onChange={(e) => setVehicleId(e.target.value || undefined)}
      >
        {allowAll && <option value="">Todos os veículos</option>}
        {vehicles.data?.map((v) => (
          <option key={v.id} value={v.id}>
            {v.plate} — {v.model}
          </option>
        ))}
      </Select>
    </label>
  )
}

export function MonthFilter() {
  const { month, setMonth } = useManagerFilters()
  const max = currentMonth()
  const min = addMonths(max, -11)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink-3" id="mes-label">
        Mês
      </span>
      <div className="flex h-10 items-center rounded-md border border-line-strong bg-surface" role="group" aria-labelledby="mes-label">
        <button
          type="button"
          className="flex h-full w-10 items-center justify-center rounded-l-md text-ink-2 hover:bg-sunken disabled:opacity-40"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= min}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className={cn('num min-w-44 px-2 text-center text-[15px] font-semibold')} aria-live="polite">
          {formatMonthTitle(month)}
        </span>
        <button
          type="button"
          className="flex h-full w-10 items-center justify-center rounded-r-md text-ink-2 hover:bg-sunken disabled:opacity-40"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= max}
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
