/**
 * ADAPTER HTTP — esqueleto para a API real.
 *
 * ATENÇÃO: contracts/openapi.yaml ainda não existia quando este arquivo foi escrito.
 * Os caminhos abaixo são PROVISÓRIOS, concentrados em `PATHS` para facilitar o ajuste
 * quando o contrato for publicado pelo backend. Ver docs/product/api-needs.md.
 */
import type { EntryFilter, FleetRepository } from '../repository'
import type { Entry } from '@/domain/types'

export const PATHS = {
  vehicles: '/vehicles',
  drivers: '/drivers',
  trips: '/trips',
  trip: (id: string) => `/trips/${id}`,
  tripFinish: (id: string) => `/trips/${id}/finish`,
  tripFreight: (id: string) => `/trips/${id}/freight`,
  fuel: '/fuel-entries',
  expenses: '/expenses',
  categories: '/expense-categories',
  entry: (id: string) => `/entries/${id}`,
  reviewQueue: '/entries/review-queue',
  review: (id: string) => `/entries/${id}/review`,
  documents: '/documents',
  reportData: '/reports/raw',
} as const

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function createHttpRepository(baseUrl: string, getToken?: () => string | null): FleetRepository {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body) headers.set('Content-Type', 'application/json')
    const token = getToken?.()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    let res: Response
    try {
      res = await fetch(`${baseUrl}${path}`, { ...init, headers })
    } catch {
      throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.')
    }
    if (!res.ok) {
      let message = `Erro ${res.status} ao falar com o servidor.`
      try {
        const body = await res.json()
        message = body.detail ?? body.message ?? message
      } catch {
        /* corpo não-JSON */
      }
      throw new ApiError(res.status, message)
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  }
  const qs = (f: EntryFilter = {}) => {
    const p = new URLSearchParams()
    if (f.vehicleId) p.set('vehicle_id', f.vehicleId)
    if (f.driverId) p.set('driver_id', f.driverId)
    if (f.month) p.set('month', f.month)
    const s = p.toString()
    return s ? `?${s}` : ''
  }
  const post = <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
  const patch = <T,>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })

  return {
    kind: 'api',
    listVehicles: () => request(PATHS.vehicles),
    listDrivers: () => request(PATHS.drivers),
    listTrips: (f) => request(PATHS.trips + qs(f)),
    startTrip: (input) => post(PATHS.trips, input),
    updateTripKm: (id, km) => patch(PATHS.trip(id), { lastKm: km }),
    finishTrip: (id, endKm, endDate) => post(PATHS.tripFinish(id), { endKm, endDate }),
    createTrip: (input) => post(PATHS.trips, input),
    setFreight: (id, freight) => request(PATHS.tripFreight(id), { method: 'PUT', body: JSON.stringify(freight) }),
    listFuel: (f) => request(PATHS.fuel + qs(f)),
    createFuel: (input, opts) => post(PATHS.fuel, { ...input, allowDuplicate: !!opts.allowDuplicate }),
    listExpenses: (f) => request(PATHS.expenses + qs(f)),
    createExpense: (input, opts) => post(PATHS.expenses, { ...input, allowDuplicate: !!opts.allowDuplicate }),
    listCategories: () => request(PATHS.categories),
    createCategory: (input) => post(PATHS.categories, input),
    updateEntry: (id, p) => patch<Entry>(PATHS.entry(id), p),
    deleteEntry: (id) => request(PATHS.entry(id), { method: 'DELETE' }),
    listReviewQueue: () => request(PATHS.reviewQueue),
    review: (id, decision) => post(PATHS.review(id), decision),
    listDocuments: () => request(PATHS.documents),
    // Upload real exigirá multipart/form-data com o arquivo; ver api-needs.md.
    uploadDocument: (input) => post(PATHS.documents, input),
    getReportData: () => request(PATHS.reportData),
  }
}
