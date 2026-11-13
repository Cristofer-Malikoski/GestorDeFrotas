import { describe, expect, it } from 'vitest'
import { buildFixtures, CATEGORIES, TAX_RATE } from '@/data/mock/fixtures'
import { fuelConsumption, summarizeMonth, tripRevenueMonth } from '@/domain/reports'
import { countsInTotals, expenseIssues, fuelIssues, lastKnownKm, recentPricePerLiter } from '@/domain/rules'
import { lastMonths } from '@/lib/dates'

/**
 * Os valores financeiros das fixtures precisam fechar com os próprios registros:
 * nada de totais ajustados à mão para "parecer realista".
 */
describe('consistência financeira das fixtures', () => {
  const today = '2026-11-13'
  const s = buildFixtures(today)
  const data = { trips: s.trips, fuel: s.fuel, expenses: s.expenses, categories: s.categories }
  const closed = lastMonths('2026-10', 11)

  it('faturamento do mês = soma dos fretes das viagens concluídas no mês', () => {
    for (const m of closed) {
      const expected = s.trips.filter((t) => t.freight && tripRevenueMonth(t) === m).reduce((a, t) => a + t.freight!.value, 0)
      expect(summarizeMonth(data, m).revenue).toBeCloseTo(expected, 2)
    }
  })

  it('despesas = combustível + demais lançamentos não devolvidos; resultado = faturamento − despesas', () => {
    for (const m of closed) {
      const sum = summarizeMonth(data, m)
      const fuel = s.fuel.filter((f) => f.date.startsWith(m) && countsInTotals(f)).reduce((a, f) => a + f.total, 0)
      const other = s.expenses.filter((e) => e.date.startsWith(m) && countsInTotals(e)).reduce((a, e) => a + e.value, 0)
      expect(sum.totalCosts).toBeCloseTo(fuel + other, 2)
      expect(sum.result).toBeCloseTo(sum.revenue - sum.totalCosts, 2)
    }
  })

  it('imposto sobre faturamento = alíquota estimada × fretes do veículo no mês', () => {
    for (const v of s.vehicles) {
      for (const m of closed) {
        const revenue = s.trips.filter((t) => t.vehicleId === v.id && t.freight && tripRevenueMonth(t) === m).reduce((a, t) => a + t.freight!.value, 0)
        const tax = s.expenses.filter((e) => e.vehicleId === v.id && e.categoryId === 'impostos_faturamento' && e.date.startsWith(m))
        expect(tax.reduce((a, e) => a + e.value, 0)).toBeCloseTo(Math.round(revenue * TAX_RATE * 100) / 100, 2)
      }
    }
  })

  it('valor do abastecimento = litros × preço plausível e consumo vem do hodômetro', () => {
    const { kmPerLiter } = fuelConsumption(s.fuel.filter((f) => f.status !== 'pendente'))
    expect(kmPerLiter).toBeGreaterThan(2)
    expect(kmPerLiter).toBeLessThan(3.5)
    for (const f of s.fuel.filter((x) => x.status !== 'pendente')) {
      const ppl = f.total / f.liters
      expect(ppl).toBeGreaterThan(5)
      expect(ppl).toBeLessThan(7.5)
    }
  })

  it('pendências dos casos especiais são exatamente as que as regras da aplicação calculam', () => {
    for (const e of s.fuel.filter((f) => f.status === 'pendente')) {
      const earlier = s.fuel.filter((f) => f.vehicleId === e.vehicleId && f.id !== e.id && f.date <= e.date)
      const vehicle = s.vehicles.find((v) => v.id === e.vehicleId)
      const codes = fuelIssues(
        { ...e, hadUncertainFields: e.issues.some((i) => i.code === 'leitura_incerta') },
        { lastKm: lastKnownKm(vehicle, earlier, s.trips, e.date), recentPrice: recentPricePerLiter(e.vehicleId, earlier) },
      ).map((i) => i.code)
      expect(e.issues.map((i) => i.code).filter((c) => c !== 'possivel_duplicado')).toEqual(codes)
    }
    for (const e of s.expenses.filter((x) => x.issues.length)) {
      expect(e.issues).toEqual(expenseIssues(e, CATEGORIES.find((c) => c.id === e.categoryId)))
    }
  })

  it('nenhum lançamento fica no futuro', () => {
    const now = `${today}T23:59`
    expect([...s.fuel, ...s.expenses].every((e) => e.date <= now)).toBe(true)
  })
})
