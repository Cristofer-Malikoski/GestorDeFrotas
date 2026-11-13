import { useMemo } from 'react'
import { useFuel, useTrips, useVehicles } from '@/data/queries'
import { lastKnownKm, recentPricePerLiter } from '@/domain/rules'

/**
 * Tudo que o sistema já sabe sobre o veículo e pode pré-preencher num lançamento
 * (princípio 1: não pedir o que o sistema já sabe).
 */
export function useEntryContext(vehicleId: string | undefined) {
  const vehicles = useVehicles()
  const trips = useTrips(vehicleId ? { vehicleId } : undefined)
  const fuel = useFuel(vehicleId ? { vehicleId } : undefined)

  return useMemo(() => {
    const vehicle = vehicles.data?.find((v) => v.id === vehicleId)
    const vehicleFuel = (fuel.data ?? []).filter((f) => f.vehicleId === vehicleId)
    const vehicleTrips = (trips.data ?? []).filter((t) => t.vehicleId === vehicleId)
    const activeTrip = vehicleTrips.find((t) => t.status === 'em_andamento')
    const sorted = [...vehicleFuel].filter((f) => f.status !== 'devolvido').sort((a, b) => b.date.localeCompare(a.date))
    const lastFuel = sorted[0]
    const lastFuelWithKm = sorted.find((f) => f.odometerKm != null)
    const recentStations = [...new Set(sorted.map((f) => f.station))].slice(0, 6)
    return {
      isLoading: vehicles.isPending || trips.isPending || fuel.isPending,
      vehicle,
      activeTrip,
      lastFuel,
      lastFuelWithKm,
      lastKm: vehicle ? lastKnownKm(vehicle, vehicleFuel, vehicleTrips) : undefined,
      recentPrice: vehicleId ? recentPricePerLiter(vehicleId, vehicleFuel) : undefined,
      recentStations,
      recentDestinations: [...new Set(vehicleTrips.flatMap((t) => [t.destination, t.origin]))].slice(0, 8),
      lastTrip: vehicleTrips.find((t) => t.status === 'concluida'),
    }
  }, [vehicles.data, trips.data, fuel.data, vehicles.isPending, trips.isPending, fuel.isPending, vehicleId])
}
