# Jornadas e pontos de decisão

> **Status.** As jornadas abaixo são **requisitos confirmados** do briefing. Os limites numéricos citados
> (comprovante acima de R$ 100, preço ±15%, duplicidade ±1%) e a regra de reconhecimento de receita são
> **hipóteses provisórias** — ver `calculation-rules.md`. Nada foi testado com usuários reais.

## Entrada (demonstração)

1. Landing page → botão **Acessar demonstração**.
2. Escolha de perfil: **Entrar como Motorista** ou **Entrar como Gestor** — login demonstrativo, sem senha e
   claramente rotulado; não é autenticação.
3. "Trocar perfil" volta para a escolha. Com a API real (`VITE_DATA_SOURCE=api`), a mesma rota pede e-mail e senha.

Convenções: **[D]** = ponto de decisão do usuário; **[S]** = o sistema decide/sugere;
**[P]** = gera pendência para conferência (não bloqueia).

Estados de um lançamento (abastecimento ou despesa):

| Estado | Significado | Quem vê |
|---|---|---|
| Registrado | Salvo sem nenhum alerta. Entra nos totais. | Motorista e gestor |
| Pendente de conferência | Salvo com alerta (sem comprovante, leitura incerta, possível duplicidade, km inconsistente). Entra nos totais com marcação. | Motorista e gestor |
| Aprovado | Gestor conferiu e aprovou. | Motorista e gestor |
| Devolvido | Gestor pediu correção ao motorista, com motivo. Sai dos totais até corrigir. | Motorista e gestor |

---

## Motorista

### M1. Ver veículo e operação atual
1. Entra no sistema → cai direto em **Início**.
2. Vê: veículo vinculado (placa, modelo, km atual), viagem em andamento (origem → destino, km rodados) e três ações grandes: **Abastecer**, **Despesa**, **Viagem**.
3. Abaixo: últimos lançamentos com estado. Se houver item **Devolvido**, aparece em destaque no topo com o motivo.

Sem dados financeiros sensíveis: o motorista não vê faturamento, frete, resultado ou margens.

### M2. Registrar abastecimento
1. Toca **Abastecer**. **[S]** Já preenchido: veículo, viagem em andamento, data/hora atual, tipo de combustível do veículo, último posto usado.
2. **[D]** Escolhe como informar:
   - **Digitar** (padrão): litros, valor total, km do hodômetro.
   - **Usar comprovante**: anexa a foto. Na demonstração a leitura é **simulada** e a interface diz isso. Campos lidos aparecem preenchidos; os de baixa confiança ficam destacados e exigem marcação "Conferi este valor".
3. **[S]** Calcula e mostra o preço por litro. Se fugir muito do preço recente, mostra um aviso (não bloqueia).
4. **[S]** Valida km: menor que o último registrado → aviso com o km anterior e opção de corrigir.
5. **[S]** Ao salvar, verifica duplicidade (mesmo veículo, mesmo dia, valor ±1%).
   - **[D]** "É outro abastecimento" → salva com **[P]** possível duplicidade.
   - **[D]** "Cancelar" → volta sem salvar.
6. Sem comprovante ou sem km → salva com **[P]**.
7. Feedback: mensagem "Abastecimento registrado" com **Desfazer** e retorno ao Início.

### M3. Registrar despesa (pedágio, estacionamento, oficina…)
1. Toca **Despesa**. **[S]** Veículo, viagem e data já preenchidos.
2. **[D]** Escolhe categoria com botões grandes (as mais usadas primeiro).
3. Informa valor. Campos extras só aparecem quando a categoria exige: oficina → descrição do serviço; outros → descrição.
4. Comprovante opcional; sem comprovante acima de R$ 100 → **[P]**.
5. Mesma verificação de duplicidade e feedback de M2.

