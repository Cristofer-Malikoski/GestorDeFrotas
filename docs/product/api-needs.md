# Front-end × API: alinhamento e divergências

**Contrato de referência:** `contracts/openapi.yaml` na branch `codex/backend-foundation`, commit `1dca59b`
(mantido pelo Codex; não alterado pelo front-end). O diff ainda não commitado do contrato, analisado em
13/11/2026, só **acrescenta** campos opcionais em `Fueling*` (`full_tank`, `fuel_type`, `region`) e as rotas
de simulação/rentabilidade; a parte central está estável.

**Adapter:** `frontend/src/data/http/httpRepository.ts` (ativado com `VITE_DATA_SOURCE=api`).
O modo demonstração (`mock`) não depende de nada disto.

## 1. O que já está alinhado ao contrato

| Tema | Contrato | Adapter |
|---|---|---|
| Base e autenticação | `/api/v1`, Bearer; `POST /auth/login {company_slug, email, password}`; `GET /auth/me` | Tela de login real no modo `api`; token só na sessão da aba |
| Paginação | `{items, total, offset, limit}`, `limit ≤ 100` | Busca todas as páginas |
| Dinheiro | inteiros em centavos (`*_cents`) | Converte ↔ reais |
| Decimais | strings (`liters`, `odometer_km`) | Converte ↔ número |
| Datas | `occurred_on` (AAAA-MM-DD) | Envia só a data; telas omitem a hora quando ela não existe |
| Erros | `{error: {code, message, details}}` | Mostra `error.message` (+ detalhes de validação) |
| Viagens | `/trips`, `PATCH` para encerrar (`status: completed`, `end_odometer_km`) | Mapeado |
| Frete | `PUT /trips/{id}/freight {gross_cents, deductions}`; cliente/carga em `contractor`/`commodity` | Mapeado |
| Abastecimentos/despesas | `/fuelings`, `/expenses` (CRUD) | Mapeado |
| Conferência | `POST /{fuelings|expenses}/{id}/review {review_status}` | Aprovar → `approved`; correção antes via `PATCH` |
| Documentos | `POST /documents` (multipart), `POST /documents/{id}/extract` → `PendingRead` | Upload real + proposta de extração |
| Categorias | `/categories` | Mapeado |

Testes do adapter com respostas no formato do contrato: `frontend/src/data/http/__tests__/httpRepository.test.ts`.

## 2. Divergências (o que a interface precisa e o contrato ainda não oferece)

Gravidade: **A** = afeta regra ou dado financeiro; **M** = degrada a experiência; **B** = cosmético.

| # | Grav. | Tema | Situação no contrato | O que o adapter faz hoje | Necessidade |
|---|---|---|---|---|---|
| 1 | A | Autorização por perfil | perfil `driver` sem vínculo direto com motorista/veículo em `/auth/me` | Busca `/drivers` e casa `user_id` | `/auth/me` com `driver_id` e `vehicle_id`; servidor filtrando dados do motorista e **sem expor frete/resultado** a ele |
| 2 | A | Duplicidade | não detecta em lançamentos manuais (só em importação) | Checa no cliente antes do `POST` | Resposta "possível duplicidade" + confirmação explícita (`allow_duplicate`), e chave de idempotência |
| 3 | A | Devolver ao motorista | `review_status: rejected` sem motivo nem reenvio | Usa `rejected`; o motivo se perde | Campo de motivo, estado "devolvido" e histórico de reenvio |
| 4 | A | Motivos de pendência | não há; só `warnings` em extração/dashboard | Infere no cliente (sem km, sem comprovante) | Lista de motivos calculada no servidor (ver `calculation-rules.md`) |
| 5 | A | Estado inicial | todo lançamento nasce `pending` | Tudo vai para a fila de conferência | Distinguir "registrado sem pendência" de "pendente" |
| 6 | A | Relatórios por veículo | `/analytics/dashboard` só da frota, sem linhas por categoria | Calcula no cliente a partir das listas | Resumo mensal por veículo e por categoria/grupo; série de 12 meses |
| 7 | A | Receita | entidade `revenues` + `recognize-freight` | Usa o frete da viagem concluída como receita | Definir regra única de reconhecimento e usá-la no dashboard |
| 8 | M | Km parcial da viagem | não existe | "Atualizar km" retorna erro claro | Registro de km intermediário (com data) |
| 9 | M | Data de chegada da viagem | não existe | Usa `occurred_on` da viagem | Campo de data de chegada |
| 10 | M | Hora dos lançamentos | só data | Telas sem hora | Data e hora (ajuda a detectar duplicidade) |
| 11 | M | Frete na listagem | frete em rota separada | Uma chamada por viagem | Frete embutido em `GET /trips` |
| 12 | M | Lançamento genérico | rotas separadas por tipo | Descobre o tipo tentando `/fuelings/{id}` | Fila de conferência unificada ou tipo no id |
| 13 | M | Categoria | só `name` | Grupo "Outros", motorista pode usar, sem descrição obrigatória | `group`, `driver_can_use`, `needs_description` |
| 14 | M | Veículo | só `plate`, `name` | Modelo = `name`; ano, combustível e hodômetro vazios | `model`, `year`, `fuel_type`, hodômetro atual |
| 15 | M | Documento | sem tipo, veículo ou vínculo | Tipo inferido do arquivo | `kind`, `vehicle_id`, vínculo com o lançamento |
| 16 | M | Extração | `payload` livre, sem confiança por campo | Todos os campos tratados como "a conferir" | Campos tipados com confiança por campo |
| 17 | B | Pré-visualização de documento | `GET /documents/{id}/content` exige Bearer | Mostra só nome/tipo | URL temporária ou leitura como blob |
| 18 | B | Tipo de combustível | só no diff não commitado (`fuel_type` texto livre) | Mapeia texto → Diesel S10/S500/Arla | Enum |

## 3. Conceitos do contrato ainda sem tela

`revenues`, `financial-policies`, `pending-entries` (fluxo de propostas), `imports` (CSV/XLSX/Google Sheets),
revisão de viagens, deduções do frete, multi-moeda e as rotas de simulação de frete (escopo do simulador,
ainda não iniciado). A importação da planilha (`/imports`) é especialmente relevante para a migração do
histórico do cliente.

## 4. Ordem sugerida para a integração

1. Itens 1, 3, 5 e 4 (perfil, devolução, estado inicial, motivos) — mudam regra de negócio.
2. Itens 2 e 6/7 (duplicidade, relatórios, receita) — consistência financeira.
3. Itens 8–16 — completam os formulários sem dados vazios.
