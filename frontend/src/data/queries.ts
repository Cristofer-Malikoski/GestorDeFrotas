import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepository } from './RepositoryProvider'
import type { EntryFilter, UploadDocumentInput } from './repository'
import type {
  CreateOptions,
  ExpenseCategory,
  ExpenseInput,
  Freight,
  FuelInput,
  ReviewDecision,
  StartTripInput,
} from '@/domain/types'

export const keys = {
  vehicles: ['vehicles'] as const,
  drivers: ['drivers'] as const,
  trips: (f?: EntryFilter) => ['trips', f ?? {}] as const,
  fuel: (f?: EntryFilter) => ['fuel', f ?? {}] as const,
  expenses: (f?: EntryFilter) => ['expenses', f ?? {}] as const,
  categories: ['categories'] as const,
  review: ['review'] as const,
  documents: ['documents'] as const,
  report: ['report'] as const,
}

/** Tudo que depende de lançamentos/viagens é invalidado junto após qualquer escrita. */
const OPERATIONAL = ['trips', 'fuel', 'expenses', 'review', 'documents', 'report', 'vehicles']

function useInvalidateOperational() {
  const qc = useQueryClient()
  return () => Promise.all(OPERATIONAL.map((k) => qc.invalidateQueries({ queryKey: [k] })))
}

export const useVehicles = () => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.vehicles, queryFn: () => repo.listVehicles() })
}
export const useDrivers = () => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.drivers, queryFn: () => repo.listDrivers() })
}
export const useTrips = (f?: EntryFilter) => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.trips(f), queryFn: () => repo.listTrips(f) })
}
export const useFuel = (f?: EntryFilter) => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.fuel(f), queryFn: () => repo.listFuel(f) })
}
export const useExpenses = (f?: EntryFilter) => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.expenses(f), queryFn: () => repo.listExpenses(f) })
}
export const useCategories = () => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.categories, queryFn: () => repo.listCategories() })
}
export const useReviewQueue = () => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.review, queryFn: () => repo.listReviewQueue() })
}
export const useDocuments = () => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.documents, queryFn: () => repo.listDocuments() })
}
export const useReportData = () => {
  const repo = useRepository()
  return useQuery({ queryKey: keys.report, queryFn: () => repo.getReportData() })
}

export function useCreateFuel() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ input, options }: { input: FuelInput; options: CreateOptions }) => repo.createFuel(input, options),
    onSuccess: (r) => (r.status === 'created' ? invalidate() : undefined),
  })
}

export function useCreateExpense() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ input, options }: { input: ExpenseInput; options: CreateOptions }) =>
      repo.createExpense(input, options),
    onSuccess: (r) => (r.status === 'created' ? invalidate() : undefined),
  })
}

export function useUpdateEntry() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FuelInput & ExpenseInput> }) => repo.updateEntry(id, patch),
    onSuccess: () => invalidate(),
  })
}

export function useDeleteEntry() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({ mutationFn: (id: string) => repo.deleteEntry(id), onSuccess: () => invalidate() })
}

export function useReview() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ReviewDecision }) => repo.review(id, decision),
    onSuccess: () => invalidate(),
  })
}

export function useStartTrip() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({ mutationFn: (input: StartTripInput) => repo.startTrip(input), onSuccess: () => invalidate() })
}

export function useCreateTrip() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: (input: Parameters<typeof repo.createTrip>[0]) => repo.createTrip(input),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateTripKm() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ tripId, km }: { tripId: string; km: number }) => repo.updateTripKm(tripId, km),
    onSuccess: () => invalidate(),
  })
}

export function useFinishTrip() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ tripId, endKm, endDate }: { tripId: string; endKm: number; endDate: string }) =>
      repo.finishTrip(tripId, endKm, endDate),
    onSuccess: () => invalidate(),
  })
}

export function useSetFreight() {
  const repo = useRepository()
  const invalidate = useInvalidateOperational()
  return useMutation({
    mutationFn: ({ tripId, freight }: { tripId: string; freight: Freight }) => repo.setFreight(tripId, freight),
    onSuccess: () => invalidate(),
  })
}

export function useCreateCategory() {
  const repo = useRepository()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<ExpenseCategory, 'id'>) => repo.createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.categories }),
  })
}

export function useUploadDocument() {
  const repo = useRepository()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => repo.uploadDocument(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.documents }),
  })
}
