# Regras de cálculo e parâmetros (front-end / demonstração)

Fonte única no código: `frontend/src/domain/rules.ts` e `frontend/src/domain/reports.ts`.
Na integração, o **backend** deve ser a fonte de verdade; estas regras servem para a
demonstração e para conferir números. Nada aqui ajusta resultados para "parecer realista":
todo total sai dos lançamentos.

## Fórmulas do fechamento

| Indicador | Fórmula |
|---|---|
| Faturamento do mês | Σ valor do frete das viagens **concluídas** no mês (mês da data de chegada) |
| Despesas do mês | Σ abastecimentos + Σ despesas do mês, **exceto** lançamentos devolvidos ao motorista |
| Resultado | Faturamento − Despesas |
| Margem | Resultado ÷ Faturamento |
| Km rodados | Σ (km de chegada − km de saída) das viagens iniciadas no mês; em andamento, até o último km informado |
| Custo por km | Despesas ÷ Km rodados (inclui custos fixos) |
| Consumo (km/L) | pelo hodômetro: Σ km entre abastecimentos consecutivos com km ÷ Σ litros desses abastecimentos (razão das somas; Arla e devolvidos ficam fora) |
| Frete por km (viagem) | Valor do frete ÷ km da viagem, só para viagem concluída |

Lançamentos **pendentes** entram nos totais e o fechamento avisa quantos ainda não foram conferidos.

## Pendências (conferência)

| Código | Quando | Bloqueia? |
|---|---|---|
| `sem_comprovante` | abastecimento sem anexo; despesa sem anexo acima de R$ 100 (exceto pedágio e estacionamento) | Não |
| `km_ausente` | abastecimento sem km | Não |
| `km_inconsistente` | km menor que o último km comprovadamente anterior à data | Não |
| `preco_atipico` | preço por litro difere mais de 15% da média dos 5 abastecimentos anteriores | Não |
| `leitura_incerta` | comprovante com campo de baixa confiança | Não, mas exige confirmação explícita do motorista e do gestor |
| `possivel_duplicado` | mesmo veículo, tipo (e categoria), mesmo dia e valor ±1% | Não; o usuário decide antes de salvar |

## Parâmetros provisórios (HIPÓTESES — validar com o negócio)

| Parâmetro | Valor atual | Onde |
|---|---|---|
| Tolerância de duplicidade | 1% do valor | `DUPLICATE_TOLERANCE` |
| Desvio de preço por litro | 15% | `PRICE_DEVIATION` |
| Despesa que exige comprovante | acima de R$ 100 | `RECEIPT_REQUIRED_ABOVE` |
| Categorias sem comprovante | pedágio, estacionamento | `RECEIPT_EXEMPT` |
| Reconhecimento de receita | mês de conclusão da viagem | `tripRevenueMonth` |
| Imposto sobre faturamento (só fixtures) | 6,2% dos fretes do mês | `TAX_RATE` em `fixtures.ts` |

## Como as fixtures são geradas

Determinísticas (semente fixa) para os 12 meses que terminam no mês corrente:

- frete = km da rota × tarifa da rota (× 0,82 no retorno) × variação de ±5%;
- litros = km desde o último abastecimento ÷ consumo do veículo (± 3%); valor = litros × preço do mês;
- custos fixos mensais (salário, parcela, seguro, rastreamento) e manutenções pontuais
  (retífica em um mês — origem do mês com prejuízo);
- imposto estimado = `TAX_RATE` × fretes concluídos no mês, calculado depois de todos os ajustes;
- casos especiais (incompleto, duplicado, leitura incerta, preço atípico) partem de abastecimentos
  gerados e recebem as pendências calculadas pelas regras acima.

Testes de reconciliação: `frontend/src/domain/__tests__/fixtures-consistency.test.ts`.
