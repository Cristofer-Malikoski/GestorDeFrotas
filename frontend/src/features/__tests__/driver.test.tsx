import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderApp } from '@/test/renderApp'

describe('Motorista', () => {
  it('vê veículo, viagem e ações principais, sem indicadores financeiros', async () => {
    renderApp('/motorista', 'motorista')
    expect(await screen.findByText('DMO1A23')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Registrar abastecimento/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Registrar despesa/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Atualizar viagem/ })).toBeInTheDocument()
    // Correção pedida pelo gestor aparece no topo
    expect(screen.getByText(/O gestor pediu uma correção/)).toBeInTheDocument()
    // Nada de faturamento, frete ou resultado
    expect(screen.queryByText(/Faturamento/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Resultado/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/fictícia/i)).not.toBeInTheDocument()
  })

  it('motorista não acessa telas do gestor', async () => {
    renderApp('/gestor', 'motorista')
    expect(await screen.findByText(/Registre em poucos toques/)).toBeInTheDocument()
  })

  it('registra abastecimento digitando só litros, valor e km (posto e viagem já preenchidos)', async () => {
    const { user, router } = renderApp('/motorista/abastecer', 'motorista')
    const posto = await screen.findByLabelText('Posto')
    await waitFor(() => expect(posto).not.toHaveValue(''))
    expect(screen.getByText(/Curitiba\/PR →|→ Curitiba\/PR/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Litros'), '250,5')
    await user.type(screen.getByLabelText('Valor total pago'), '1.553,10')
    expect(screen.getByText((t) => /R\$\s6,20\/L/.test(t))).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Km do hodômetro/), '999999')
    await user.click(screen.getByRole('button', { name: 'Salvar abastecimento' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/motorista'))
    expect(await screen.findByText(/Abastecimento registrado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
  })

  it('mostra erros simples e corrigíveis quando faltam valores', async () => {
    const { user } = renderApp('/motorista/abastecer', 'motorista')
    await user.click(await screen.findByRole('button', { name: 'Salvar abastecimento' }))
    expect(await screen.findByText(/Informe os litros/)).toBeInTheDocument()
    expect(screen.getByText(/Informe o valor total pago/)).toBeInTheDocument()
    expect(screen.getByLabelText('Litros')).toHaveAttribute('aria-invalid', 'true')
  })

  it('leitura de comprovante é simulada, rotulada e exige conferir campos incertos', async () => {
    const { user, router } = renderApp('/motorista/abastecer', 'motorista')
    await user.click(await screen.findByText('Usar foto do comprovante'))
    await user.click(screen.getByRole('button', { name: /Usar comprovante de exemplo/ }))
    expect(await screen.findByText(/Leitura simulada/)).toBeInTheDocument()
    expect(screen.getByText(/comprovante de exemplo/)).toBeInTheDocument()
    expect(screen.getByLabelText('Litros')).toHaveValue('299,80')

    await user.click(screen.getByRole('button', { name: 'Salvar abastecimento' }))
    expect(await screen.findByText(/Confira os campos destacados/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/motorista/abastecer')

    await user.click(screen.getByRole('checkbox', { name: /Conferi os campos destacados/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar abastecimento' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/motorista'))
    expect((await screen.findAllByText(/Abastecimento registrado — pendente de conferência/)).length).toBeGreaterThan(0)
  })

  it('avisa possível duplicidade antes de salvar e deixa o motorista decidir', async () => {
    const { user, router, repository } = renderApp('/motorista/abastecer', 'motorista')
    const fuel = await repository.listFuel({ vehicleId: 'vei-1' })
    const original = fuel.find((f) => f.issues.length === 0 && f.date.slice(0, 10) === fuel[0].date.slice(0, 10)) ?? fuel[0]

    await user.click(await screen.findByRole('button', { name: /Alterar data ou combustível/ }))
    const date = screen.getByLabelText('Data e hora')
    await user.clear(date)
    await user.type(date, original.date)
    await user.type(screen.getByLabelText('Litros'), String(original.liters).replace('.', ','))
    await user.type(screen.getByLabelText('Valor total pago'), String(original.total).replace('.', ','))
    await user.click(screen.getByRole('button', { name: 'Salvar abastecimento' }))

    const dialog = await screen.findByRole('dialog', { name: /já foi registrado/ })
    await user.click(within(dialog).getByRole('button', { name: /É outro abastecimento/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/motorista'))
    const after = await repository.listFuel({ vehicleId: 'vei-1' })
    expect(after[0].issues.map((i) => i.code)).toContain('possivel_duplicado')
  })

  it('registra despesa de pedágio com dois toques e o valor', async () => {
    const { user, router, repository } = renderApp('/motorista/despesa', 'motorista')
    await user.click(await screen.findByRole('radio', { name: 'Pedágio' }))
    await user.type(screen.getByLabelText('Valor'), '87,40')
    await user.click(screen.getByRole('button', { name: 'Salvar despesa' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/motorista'))
    const list = await repository.listExpenses({ vehicleId: 'vei-1' })
    const created = list.find((e) => e.value === 87.4)
    expect(created?.status).toBe('registrado')
    expect(created?.tripId).toBeTruthy()
  })

  it('oficina pede descrição do serviço', async () => {
    const { user } = renderApp('/motorista/despesa', 'motorista')
    await user.click(await screen.findByRole('radio', { name: 'Oficina e manutenção' }))
    await user.type(screen.getByLabelText('Valor'), '120')
    await user.click(screen.getByRole('button', { name: 'Salvar despesa' }))
    expect(await screen.findByText(/Descreva rapidamente/)).toBeInTheDocument()
  })

  it('encerra a viagem em andamento e valida km menor que a saída', async () => {
    const { user, router } = renderApp('/motorista/viagem', 'motorista')
    const km = await screen.findByLabelText('Km do hodômetro agora')
    await user.type(km, '10')
    await user.click(screen.getByRole('button', { name: 'Encerrar viagem' }))
    expect(await screen.findByText(/não pode ser menor que o da saída/)).toBeInTheDocument()
    await user.clear(km)
    await user.type(km, '999999')
    await user.click(screen.getByRole('button', { name: 'Encerrar viagem' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/motorista'))
    expect(await screen.findByRole('link', { name: /Nova viagem/ })).toBeInTheDocument()
  })

  it('corrige um lançamento devolvido e ele volta para conferência', async () => {
    const { user, repository } = renderApp('/motorista/lancamentos', 'motorista')
    await user.click(await screen.findByRole('button', { name: 'Corrigir e reenviar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Corrigir lançamento' })
    expect(within(dialog).getByText(/Pedido do gestor/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Salvar correção' }))
    await waitFor(async () => {
      const queue = await repository.listReviewQueue()
      expect(queue.some((e) => e.resubmittedAt)).toBe(true)
    })
  })
})
