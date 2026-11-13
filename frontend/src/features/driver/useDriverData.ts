import { useMemo } from 'react'
import { useSession } from '@/auth/session'
import { useCategories, useExpenses, useFuel, useTrips, useVehicles } from '@/data/queries'
import type { Entry } from '@/domain/types'

/** Somente a operação do próprio motorista (veículo vinculado e lançamentos dele). */
export function useDriverData() {
  const { session } = useSession()
  const vehicleId = session?.vehicleId
  const driverId = session?.userId
  const vehicles = useVehicles()
  const trips = useTrips({ vehicleId, driverId })
  const fuel = useFuel({ vehicleId, driverId })
  const expenses = useExpenses({ vehicleId, driverId })
  const categories = useCategories()

  return useMemo(() => {
    const entries: Entry[] = [...(fuel.data ?? []), ...(expenses.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))
    return {
      session,
      vehicleId,
      driverId,
      vehicle: vehicles.data?.find((v) => v.id === vehicleId),
      activeTrip: trips.data?.find((t) => t.status === 'em_andamento'),
      trips: trips.data ?? [],
      entries,
      categories: categories.data ?? [],
      isPending: vehicles.isPending || trips.isPending || fuel.isPending || expenses.isPending,
      isError: vehicles.isError || trips.isError || fuel.isError || expenses.isError,
      error: vehicles.error ?? trips.error ?? fuel.error ?? expenses.error,
      refetch: () => Promise.all([vehicles.refetch(), trips.refetch(), fuel.refetch(), expenses.refetch()]),
    }
  }, [session, vehicleId, driverId, vehicles, trips, fuel, expenses, categories])
}
