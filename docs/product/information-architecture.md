# Arquitetura de informação

## Princípios de organização
- Dois espaços separados por perfil, não uma única navegação com itens escondidos.
- O motorista tem **4 destinos**; o gestor tem **8**, agrupados por *acompanhar* e *operar*.
- Mês e veículo são **filtros persistentes** do gestor (não abas copiadas como na planilha).
- Toda tela tem título que diz o que ela responde ("Conferência — 5 lançamentos aguardando você").

## Mapa de telas

```
/entrar                         Escolha de perfil (login demonstrativo)

Motorista  /motorista
├── Início                      Veículo, viagem atual, ações rápidas, últimos lançamentos
├── /abastecer                  Registrar abastecimento (digitar ou comprovante)
├── /despesa                    Registrar despesa (categoria → valor → comprovante)
├── /viagem                     Iniciar, atualizar km ou encerrar viagem
└── /lancamentos                Histórico com estados; corrigir devolvidos (/lancamentos/:id)

Gestor  /gestor
├── Acompanhar
│   ├── Painel                  Indicadores, evolução mensal, atenção necessária
│   ├── /conferencia            "Conferir lançamentos": fila de pendentes → detalhe com ações
│   └── /relatorios             Fechamento mensal | Resumo anual | Exportar
├── Operar
│   ├── /viagens                Viagens e fretes (lista, registrar frete, nova viagem)
│   ├── /abastecimentos         Lista e novo abastecimento
│   ├── /despesas               Lista, novo lançamento, categorias
│   ├── /veiculos               Frota e comparação entre veículos
│   └── /documentos             Comprovantes anexados
```

## Layout

### Motorista
- Barra superior simples: nome, veículo, "Trocar perfil".
- Conteúdo em coluna única de largura confortável (máx. ~720 px), mesmo no desktop, para leitura rápida.
- Ações principais como cartões grandes (alvo ≥ 44 px), sempre no topo do Início.
- Formulários abrem em página própria (não modal), com "Voltar" claro.

### Gestor
- Barra lateral fixa (desktop) com dois grupos; contador de pendências ao lado de "Conferência".
- Cabeçalho da página: título + filtros de veículo e mês + ação primária da tela.
- Tabelas densas mas legíveis: números alinhados à direita com fonte tabular, estado como etiqueta colorida **com texto** (cor nunca é o único indicador).
- Formulários de criação abrem em painel lateral (sheet) para não perder o contexto da lista.

## Objetos e relações

```
Veículo 1─* Viagem 1─0..1 Frete
Veículo 1─* Abastecimento *─0..1 Viagem
Veículo 1─* Despesa       *─0..1 Viagem
Abastecimento/Despesa 0..1─1 Documento
Motorista 1─1 Veículo (vínculo atual)
```

## Vocabulário (pt-BR)

| Termo na interface | Evitar |
|---|---|
| Abastecimento | Fuel entry, lançamento de combustível |
| Despesa | Expense, custo variável |
| Viagem | Trip, rota |
| Frete | Receita de transporte |
| Conferir lançamentos | Auditoria, compliance |
| Comprovante | Documento fiscal, anexo (exceto em Documentos) |
| Resultado | Lucro líquido, EBITDA |
| Pendente de conferência | Flagged, em análise |

## Formatação
- Moeda: `R$ 1.234,56` (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).
- Datas: `13/11/2026`; mês: `nov. 2026` / `Novembro de 2026`.
- Unidades: `1.234 km`, `312,5 L`, `R$ 6,19/L`, `2,61 km/L`.
