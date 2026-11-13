/**
 * FIXTURES SINTÉTICAS — dados inventados para a demonstração.
 *
 * Estrutura inspirada na planilha operacional (fretes, abastecimentos, despesas,
 * impostos, seguros, manutenção, km), mas NENHUM valor, placa, pessoa, cliente
 * ou posto corresponde a dados reais. Placas usam o prefixo "DMO" (demonstração)
 * e CNPJs são fictícios.
 *
 * Os dados são gerados de forma determinística para os 12 meses que terminam no
 * mês corrente, para que a demonstração sempre pareça atual.
 */
import type {
  DocumentFile,
  Driver,
  ExpenseCategory,
  ExpenseEntry,
  FuelEntry,
  Trip,
  Vehicle,
} from '@/domain/types'
import { addDays, daysInMonth, lastMonths } from '@/lib/dates'
import { formatDecimal, formatMoney } from '@/lib/format'
import {
  duplicateIssue,
  expenseIssues,
  findDuplicates,
  fuelIssues,
  lastKnownKm,
  recentPricePerLiter,
  statusFromIssues,
} from '@/domain/rules'
import { tripRevenueMonth } from '@/domain/reports'

/** Alíquota ESTIMADA (hipótese) do imposto sobre faturamento; o regime real do cliente é desconhecido. */
export const TAX_RATE = 0.062

export interface FleetState {
  vehicles: Vehicle[]
  drivers: Driver[]
  trips: Trip[]
  fuel: FuelEntry[]
  expenses: ExpenseEntry[]
  categories: ExpenseCategory[]
  documents: DocumentFile[]
  seq: number
}

export const DEMO_USERS = {
  motorista: { id: 'mot-1', name: 'Carlos Pereira', vehicleId: 'vei-1' },
  gestor: { id: 'ges-1', name: 'Antônio Souza' },
} as const

export const CATEGORIES: ExpenseCategory[] = [
  { id: 'pedagio', name: 'Pedágio', group: 'viagem', driverCanUse: true, needsDescription: false },
  { id: 'estacionamento', name: 'Estacionamento', group: 'viagem', driverCanUse: true, needsDescription: false },
  { id: 'alimentacao', name: 'Alimentação e pernoite', group: 'viagem', driverCanUse: true, needsDescription: false },
  { id: 'oficina', name: 'Oficina e manutenção', group: 'manutencao', driverCanUse: true, needsDescription: true },
  { id: 'pneus', name: 'Pneus', group: 'manutencao', driverCanUse: false, needsDescription: true },
  { id: 'lavagem', name: 'Lavagem', group: 'viagem', driverCanUse: true, needsDescription: false },
  { id: 'salario', name: 'Salário e encargos do motorista', group: 'pessoal', driverCanUse: false, needsDescription: false },
  { id: 'parcela', name: 'Parcela do financiamento', group: 'fixo', driverCanUse: false, needsDescription: false },
  { id: 'seguro', name: 'Seguro', group: 'fixo', driverCanUse: false, needsDescription: false },
  { id: 'rastreador', name: 'Rastreamento', group: 'fixo', driverCanUse: false, needsDescription: false },
  { id: 'impostos_faturamento', name: 'Impostos sobre faturamento', group: 'impostos', driverCanUse: false, needsDescription: false },
  { id: 'ipva', name: 'IPVA, licenciamento e ANTT', group: 'impostos', driverCanUse: false, needsDescription: true },
  { id: 'outros', name: 'Outros', group: 'outros', driverCanUse: true, needsDescription: true },
]

