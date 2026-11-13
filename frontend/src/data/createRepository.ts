import { config } from '@/config'
import { createHttpRepository } from './http/httpRepository'
import { createMockRepository } from './mock/mockRepository'
import type { FleetRepository } from './repository'

export function createRepository(): FleetRepository {
  if (config.dataSource === 'api') {
    return createHttpRepository(config.apiBaseUrl, () => sessionStorage.getItem('fretuno-token'))
  }
  return createMockRepository()
}
