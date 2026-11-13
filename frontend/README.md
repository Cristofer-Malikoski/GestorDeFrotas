# Fretuno — front-end

Interface web do **Fretuno** (nome provisório), plataforma de gestão de fretes e frotas que
substitui a planilha operacional de fretes, abastecimentos, despesas e fechamento mensal.

> **Mais estrada. Menos papelada.**

## Comandos

Requer Node 22+.

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run preview
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento em http://localhost:5173 |
| `npm run lint` | ESLint (TypeScript + regras de hooks) |
| `npm run typecheck` | checagem de tipos |
| `npm test` | testes de domínio e de interface (Vitest + Testing Library) |
| `npm run build` | build de produção em `dist/` (gera também `404.html` para o Pages) |

## Configuração (`.env.example`)

| Variável | Valores | Padrão |
|---|---|---|
| `VITE_DATA_SOURCE` | `mock` (fixtures sintéticas) ou `api` (backend real) | `mock` |
| `VITE_API_BASE_URL` | URL do backend quando `api` | — |
| `VITE_BASE_PATH` | caminho de publicação; no Pages: `/GestorDeFrotas/` | `/` |

Trocar para a API real **não exige mudar componentes**: todos usam a porta
`FleetRepository` (`src/data/repository.ts`); só o adapter muda (`src/data/createRepository.ts`).

## Publicação (GitHub Pages)

O workflow `.github/workflows/frontend-pages.yml` roda lint, testes e build em PRs que tocam
`frontend/` e publica no Pages a cada push em `main`.

Uma única vez no repositório: **Settings → Pages → Source: GitHub Actions**.

Endereço esperado: `https://<usuario>.github.io/GestorDeFrotas/`.

No Windows com Git Bash, para testar o build com base path localmente, use
`MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/GestorDeFrotas/ npm run build` (evita a conversão
automática de caminhos do MSYS).

## Estrutura

```
src/
├── domain/        tipos, rótulos, regras (pendência, duplicidade) e cálculos de relatório
├── data/          porta FleetRepository, adapters mock e HTTP, hooks do TanStack Query
│   └── mock/      fixtures sintéticas determinísticas (12 meses, 2 caminhões)
├── auth/          sessão demonstrativa por perfil
├── components/    design system (ui/), marca (brand/) e layouts
├── features/
│   ├── landing/   landing page, entrada por perfil, 404
│   ├── driver/    jornadas do motorista
│   ├── manager/   jornadas do gestor
│   └── shared/    formulários de abastecimento/despesa, status, documento
└── test/          setup e renderização do app em memória
```

### Design system

Tokens em `src/index.css` (`@theme`). Diretrizes em `docs/product/brand-guidelines.md`.

| Componente | Arquivo | Notas |
|---|---|---|
| `Button` | `components/ui/button.tsx` | variantes `primary` (verde ação), `dark`, `secondary`, `ghost`, `danger`; estado `loading` |
| `Field`, `Input`, `Select`, `Textarea` | `components/ui/field.tsx` | rótulo sempre visível, dica e erro ligados por `aria-describedby` |
| `ChoiceGroup` | `components/ui/choice.tsx` | opções grandes com radio nativo (teclado e leitor de tela) |
| `Sheet` | `components/ui/sheet.tsx` | painel lateral/diálogo (Radix), foco preso e Esc |
| `Table`, `Th`, `Td` | `components/ui/table.tsx` | números tabulares alinhados à direita |
| `Callout`, `Badge` | `components/ui/callout.tsx`, `badge.tsx` | estado sempre com texto e ícone, nunca só cor |
| `EmptyState`, `ErrorState`, `LoadingBlock`, `QueryState` | `components/ui/feedback.tsx` | estados vazio, erro com "tentar novamente" e carregamento |
| `Logo`, `LogoSymbol`, `Photo` | `components/brand/` | logotipo vetorial e fotos AVIF/WebP responsivas |

## O que a demonstração faz de verdade

- Navegação completa por perfil (motorista e gestor), formulários com validação e mensagens
  de erro corrigíveis.
- Regras: pré-preenchimento pelo contexto, pendências com motivo, aviso de duplicidade antes de
  salvar, desfazer após salvar, devolução e reenvio, conferência com confirmação explícita
  quando a leitura é incerta.
- Cálculos: resultado mensal, custo por km, consumo, comparação entre veículos, fechamento
  mensal e resumo de 12 meses, exportação CSV (Excel em pt-BR).

## Limitações (importante)

| Item | Situação na demonstração |
|---|---|
| Dados | **Sintéticos.** Placas `DMO…`, pessoas, clientes, postos, CNPJs e valores inventados |
| Persistência | **Não há servidor.** O que for registrado fica só na aba (sessionStorage); "Restaurar dados" volta ao início |
| Login | **Demonstrativo**, sem senha; o filtro por perfil é feito só na interface |
| Leitura de comprovante (OCR/IA) | **Simulada e rotulada.** Usa um comprovante de exemplo; nenhum arquivo é lido ou enviado |
| Arquivos anexados | Ficam no navegador; não são enviados a lugar nenhum |
| Voz, QR Code da NFC-e | Não implementados (ver `docs/product/ux-research.md`) |
| Modo escuro, app móvel | Fora do escopo desta versão |
| Totais de relatório | Calculados no navegador a partir dos lançamentos; em produção devem vir do backend |

Necessidades de API ainda não atendidas: `docs/product/api-needs.md`.

## Documentação de produto

- `docs/product/ux-research.md` — referências, descobertas, hipóteses e decisões
- `docs/product/user-flows.md` — jornadas e pontos de decisão
- `docs/product/information-architecture.md` — telas e organização
- `docs/product/brand-guidelines.md` — marca Fretuno, cores, tipografia, linguagem
- `docs/product/image-assets.md` — origem e licença de imagens, fontes e ícones
- `docs/product/api-needs.md` — o que o front-end precisa do backend