const ROUTES: { to: string; km: number; rate: number; client: string; cargo: string }[] = [
  { to: 'São Paulo/SP', km: 410, rate: 8.8, client: 'Distribuidora Horizonte (fictícia)', cargo: 'Papel e embalagens' },
  { to: 'Joinville/SC', km: 130, rate: 12.8, client: 'Metalúrgica Vale Verde (fictícia)', cargo: 'Peças metálicas' },
  { to: 'Paranaguá/PR', km: 95, rate: 15.1, client: 'Cooperativa Campos Gerais (fictícia)', cargo: 'Soja a granel' },
  { to: 'Porto Alegre/RS', km: 710, rate: 7.3, client: 'Atacado Sul Pampa (fictícia)', cargo: 'Alimentos secos' },
  { to: 'Cascavel/PR', km: 500, rate: 7.8, client: 'Agroindústria Oeste (fictícia)', cargo: 'Ração animal' },
  { to: 'Belo Horizonte/MG', km: 1000, rate: 6.9, client: 'Comercial Serra Mineira (fictícia)', cargo: 'Materiais de construção' },
  { to: 'Campinas/SP', km: 500, rate: 8.0, client: 'Química Paulista (fictícia)', cargo: 'Insumos industriais (não perigosos)' },
  { to: 'Florianópolis/SC', km: 300, rate: 9.6, client: 'Rede Mercado Ilha (fictícia)', cargo: 'Bebidas' },
]
const HUB = 'Curitiba/PR'

const STATIONS = [
  'Auto Posto Trevo Norte',
  'Posto Pinheiral',
  'Posto Estrela da Serra',
  'Auto Posto Rota Sul',
  'Posto Campo Aberto',
  'Posto Rodovia Azul',
]

/** PRNG determinístico (mulberry32). */
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const pad2 = (n: number) => String(n).padStart(2, '0')
const at = (date: string, hour: number, minute = 0) => `${date.slice(0, 10)}T${pad2(hour)}:${pad2(minute)}`

