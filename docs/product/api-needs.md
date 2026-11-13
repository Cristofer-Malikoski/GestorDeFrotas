# Necessidades de API do front-end

> **Atualização (13/11/2026):** o Codex publicou `contracts/openapi.yaml` na branch
> `codex/backend-foundation` (rotas `/api/v1/...`: `auth`, `vehicles`, `drivers`, `trips` (+ `freight`,
> `recognize-freight`, `review`), `fuelings`, `expenses`, `revenues`, `categories`,
> `financial-policies`, `pending-entries` (+ `confirm`/`reject`), `documents` (+ `content`/`extract`),
> `analytics/dashboard`, `vehicles/{id}/cost-profile`, `simulations/freight`). O adapter HTTP do
> front-end **ainda usa os caminhos provisórios** e precisa ser alinhado a esse contrato
> (mapeamento DTO → `domain/types.ts`); o modo demonstração não é afetado. A lista abaixo
> segue útil para conferir cobertura.
>
> **Status original:** `contracts/openapi.yaml` ainda não existia quando o front-end foi construído.
> Este documento lista o que a interface precisa — **não** é uma proposta de contrato
> definitivo. Nomes de rotas e campos abaixo são ilustrativos; o contrato publicado pelo
> backend prevalece. Quando ele existir, o ajuste fica concentrado em
> `frontend/src/data/http/httpRepository.ts` (constante `PATHS`) e, se necessário, num
> mapeamento de tipos para `frontend/src/domain/types.ts`.

A interface consome tudo pela porta `FleetRepository` (`frontend/src/data/repository.ts`).
Cada método abaixo precisa de um equivalente na API.

## 1. Autenticação e perfis (bloqueante para produção)

| Necessidade | Por quê |
|---|---|
| Login com usuário/senha (ou link mágico) e token de sessão | Hoje a entrada é demonstrativa, sem senha |
| Perfil no token: `motorista` ou `gestor`, `driverId`, `vehicleId` vinculado | A interface decide navegação e filtros pelo perfil |
| **Autorização no servidor**: motorista só lê/escreve seus lançamentos e seu veículo; nunca recebe `freight`, faturamento ou resultado | Hoje o filtro é só na interface — insuficiente para dados reais |
| Respeitar WCAG 2.2 3.3.8 (sem teste cognitivo no login) | Público com pouca familiaridade tecnológica |

## 2. Cadastros

| Método do repositório | Dados necessários |
|---|---|
| `listVehicles` | id, placa, modelo, ano, descrição, tipo de combustível, hodômetro atual, motorista vinculado, ativo |
| `listDrivers` | id, nome, veículo vinculado |
| `listCategories` / `createCategory` | id, nome, grupo do fechamento (`viagem`, `manutencao`, `fixo`, `pessoal`, `impostos`, `outros`), se o motorista pode lançar, se exige descrição |

## 3. Viagens e fretes

| Método | Observações |
|---|---|
| `listTrips(filtro)` | filtros por veículo, motorista e mês |
| `startTrip` | recusar se já houver viagem em andamento para o veículo (mensagem legível) |
| `updateTripKm`, `finishTrip` | validar km ≥ km de saída; atualizar hodômetro do veículo |
| `createTrip` | criação completa pelo gestor (com ou sem frete) |
| `setFreight` | cliente, carga, valor — **somente gestor** |

## 4. Lançamentos (abastecimentos e despesas)

| Necessidade | Detalhe |
|---|---|
| Criar com **verificação de duplicidade** | Resposta distinguível entre "criado" e "possível duplicidade" (com os lançamentos parecidos), e reenvio com `allowDuplicate=true`. Regra usada no mock: mesmo veículo + tipo (+ categoria) + mesmo dia + valor ±1% |
| Calcular pendências no servidor | Códigos: `sem_comprovante`, `km_ausente`, `km_inconsistente`, `possivel_duplicado`, `leitura_incerta`, `preco_atipico`, cada um com mensagem legível |
| Estados | `registrado`, `pendente`, `aprovado`, `devolvido` (+ motivo), `resubmittedAt` quando o motorista corrige um devolvido |
| Desfazer | `DELETE` permitido ao autor por alguns minutos após criar |
| Correção | `PATCH` reavalia as pendências |
| Fila de conferência | pendentes ordenados por gravidade |
| Decisão do gestor | aprovar (com correções opcionais), devolver (motivo obrigatório), excluir duplicado; registrar quem e quando |
| Idempotência | chave de idempotência no `POST` para evitar duplicidade por duplo clique ou rede instável |

## 5. Documentos

| Necessidade | Detalhe |
|---|---|
| Upload `multipart/form-data` (imagem/PDF) com limite de tamanho | Retornar id e URL de visualização com expiração |
| Extração **assíncrona** com confiança por campo | Campos: posto/emitente, litros, valor total, data, descrição; confiança `alta`/`baixa`; status `processando`/`concluída`/`falhou` |
| Indicar a origem da extração | OCR, QR Code da NFC-e ou manual — a interface mostra isso ao usuário |
| Vincular documento ↔ lançamento | um documento por lançamento (mínimo) |

**Hipótese a investigar (não implementada):** ler o QR Code da NFC-e e consultar a SEFAZ dá
dados estruturados (CNPJ, total, data, itens) mais confiáveis que OCR. Ver `ux-research.md` §3.1.

## 6. Relatórios

Hoje o mock entrega dados brutos (`getReportData`) e a interface calcula os totais.
Para produção recomenda-se que o backend entregue os agregados:

| Necessidade | Campos |
|---|---|
| Resumo mensal por veículo ou frota | faturamento, despesas por categoria e grupo, resultado, km, litros, km/L, custo/km, nº de pendentes |
| Série de 12 meses | mesmos campos por mês |
| Exportação | CSV/XLSX gerado no servidor (hoje gerado no navegador) |
| Regra de reconhecimento de receita | hoje: frete entra no mês de **conclusão** da viagem — confirmar com o negócio |

## 7. Simulador de rentabilidade (trabalho futuro)

Para "Vale a pena esse frete?" serão necessários custos médios por km do histórico
(combustível, pneus, manutenção, pedágio por rota), parâmetros configuráveis (comissão,
tributos, custos fixos rateados) e, depois da viagem, previsto × realizado. A especificar
junto com `docs/product/freight-simulator-ux.md`.

## 8. Erros

A interface exibe `detail` ou `message` do corpo de erro. Mensagens devem ser em português,
dizer o que aconteceu e como corrigir (ex.: "O km final não pode ser menor que o km de saída").
