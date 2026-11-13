import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createHttpRepository, mapExtraction, mapFuel, mapTrip } from '../httpRepository'

/** Respostas no formato do contrato (contracts/openapi.yaml, commit 1dca59b). */
type Route = (url: URL, init: RequestInit) => { status?: number; body?: unknown }

function mockFetch(routes: Record<string, Route>) {
  const calls: { method: string; path: string; body?: unknown; auth?: string | null }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input)
      const method = init.method ?? 'GET'
      const key = `${method} ${url.pathname}`
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
      calls.push({ method, path: url.pathname + url.search, body, auth: new Headers(init.headers).get('Authorization') })
      const route = routes[key]
      const r = route ? route(url, init) : { status: 404, body: { error: { code: 'not_found', message: 'Não encontrado' }, request_id: 'x' } }
      return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status ?? 200 })
    }),
  )
  return calls
}

const page = <T,>(items: T[]) => ({ items, total: items.length, offset: 0, limit: 100 })
const fueling = {
  id: 'f1',
  review_status: 'pending',
  vehicle_id: 'v1',
  driver_id: 'd1',
  occurred_on: '2026-11-10',
  liters: '300.50',
  amount_cents: 186310,
  station: 'Posto X',
  odometer_km: null,
  document_id: null,
  unit_price: '6.2',
}

afterEach(() => vi.unstubAllGlobals())

describe('adapter HTTP × contrato OpenAPI', () => {
  const repo = () => createHttpRepository('http://api.test', () => 'tok')

  it('converte centavos e decimais em texto; pendente vira "pendente" com motivos inferidos', () => {
    const e = mapFuel(fueling as never)
    expect(e.total).toBe(1863.1)
    expect(e.liters).toBe(300.5)
    expect(e.status).toBe('pendente')
    expect(e.issues.map((i) => i.code)).toEqual(['km_ausente', 'sem_comprovante'])
  })

  it('mapeia viagem concluída e frete (gross_cents) com cliente/carga da viagem', () => {
    const t = mapTrip(
      { id: 't', review_status: 'approved', vehicle_id: 'v', driver_id: 'd', occurred_on: '2026-10-02', origin: 'A', destination: 'B', contractor: 'Cliente', commodity: 'Soja', start_odometer_km: '1000', end_odometer_km: '1410.5', status: 'completed' },
      { id: 'fr', trip_id: 't', gross_cents: 372000 },
    )
    expect(t).toMatchObject({ status: 'concluida', startKm: 1000, endKm: 1410.5, freight: { client: 'Cliente', cargo: 'Soja', value: 3720 } })
  })

  it('pagina listas até o total e envia Bearer e filtros do contrato', async () => {
    const calls = mockFetch({
      'GET /api/v1/fuelings': (u) =>
        u.searchParams.get('offset') === '0'
          ? { body: { items: Array.from({ length: 100 }, (_, i) => ({ ...fueling, id: `a${i}` })), total: 101, offset: 0, limit: 100 } }
          : { body: { items: [{ ...fueling, id: 'last' }], total: 101, offset: 100, limit: 100 } },
    })
    const list = await repo().listFuel({ vehicleId: 'v1', month: '2026-11' })
    expect(list).toHaveLength(101)
    expect(calls[0].path).toBe('/api/v1/fuelings?offset=0&limit=100&vehicle_id=v1&month=2026-11')
    expect(calls[0].auth).toBe('Bearer tok')
  })

  it('cria abastecimento com o corpo do contrato (FuelingWrite) e checa duplicidade no cliente', async () => {
    const calls = mockFetch({
      'GET /api/v1/fuelings': () => ({ body: page([{ ...fueling, review_status: 'approved' }]) }),
      'POST /api/v1/fuelings': (_u, init) => ({ status: 201, body: { ...fueling, id: 'new', ...JSON.parse(String(init.body)), liters: '120', review_status: 'pending' } }),
    })
    const input = { vehicleId: 'v1', driverId: 'd1', date: '2026-11-10T08:00', station: 'Posto X', liters: 300.5, total: 1863.1, fuelType: 'diesel_s10' as const, source: 'manual' as const }
    const dup = await repo().createFuel(input, { actor: 'motorista' })
    expect(dup.status).toBe('possible_duplicate')
    const ok = await repo().createFuel(input, { actor: 'motorista', allowDuplicate: true })
    expect(ok.status).toBe('created')
    const post = calls.find((c) => c.method === 'POST')!
    expect(post.body).toMatchObject({ vehicle_id: 'v1', driver_id: 'd1', occurred_on: '2026-11-10', liters: 300.5, amount_cents: 186310, station: 'Posto X', currency: 'BRL' })
    if (ok.status === 'created') expect(ok.entry.issues[0].code).toBe('possivel_duplicado')
  })

  it('aprovar e devolver usam POST /{recurso}/{id}/review; correção vai antes por PATCH', async () => {
    const calls = mockFetch({
      'GET /api/v1/fuelings/f1': () => ({ body: { ...fueling, review_status: 'approved' } }),
      'PATCH /api/v1/fuelings/f1': () => ({ body: fueling }),
      'POST /api/v1/fuelings/f1/review': () => ({ body: fueling }),
    })
    await repo().review('f1', { action: 'aprovar', patch: { liters: 310, total: 1900 } })
    expect(calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path}`)).toEqual([
      'PATCH /api/v1/fuelings/f1',
      'POST /api/v1/fuelings/f1/review',
    ])
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({ liters: 310, amount_cents: 190000 })
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({ review_status: 'approved' })
  })

  it('identifica despesa quando o id não existe em /fuelings', async () => {
    const calls = mockFetch({
      'DELETE /api/v1/expenses/e1': () => ({ status: 204 }),
    })
    await repo().deleteEntry('e1')
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /api/v1/fuelings/e1', 'DELETE /api/v1/expenses/e1'])
  })

  it('lê a mensagem de erro do envelope { error: { message } }', async () => {
    mockFetch({
      'POST /api/v1/categories': () => ({ status: 409, body: { error: { code: 'conflict', message: 'Registro duplicado ou vínculo impede esta operação' }, request_id: 'r' } }),
    })
    await expect(repo().createCategory({ name: 'X', group: 'outros', driverCanUse: true, needsDescription: false })).rejects.toThrow(
      'Registro duplicado ou vínculo impede esta operação',
    )
  })

  it('km parcial de viagem não existe no contrato: erro claro, sem fingir que salvou', async () => {
    await expect(repo().updateTripKm('t', 10)).rejects.toBeInstanceOf(ApiError)
  })

  it('extração real não informa confiança: todos os campos ficam "a conferir"', () => {
    const fields = mapExtraction({ id: 'p', target: 'fuelings', status: 'pending', payload: { station: 'Posto', liters: '250.5', amount_cents: 155000 } })
    expect(fields.map((f) => [f.key, f.value, f.confidence])).toEqual([
      ['station', 'Posto', 'baixa'],
      ['liters', '250,5', 'baixa'],
      ['total', '1.550,00', 'baixa'],
    ])
  })
})