export function buildFixtures(today: string): FleetState {
  const rand = rng(8160)
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]
  const between = (a: number, b: number) => a + rand() * (b - a)

  let seq = 0
  const id = (prefix: string) => `${prefix}-${String(++seq).padStart(4, '0')}`

  const vehicles: Vehicle[] = [
    {
      id: 'vei-1',
      plate: 'DMO1A23',
      model: 'Scania R 450',
      year: 2019,
      description: 'Cavalo mecânico 6x2 + carreta graneleira',
      fuelType: 'diesel_s10',
      odometerKm: 0,
      driverId: 'mot-1',
      active: true,
    },
    {
      id: 'vei-2',
      plate: 'DMO4B56',
      model: 'Volvo FH 460',
      year: 2021,
      description: 'Cavalo mecânico 6x2 + carreta baú',
      fuelType: 'diesel_s10',
      odometerKm: 0,
      driverId: 'mot-2',
      active: true,
    },
  ]
  const drivers: Driver[] = [
    { id: 'mot-1', name: DEMO_USERS.motorista.name, vehicleId: 'vei-1' },
    { id: 'mot-2', name: 'Marcos Lima', vehicleId: 'vei-2' },
  ]

  const trips: Trip[] = []
  const fuel: FuelEntry[] = []
  const expenses: ExpenseEntry[] = []
  const documents: DocumentFile[] = []

  const currentMonth = today.slice(0, 7)
  const todayDay = Number(today.slice(8, 10))
  const months = lastMonths(currentMonth, 12)
  const lossMonth = months[6]

  const fuelDoc = (entry: FuelEntry): string => {
    const docId = id('doc')
    documents.push({
      id: docId,
      kind: 'cupom_combustivel',
      fileName: `cupom-${entry.date.slice(0, 10)}.jpg`,
      uploadedAt: entry.date,
      entryId: entry.id,
      vehicleId: entry.vehicleId,
      synthetic: {
        issuer: entry.station,
        date: entry.date,
        lines: [
          { label: 'Diesel S10', value: `${formatDecimal(entry.liters, 3)} L × ${formatDecimal(entry.total / entry.liters, 3)}` },
          { label: 'CNPJ', value: '00.000.000/0001-00 (fictício)' },
        ],
        total: formatMoney(entry.total),
      },
    })
    return docId
  }

  const expenseDoc = (entry: ExpenseEntry, kind: DocumentFile['kind'], issuer: string): string => {
    const docId = id('doc')
    documents.push({
      id: docId,
      kind,
      fileName: `${kind}-${entry.date.slice(0, 10)}.jpg`,
      uploadedAt: entry.date,
      entryId: entry.id,
      vehicleId: entry.vehicleId,
      synthetic: {
        issuer,
        date: entry.date,
        lines: [
          { label: 'Descrição', value: entry.description ?? '' },
          { label: 'CNPJ', value: '00.000.000/0002-00 (fictício)' },
        ],
        total: formatMoney(entry.value),
      },
    })
    return docId
  }

  for (const vehicle of vehicles) {
    const isMain = vehicle.id === 'vei-1'
    let odometer = isMain ? 412_380 : 186_150
    const consumption = isMain ? 2.55 : 2.75
    const driverId = vehicle.driverId!
    let kmSinceFuel = 0
    let lastFuelOdometer = odometer

    for (const [mi, month] of months.entries()) {
      const isCurrent = month === currentMonth
      const lastDay = isCurrent ? todayDay : daysInMonth(month)
      const basePrice = 5.98 + mi * 0.02
      const approved = !isCurrent
      const status = approved ? ('aprovado' as const) : ('registrado' as const)
      const reviewedAt = approved ? `${month}-${pad2(Math.min(28, lastDay))}T18:00` : undefined

      let day = 1
      let city = HUB
      // Mês com prejuízo: caminhão parado na oficina (retífica do motor).
      const downtime = isMain && month === lossMonth ? { from: 5, to: 24 } : null

      while (true) {
        if (downtime && day >= downtime.from && day <= downtime.to) {
          day = downtime.to + 1
          continue
        }
        const route = city === HUB ? pick(ROUTES) : ROUTES.find((r) => r.to === city)!
        const outbound = city === HUB
        const legDays = Math.max(1, Math.ceil(route.km / 600)) + (rand() < 0.4 ? 1 : 0)
        const endDay = day + legDays
        const inProgress = isCurrent && isMain && endDay >= lastDay
        if (!inProgress && endDay >= lastDay) break
        if (isCurrent && !isMain && endDay > lastDay - 1) break

        const startDate = `${month}-${pad2(day)}`
        const endDate = `${month}-${pad2(Math.min(endDay, daysInMonth(month)))}`
        const km = Math.round(route.km * between(0.97, 1.06))
        const kmDone = inProgress ? Math.round(km * 0.45) : km
        const trip: Trip = {
          id: id('via'),
          vehicleId: vehicle.id,
          driverId,
          origin: outbound ? HUB : route.to,
          destination: outbound ? route.to : HUB,
          startDate,
          startKm: odometer,
          status: inProgress ? 'em_andamento' : 'concluida',
        }
        if (inProgress) {
          trip.lastKm = odometer + kmDone
        } else {
          trip.endDate = endDate
          trip.endKm = odometer + km
        }
        const value = Math.round((km * route.rate * (outbound ? 1 : 0.82) * between(0.95, 1.06)) / 10) * 10
        trip.freight = {
          client: outbound ? route.client : pick(ROUTES).client,
          value,
          cargo: outbound ? route.cargo : pick(ROUTES).cargo,
        }
        trips.push(trip)

        // Abastecimentos ao longo da viagem
        let travelled = 0
        while (travelled < kmDone) {
          const step = Math.min(kmDone - travelled, 900 - kmSinceFuel)
          travelled += step
          kmSinceFuel += step
          if (kmSinceFuel >= 900 || (travelled >= kmDone && kmSinceFuel > 650 && !inProgress)) {
            const fuelOdometer = odometer + travelled
            const liters = round2(((fuelOdometer - lastFuelOdometer) / consumption) * between(0.97, 1.03))
            const price = round2(basePrice + between(-0.12, 0.18))
            const dayOffset = Math.min(legDays - 1, Math.floor((travelled / Math.max(km, 1)) * legDays))
            const date = at(addDays(startDate, dayOffset), Math.floor(between(6, 21)), Math.floor(between(0, 59)))
            if (date.slice(0, 10) > today) break
            const entry: FuelEntry = {
              id: id('abs'),
              kind: 'abastecimento',
              vehicleId: vehicle.id,
              driverId,
              tripId: trip.id,
              date,
              station: pick(STATIONS),
              liters,
              total: round2(liters * price),
              odometerKm: fuelOdometer,
              fuelType: 'diesel_s10',
              status,
              reviewedAt,
              issues: [],
              source: 'comprovante',
              createdBy: 'motorista',
            }
            entry.documentId = fuelDoc(entry)
            fuel.push(entry)
            kmSinceFuel = 0
            lastFuelOdometer = fuelOdometer
          }
        }

        // Pedágio por viagem
        expenses.push({
          id: id('desp'),
          kind: 'despesa',
          vehicleId: vehicle.id,
          driverId,
          tripId: trip.id,
          date: at(startDate, 9, 30),
          categoryId: 'pedagio',
          value: round2(kmDone * between(0.42, 0.5)),
          status,
          reviewedAt,
          issues: [],
          source: 'manual',
          createdBy: 'motorista',
        })
        // Alimentação/pernoite em viagens com mais de um dia (nunca no futuro)
        if (legDays > 1 && addDays(startDate, 1) < today) {
          expenses.push({
            id: id('desp'),
            kind: 'despesa',
            vehicleId: vehicle.id,
            driverId,
            tripId: trip.id,
            date: at(addDays(startDate, 1), 20, 10),
            categoryId: 'alimentacao',
            value: round2(legDays * between(70, 95)),
            status,
            reviewedAt,
            issues: [],
            source: 'manual',
            createdBy: 'motorista',
          })
        }

        odometer += kmDone
        city = outbound ? route.to : HUB
        day = endDay + (rand() < 0.5 ? 1 : 0)
        if (inProgress) break
      }

      // Custos fixos e de pessoal (lançados pelo gestor)
      const fixed: [string, number, number, string?][] = [
        ['salario', 5, isMain ? 5820 : 5650],
        ['parcela', 10, isMain ? 7480 : 9150],
        ['seguro', 15, isMain ? 1860 : 2140],
        ['rastreador', 15, 189.9],
      ]
      if (month.endsWith('-01') || month.endsWith('-02') || month.endsWith('-03')) {
        fixed.push(['ipva', 20, isMain ? 1915.4 : 2380.7, 'IPVA (parcela)'])
      }
      if (month.endsWith('-04')) fixed.push(['ipva', 22, 312.5, 'Licenciamento anual e RNTRC'])
      for (const [categoryId, d, value, description] of fixed) {
        if (d > lastDay) continue
        expenses.push({
          id: id('desp'),
          kind: 'despesa',
          vehicleId: vehicle.id,
          date: at(`${month}-${pad2(d)}`, 10),
          categoryId,
          description,
          value: round2(value),
          status,
          reviewedAt,
          issues: [],
          source: 'manual',
          createdBy: 'gestor',
        })
      }
      // Manutenção
      const maintenance: [number, string, string, number][] = []
      if (mi % 3 === 1) maintenance.push([12, 'oficina', 'Troca de óleo, filtros e lubrificação', isMain ? 1460 : 1390])
      if (isMain && month === lossMonth) {
        maintenance.push([8, 'oficina', 'Retífica do motor — peças e mão de obra', 27850])
        maintenance.push([20, 'oficina', 'Guincho e diagnóstico', 1180])
      }
      if (mi === (isMain ? 3 : 8)) maintenance.push([18, 'pneus', '4 pneus de tração recapados', isMain ? 6240 : 6580])
      if (mi === 9 && !isMain) maintenance.push([6, 'oficina', 'Revisão do sistema de freios', 2310])
      for (const [d, categoryId, description, value] of maintenance) {
        if (d > lastDay) continue
        const entry: ExpenseEntry = {
          id: id('desp'),
          kind: 'despesa',
          vehicleId: vehicle.id,
          driverId: categoryId === 'oficina' ? driverId : undefined,
          date: at(`${month}-${pad2(d)}`, 14),
          categoryId,
          description,
          value,
          status,
          reviewedAt,
          issues: [],
          source: 'manual',
          createdBy: categoryId === 'oficina' ? 'motorista' : 'gestor',
        }
        entry.documentId = expenseDoc(entry, 'nota_servico', 'Oficina Diesel Boa Viagem (fictícia)')
        expenses.push(entry)
      }
    }
    vehicle.odometerKm = odometer
  }

  // 7) Viagem concluída sem frete registrado (segundo veículo) — antes do cálculo do imposto.
  const tripWithoutFreight = trips.filter((t) => t.vehicleId === vehicles[1].id && t.status === 'concluida').at(-1)
  if (tripWithoutFreight) delete tripWithoutFreight.freight

  /* ---------- Imposto sobre faturamento (meses fechados) ----------
   * Calculado depois de todos os ajustes, a partir dos fretes reconhecidos no mês
   * (mesma regra do relatório: mês de conclusão da viagem).
   */
  for (const vehicle of vehicles) {
    for (const month of months) {
      if (month === currentMonth) continue
      const revenue = trips
        .filter((t) => t.vehicleId === vehicle.id && t.freight && tripRevenueMonth(t) === month)
        .reduce((sum, t) => sum + t.freight!.value, 0)
      if (!revenue) continue
      expenses.push({
        id: id('desp'),
        kind: 'despesa',
        vehicleId: vehicle.id,
        date: at(`${month}-28`, 11),
        categoryId: 'impostos_faturamento',
        description: `Simples Nacional — estimativa de ${formatDecimal(TAX_RATE * 100, 1)}% sobre os fretes do mês`,
        value: round2(revenue * TAX_RATE),
        status: 'aprovado',
        reviewedAt: `${month}-28T18:00`,
        issues: [],
        source: 'manual',
        createdBy: 'gestor',
      })
    }
  }

  /* ---------- Casos especiais ----------
   * Nenhum valor é digitado à mão: cada caso parte de um abastecimento gerado acima
   * (litros = km rodados ÷ consumo; valor = litros × preço) e as pendências são
   * calculadas pelas MESMAS regras da aplicação (domain/rules.ts).
   */
  const v1 = vehicles[0]
  const v2 = vehicles[1]
  const asc = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date)
  const removeDoc = (e: FuelEntry) => {
    const di = documents.findIndex((x) => x.id === e.documentId)
    if (di >= 0) documents.splice(di, 1)
    e.documentId = undefined
  }
  const [fIncomplete, fDuplicated, fUncertain] = fuel.filter((f) => f.vehicleId === v1.id).sort(asc).slice(-3)
  const [fAtypical] = fuel.filter((f) => f.vehicleId === v2.id).sort(asc).slice(-1)

  // 1) Lançamento incompleto: o motorista não informou o km nem anexou comprovante.
  removeDoc(fIncomplete)
  fIncomplete.odometerKm = undefined
  fIncomplete.source = 'manual'

  // 2) Duplicidade: o mesmo abastecimento registrado de novo minutos depois, sem comprovante.
  const [dh, dm] = fDuplicated.date.slice(11, 16).split(':').map(Number)
  const dupCopy: FuelEntry = {
    ...fDuplicated,
    id: id('abs'),
    date: at(fDuplicated.date, Math.min(23, dh + (dm >= 37 ? 1 : 0)), (dm + 23) % 60),
    documentId: undefined,
    source: 'manual',
  }
  fuel.push(dupCopy)

  // 3) Comprovante com leitura incerta: os litros saíram borrados no cupom.
  const ud = documents.find((x) => x.id === fUncertain.documentId)!
  const litersText = formatDecimal(fUncertain.liters, 2)
  ud.synthetic!.lines[0].value = `${litersText.slice(0, 2)}?${litersText.slice(3)} L × ${formatDecimal(fUncertain.total / fUncertain.liters, 3)}`
  ud.extraction = {
    simulated: true,
    fields: [
      { key: 'station', label: 'Posto', value: fUncertain.station, confidence: 'alta' },
      { key: 'liters', label: 'Litros', value: litersText, confidence: 'baixa' },
      { key: 'total', label: 'Valor total', value: formatDecimal(fUncertain.total, 2), confidence: 'alta' },
      { key: 'date', label: 'Data', value: fUncertain.date.slice(0, 10), confidence: 'alta' },
    ],
  }

  // 4) Erro de digitação: informou 40% dos litros reais (o valor pago está certo).
  //    A regra de preço por litro fora do padrão é quem detecta.
  fAtypical.liters = round2(fAtypical.liters * 0.4)

  // Reavalia os casos com as regras da aplicação, como se tivessem sido lançados agora.
  const special = new Set([fIncomplete.id, fDuplicated.id, fUncertain.id, fAtypical.id, dupCopy.id])
  for (const e of fuel.filter((f) => special.has(f.id)).sort(asc)) {
    const vehicle = vehicles.find((v) => v.id === e.vehicleId)
    const earlier = fuel.filter((f) => f.vehicleId === e.vehicleId && f.id !== e.id && f.date <= e.date)
    const issues = fuelIssues(
      { ...e, hadUncertainFields: e.id === fUncertain.id },
      { lastKm: lastKnownKm(vehicle, earlier, trips, e.date), recentPrice: recentPricePerLiter(e.vehicleId, earlier) },
    )
    const dup = findDuplicates({ kind: 'abastecimento', vehicleId: e.vehicleId, date: e.date, value: e.total }, earlier)
    if (dup.length) issues.unshift(duplicateIssue(dup[0], false))
    e.issues = issues
    // Sem pendência mantém o estado gerado (registrado/aprovado); com pendência vai para conferência.
    if (issues.length) {
      e.status = statusFromIssues(issues)
      e.reviewedAt = undefined
    }
  }

  // 5) Despesa de oficina sem nota e 6) despesa que o gestor devolveu (registros adicionais).
  const activeTrip = trips.find((t) => t.vehicleId === v1.id && t.status === 'em_andamento')
  const d = (offset: number) => addDays(today, -offset)
  const workshop: ExpenseEntry = {
    id: id('desp'),
    kind: 'despesa',
    vehicleId: v1.id,
    driverId: 'mot-1',
    tripId: activeTrip?.id,
    date: at(d(2), 11, 15),
    categoryId: 'oficina',
    description: 'Conserto de mangueira do ar e troca de lâmpada',
    value: 380,
    status: 'registrado',
    issues: [],
    source: 'manual',
    createdBy: 'motorista',
  }
  const returned: ExpenseEntry = {
    id: id('desp'),
    kind: 'despesa',
    vehicleId: v1.id,
    driverId: 'mot-1',
    date: at(d(8), 16, 40),
    categoryId: 'outros',
    description: 'Lona',
    value: 240,
    status: 'registrado',
    issues: [],
    source: 'manual',
    createdBy: 'motorista',
  }
  for (const e of [workshop, returned]) {
    e.issues = expenseIssues(e, CATEGORIES.find((c) => c.id === e.categoryId))
    e.status = statusFromIssues(e.issues)
  }
  // Decisão do gestor (não é regra automática): pediu correção.
  returned.status = 'devolvido'
  returned.returnReason = 'Anexe o recibo e diga se a lona foi comprada ou é reparo da existente.'
  returned.reviewedAt = at(d(7), 9, 0)
  expenses.push(workshop, returned)

  const byDate = <T extends { date: string }>(a: T, b: T) => b.date.localeCompare(a.date)
  fuel.sort(byDate)
  expenses.sort(byDate)
  trips.sort((a, b) => b.startDate.localeCompare(a.startDate))

  return { vehicles, drivers, trips, fuel, expenses, categories: CATEGORIES.map((c) => ({ ...c })), documents, seq }
}

