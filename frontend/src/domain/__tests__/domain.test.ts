import { describe, expect, it } from 'vitest'
import { parseDecimalBR, parseIntegerBR } from '@/lib/parse'
import { formatMoney, formatKmPerLiter, formatDate, formatMonth } from '@/lib/format'
import { expenseIssues, findDuplicates, fuelIssues, statusFromIssues } from '@/domain/rules'
import { summarizeMonth, toCSV } from '@/domain/reports'
import { buildFixtures, CATEGORIES } from '@/data/mock/fixtures'
import { lastMonths } from '@/lib/dates'
import type { FuelEntry, FuelInput } from '@/domain/types'

describe('formatação e leitura no padrão brasileiro', () => {
  it('interpreta números digitados como o motorista digita', () => {
    expect(parseDecimalBR('1.234,56')).toBe(1234.56)
    expect(parseDecimalBR('312,5')).toBe(312.5)
    expect(parseDecimalBR('R$ 1.935,40')).toBe(1935.4)
    expect(parseDecimalBR('1234.56')).toBe(1234.56)
    expect(parseDecimalBR('1.234')).toBe(1234)
    expect(parseDecimalBR('abc')).toBeNaN()
    expect(parseIntegerBR('523.120')).toBe(523120)
  })
  it('formata moeda, datas e unidades em pt-BR', () => {
    expect(formatMoney(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
    expect(formatKmPerLiter(2.6)).toBe('2,60 km/L')
    expect(formatDate('2026-11-03T10:00')).toBe('03/11/2026')
    expect(formatMonth('2026-07')).toBe('julho de 2026')
  })
})

const base: FuelInput = {
  vehicleId: 'v',
  date: '2026-11-10T08:00',
  station: 'Posto',
  liters: 300,
  total: 1860,
  odometerKm: 1000,
  fuelType: 'diesel_s10',
  source: 'manual',
  documentId: 'doc',
}

describe('regras de pendência', () => {
  it('lançamento completo fica registrado sem pendência', () => {
    const issues = fuelIssues(base, { lastKm: 900, recentPrice: 6.2 })
    expect(issues).toEqual([])
    expect(statusFromIssues(issues)).toBe('registrado')
  })
  it('informação incompleta não bloqueia: vira pendência com motivo', () => {
    const issues = fuelIssues({ ...base, odometerKm: undefined, documentId: undefined }, {})
    expect(issues.map((i) => i.code)).toEqual(['km_ausente', 'sem_comprovante'])
    expect(statusFromIssues(issues)).toBe('pendente')
  })
  it('detecta km menor que o anterior e preço fora do padrão', () => {
    const codes = fuelIssues({ ...base, odometerKm: 800, total: 2400 }, { lastKm: 900, recentPrice: 6.2 }).map((i) => i.code)
    expect(codes).toContain('km_inconsistente')
    expect(codes).toContain('preco_atipico')
  })
  it('leitura incerta de documento exige conferência', () => {
    expect(fuelIssues({ ...base, hadUncertainFields: true }, {}).map((i) => i.code)).toContain('leitura_incerta')
  })
  it('pedágio sem comprovante não gera pendência; oficina acima de R$ 100 gera', () => {
    const pedagio = CATEGORIES.find((c) => c.id === 'pedagio')
    const oficina = CATEGORIES.find((c) => c.id === 'oficina')
    const input = { vehicleId: 'v', date: '2026-11-10T08:00', value: 250, source: 'manual' as const, categoryId: 'x' }
    expect(expenseIssues({ ...input, categoryId: 'pedagio' }, pedagio)).toEqual([])
    expect(expenseIssues({ ...input, categoryId: 'oficina' }, oficina).map((i) => i.code)).toEqual(['sem_comprovante'])
  })
  it('encontra possível duplicidade: mesmo veículo, dia e valor (±1%)', () => {
    const existing = { ...base, id: 'a', kind: 'abastecimento', status: 'registrado', issues: [], createdBy: 'motorista' } as FuelEntry
    expect(findDuplicates({ kind: 'abastecimento', vehicleId: 'v', date: '2026-11-10T19:00', value: 1865 }, [existing])).toHaveLength(1)
    expect(findDuplicates({ kind: 'abastecimento', vehicleId: 'v', date: '2026-11-11T08:00', value: 1860 }, [existing])).toHaveLength(0)
    expect(findDuplicates({ kind: 'abastecimento', vehicleId: 'v', date: '2026-11-10T08:00', value: 1700 }, [existing])).toHaveLength(0)
  })
})

describe('fixtures sintéticas', () => {
  const s = buildFixtures('2026-11-13')
  const data = { trips: s.trips, fuel: s.fuel, expenses: s.expenses, categories: s.categories }

  it('cobrem os casos exigidos', () => {
    const all = [...s.fuel, ...s.expenses]
    const codes = all.flatMap((e) => e.issues.map((i) => i.code))
    expect(codes).toContain('possivel_duplicado')
    expect(codes).toContain('leitura_incerta')
    expect(codes).toContain('km_ausente')
    expect(all.some((e) => e.status === 'devolvido')).toBe(true)
    expect(s.trips.some((t) => t.status === 'em_andamento')).toBe(true)
    expect(s.trips.some((t) => t.status === 'concluida' && !t.freight)).toBe(true)
  })
  it('têm ao menos um mês fechado com prejuízo', () => {
    const months = lastMonths('2026-10', 11)
    expect(months.some((m) => summarizeMonth(data, m).result < 0)).toBe(true)
  })
  it('usam placas e CNPJs claramente fictícios', () => {
    expect(s.vehicles.every((v) => v.plate.startsWith('DMO'))).toBe(true)
    expect(s.documents.every((d) => !d.synthetic || d.synthetic.lines.every((l) => l.label !== 'CNPJ' || l.value.includes('fictício')))).toBe(true)
  })
  it('resultado = faturamento − despesas e devolvidos ficam fora dos totais', () => {
    const m = summarizeMonth(data, '2026-10')
    expect(m.result).toBeCloseTo(m.revenue - m.totalCosts, 6)
    expect(m.totalCosts).toBeCloseTo(m.costLines.reduce((acc, l) => acc + l.value, 0), 6)
  })
})

describe('exportação CSV', () => {
  it('usa ponto e vírgula, vírgula decimal e BOM para abrir no Excel', () => {
    const csv = toCSV([['Item', 'Valor'], ['Diesel; S10', 1234.5]])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"Diesel; S10";1234,50')
  })
})