### M4. Iniciar ou atualizar viagem
- **Sem viagem em andamento:** **[S]** origem sugerida = destino da última viagem; km inicial = km atual do veículo. **[D]** Informa destino (com sugestões dos destinos recentes) e confirma.
- **Com viagem em andamento:** vê resumo e pode **atualizar km** ou **encerrar viagem** (km final). **[S]** km final menor que o inicial → erro no campo com correção simples.
- Frete (cliente, valor) **não** é pedido ao motorista: é responsabilidade do gestor (princípio 2).

### M5. Conferir e corrigir antes de confirmar
- Todos os formulários mostram o resumo calculado (preço/litro, km desde o último abastecimento) **no mesmo formulário**, antes do botão Salvar. Não há tela de "confirmar" separada para tarefas simples.
- Itens **Devolvidos** podem ser abertos, corrigidos e reenviados; voltam para a conferência marcados como "Corrigido pelo motorista".
- Com comprovante, a data e a hora do cupom substituem "agora" (o motorista não redigita).

### M6. Consultar últimos lançamentos
- Lista cronológica com filtro por tipo (todos, abastecimentos, despesas) e estado.
- Cada item mostra: data, tipo, valor, estado e motivo da pendência, se houver.

---

## Gestor

### G1. Painel
1. Entra → **Painel**. **[D]** Seleciona veículo (todos ou um) e período (mês).
2. Vê 4 indicadores: faturamento (fretes), despesas totais, resultado operacional, custo por km — com comparação ao mês anterior.
3. Vê evolução mensal de 12 meses (barras de receita × despesa, linha de resultado). Meses com prejuízo destacados.
4. Vê **O que precisa da sua atenção**: conferências pendentes, viagens concluídas sem frete, viagem em andamento. Cada item leva direto à tela de ação.

### G2. Conferência de lançamentos
1. Fila ordenada por gravidade (possível duplicidade e leitura incerta primeiro).
2. **[D]** Abre um item: vê os dados, o motivo da pendência, o documento anexado (quando houver) e, para duplicidade, o lançamento parecido lado a lado.
3. **[D]** Ações: **Aprovar**, **Corrigir e aprovar** (edita valor/litros/km), **Devolver ao motorista** (motivo obrigatório), **Excluir duplicado**.
4. Valores financeiros com leitura incerta exigem confirmação explícita do valor antes de aprovar.
5. Após a ação, o próximo item abre automaticamente.

### G3. Viagens e fretes
- Lista de viagens com estado, km e frete. Filtro por veículo/mês.
- **[D]** Registrar frete em viagem existente (cliente, valor, carga) — sem redigitar origem, destino, datas ou km.
- **[D]** Criar nova viagem completa (quando a operação não foi registrada pelo motorista).

### G4. Abastecimentos
- Tabela com data, veículo, posto, litros, valor, R$/L, km/L, estado.
- **[D]** Novo abastecimento (mesmo formulário do motorista com seleção de veículo).
- Consumo médio por veículo no topo.

### G5. Despesas e categorias
- Tabela filtrável por categoria e veículo; total por categoria.
- **[D]** Nova despesa, incluindo custos fixos (seguro, imposto, parcela) que o motorista não lança.
- Categorias: lista com uso e total; o gestor pode criar categoria nova.

### G6. Relatório mensal (fechamento)
1. **[D]** Escolhe veículo e mês.
2. Vê o equivalente à aba mensal da planilha: **Entradas** (fretes), **Saídas** agrupadas (combustível, pedágio, manutenção, fixos…), **Resultado**, km rodados, consumo, custo/km.
3. Alerta se o mês tem pendências não conferidas ("O fechamento pode mudar: 3 lançamentos pendentes").
4. **[D]** Exportar CSV ou imprimir.
5. Aba **Resumo anual**: 12 meses lado a lado, como o resumo da planilha.

### G7. Comparação entre veículos
- Em **Veículos**, quando há mais de um: tabela comparando receita, despesas, resultado, km, km/L e custo/km no período.

### G8. Documentos
- Lista de documentos anexados com tipo, data, lançamento vinculado e se a leitura foi simulada/conferida. Abre a pré-visualização.
