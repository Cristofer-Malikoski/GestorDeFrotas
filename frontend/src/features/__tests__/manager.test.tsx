import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'
import { buildFixtures } from '@/data/mock/fixtures'
import { todayISO } from '@/lib/dates'

describe('Gestor', () => {
  it('painel mostra faturamento, despesas, resultado, custo por km e o que precisa de atenção', async () => {
    renderApp('/gestor', 'gestor')
    expect(await screen.findByText('Faturamento (fretes)')).toBeInTheDocument()
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0)
    expect(screen.getByText('Resultado do mês')).toBeInTheDocument()
    expect(screen.getByText('Custo por km')).toBeInTheDocument()
    expect(screen.getByText(/lançamentos? para conferir/)).toBeInTheDocument()
    expect(screen.getByText(/viagem concluída sem frete/)).toBeInTheDocument()
  })

  it('gráfico tem alternativa em tabela e destaca mês com prejuízo em texto', async () => {
    const { user } = renderApp('/gestor', 'gestor')
    await user.click(await screen.findByRole('button', { name: 'Ver como tabela' }))
    const table = screen.getByRole('table')
    expect(within(table).getAllByText(/prejuízo/).length).toBeGreaterThan(0)
  })

  it('aprova leitura incerta só depois de confirmar que conferiu o documento', async () => {
    const { user, repository } = renderApp('/gestor/conferencia', 'gestor')
    const item = await screen.findByRole('button', { name: /Auto Posto Trevo Norte/ })
    await user.click(item)
    expect(screen.getByText('Comprovante sintético de demonstração', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Aprovar$/ }))
    expect(await screen.findByText(/Confirme que conferiu/)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Conferi litros e valor/ }))
    await user.click(screen.getByRole('button', { name: /^Aprovar$/ }))
    await waitFor(async () => {
      const queue = await repository.listReviewQueue()
      expect(queue.some((e) => e.kind === 'abastecimento' && e.station === 'Auto Posto Trevo Norte' && e.issues.some((i) => i.code === 'leitura_incerta'))).toBe(false)
    })
  })

  it('devolver ao motorista exige motivo', async () => {
    const { user, repository } = renderApp('/gestor/conferencia', 'gestor')
    await user.click(await screen.findByRole('button', { name: /Devolver ao motorista/ }))
    await user.click(screen.getAllByRole('button', { name: /Devolver ao motorista/ }).at(-1)!)
    expect(await screen.findByText('Escreva o motivo da devolução.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/O que o motorista precisa corrigir/), 'Anexe a nota.')
    await user.click(screen.getAllByRole('button', { name: /Devolver ao motorista/ }).at(-1)!)
    await waitFor(async () => {
      const fuel = await repository.listFuel()
      const exp = await repository.listExpenses()
      expect([...fuel, ...exp].some((e) => e.returnReason === 'Anexe a nota.')).toBe(true)
    })
  })

  it('exclui duplicado com confirmação explícita', async () => {
    const { user, repository } = renderApp('/gestor/conferencia', 'gestor')
    const before = (await repository.listReviewQueue()).length
    await user.click(await screen.findByRole('button', { name: /Excluir duplicado/ }))
    const dialog = await screen.findByRole('dialog', { name: /Excluir este lançamento/ })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir duplicado' }))
    await waitFor(async () => expect((await repository.listReviewQueue()).length).toBe(before - 1))
  })

  it('registra frete em viagem concluída sem redigitar rota e km', async () => {
    const target = buildFixtures(todayISO()).trips.find((t) => t.status === 'concluida' && !t.freight)!
    // filtro de mês posicionado no mês da viagem
    sessionStorage.setItem('fretuno-gestor-filtros', JSON.stringify({ month: target.startDate.slice(0, 7) }))
    const { user, repository } = renderApp('/gestor/viagens', 'gestor')
    await user.click((await screen.findAllByRole('button', { name: 'Registrar frete' }))[0])
    const dialog = await screen.findByRole('dialog', { name: 'Registrar frete' })
    expect(within(dialog).getByText(new RegExp(`${target.origin} → ${target.destination}`))).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Cliente'), 'Cliente Teste (fictício)')
    await user.type(within(dialog).getByLabelText('Carga'), 'Grãos')
    await user.type(within(dialog).getByLabelText('Valor do frete'), '4.500,00')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar frete' }))
    await waitFor(async () => {
      const data = await repository.getReportData()
      expect(data.trips.find((t) => t.id === target.id)?.freight?.value).toBe(4500)
    })
  })

  it('fechamento mensal mostra entradas, saídas, resultado e exportação', async () => {
    renderApp('/gestor/relatorios', 'gestor')
    expect(await screen.findByRole('heading', { name: /Fechamento de/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Entradas/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Saídas/ })).toBeInTheDocument()
    expect(screen.getAllByText('Resultado do mês').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Exportar para Excel/ })).toBeInTheDocument()
  })

  it('compara veículos lado a lado', async () => {
    renderApp('/gestor/veiculos', 'gestor')
    const heading = await screen.findByRole('heading', { name: 'Comparação entre veículos' })
    const table = within(heading.closest('section')!).getByRole('table')
    expect(within(table).getByText('DMO1A23')).toBeInTheDocument()
    expect(within(table).getByText('DMO4B56')).toBeInTheDocument()
  })

  it('cria categoria de despesa nova', async () => {
    const { user, repository } = renderApp('/gestor/despesas', 'gestor')
    await user.click(await screen.findByRole('tab', { name: 'Categorias' }))
    await user.type(screen.getByLabelText('Nome'), 'Balança')
    await user.click(screen.getByRole('button', { name: /Criar categoria/ }))
    await waitFor(async () => expect((await repository.listCategories()).some((c) => c.name === 'Balança')).toBe(true))
  })
})

describe('Entrada e landing', () => {
  it('landing apresenta a marca, a proposta e o acesso à demonstração', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /Mais estrada/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Explorar demonstração/ }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Leitura de comprovante simulada/)).toBeInTheDocument()
  })

  it('escolhe o perfil e entra no espaço certo', async () => {
    const { user, router } = renderApp('/entrar')
    await user.click(screen.getByRole('button', { name: /Entrar como gestor/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/gestor'))
  })

  it('rota protegida sem sessão volta para a entrada', async () => {
    const { router } = renderApp('/gestor/relatorios')
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'))
  })
})