/** Comprovante de exemplo usado pela "leitura simulada" no formulário. */
export function sampleExtraction(kind: 'cupom_combustivel' | 'recibo', today: string) {
  if (kind === 'cupom_combustivel') {
    return {
      synthetic: {
        issuer: 'Posto Rodovia Azul',
        date: `${today}T10:12`,
        lines: [
          { label: 'Diesel S10', value: '29?,80 L × 6,19' },
          { label: 'CNPJ', value: '00.000.000/0003-00 (fictício)' },
        ],
        total: 'R$ 1.856,76',
      },
      fields: [
        { key: 'station' as const, label: 'Posto', value: 'Posto Rodovia Azul', confidence: 'alta' as const },
        { key: 'liters' as const, label: 'Litros', value: '299,80', confidence: 'baixa' as const },
        { key: 'total' as const, label: 'Valor total', value: '1.856,76', confidence: 'alta' as const },
        { key: 'date' as const, label: 'Data', value: today, confidence: 'alta' as const },
      ],
    }
  }
  return {
    synthetic: {
      issuer: 'Estacionamento Parada Segura (fictício)',
      date: `${today}T07:30`,
      lines: [
        { label: 'Descrição', value: 'Pernoite carreta' },
        { label: 'CNPJ', value: '00.000.000/0004-00 (fictício)' },
      ],
      total: 'R$ 45,00',
    },
    fields: [
      { key: 'value' as const, label: 'Valor', value: '45,00', confidence: 'alta' as const },
      { key: 'date' as const, label: 'Data', value: today, confidence: 'alta' as const },
      { key: 'description' as const, label: 'Descrição', value: 'Pernoite carreta', confidence: 'baixa' as const },
    ],
  }
}
