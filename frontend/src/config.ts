/** Configuração por ambiente (Vite). Ver .env.example. */
export type DataSource = 'mock' | 'api'

export const config = {
  dataSource: (import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'mock') as DataSource,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  basePath: import.meta.env.BASE_URL,
}

export const isDemo = config.dataSource === 'mock'
