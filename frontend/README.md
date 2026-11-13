# Fretuno — front-end

Interface web do **Fretuno** (nome provisório), plataforma de gestão de fretes e frotas que substitui a
planilha operacional de fretes, abastecimentos, despesas e fechamento mensal.

> **Mais estrada. Menos papelada.**

Demonstração (após publicar): `https://cristofer-malikoski.github.io/GestorDeFrotas/`

## Comandos

Requer Node 22+.

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento em http://localhost:5173 |
| `npm run lint` | ESLint (TypeScript + regras de hooks) |
| `npm run typecheck` | checagem de tipos |
| `npm test` | testes de domínio, adapter HTTP, rotas estáticas e interface (Vitest + Testing Library) |
| `npm run build` | build de produção em `dist/` (gera `404.html` e um `index.html` por rota) |
| `npm run preview` | serve o build localmente |
| `npm run storage:check` | mostra onde cada ferramenta grava (útil no Windows; ver abaixo) |

### Caches no disco F: (opcional, Windows)

```powershell
. .\scripts\dev-env.ps1
```

Aplica, só na sessão do terminal, caches e temporários em `F:\DevCache` (npm, temp, pip, pycache, pytest,
Vite). Sem o disco, apenas avisa. O build e o CI não dependem disso. Detalhes em
`docs/product/dev-environment-storage.md`.

## Configuração (`.env.example`)

| Variável | Valores | Padrão |
|---|---|---|
| `VITE_DATA_SOURCE` | `mock` (fixtures sintéticas) ou `api` (backend real) | `mock` |
| `VITE_API_BASE_URL` | URL do backend quando `api` | — |
| `VITE_BASE_PATH` | caminho de publicação; no Pages: `/GestorDeFrotas/` | `/` |
| `FRETUNO_VITE_CACHE` | pasta de cache do Vite (opcional) | `node_modules/.vite` |

Trocar para a API real **não exige mudar componentes**: tudo passa pela porta `FleetRepository`
(`src/data/repository.ts`). No modo `api`, a tela de entrada pede e-mail e senha e o adapter segue
`contracts/openapi.yaml` (divergências em `docs/product/api-needs.md`).

## Publicação no GitHub Pages

Workflow: `.github/workflows/frontend-pages.yml`.

- Em PRs que tocam `frontend/`: lint, testes, build e conferência da saída estática (sem publicar).
- Push em `main`: publica.
- **Run workflow** manual: publica a partir da branch escolhida, se o ambiente `github-pages` permitir.

Requisitos no repositório (uma vez, pelo dono):

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Para publicar a partir de uma branch que não seja `main`: **Settings → Environments → github-pages →
   Deployment branches and tags** → incluir a branch.

Rotas e refresh: o GitHub Pages não tem fallback de SPA. O build gera um `index.html` em cada rota do app
(`static-routes.ts`) — acesso direto e refresh respondem 200 — e um `404.html` para caminhos desconhecidos,
que mostra a página "rota não existe". Validado localmente com um servidor que reproduz o comportamento do
Pages (redirecionamento para barra final e 404).

Para testar o build com o base path no Windows/Git Bash: `MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/GestorDeFrotas/ npm run build`
(evita a conversão automática de caminhos do MSYS).

## Estrutura

```
src/
├── domain/        tipos, rótulos, regras (pendência, duplicidade) e cálculos de relatório
├── data/          porta FleetRepository, adapters mock e HTTP, hooks do TanStack Query
│   └── mock/      fixtures sintéticas determinísticas (12 meses, 2 caminhões)
├── auth/          sessão demonstrativa por perfil (e sessão real no modo api)
├── components/    design system (ui/), marca (brand/) e layouts
├── features/
│   ├── landing/   landing page, escolha de perfil / login, 404
│   ├── driver/    jornadas do motorista
│   ├── manager/   jornadas do gestor
│   └── shared/    formulários de abastecimento/despesa, status, documento
└── test/          setup e renderização do app em memória
static-routes.ts   rotas publicadas como arquivos estáticos
scripts/           dev-env.ps1 e check-storage.mjs (ambiente local)
```

### Design system

Tokens em `src/index.css` (`@theme`). Diretrizes em `docs/product/brand-guidelines.md`.

| Componente | Arquivo | Notas |
|---|---|---|
| `Button` | `components/ui/button.tsx` | `primary` (verde ação), `dark`, `secondary`, `ghost`, `danger`; estado `loading` |
| `Field`, `Input`, `Select`, `Textarea` | `components/ui/field.tsx` | rótulo sempre visível; dica e erro ligados por `aria-describedby`; sufixo de unidade |
| `ChoiceGroup` | `components/ui/choice.tsx` | opções grandes com radio nativo |
| `Sheet` | `components/ui/sheet.tsx` | painel lateral/diálogo (Radix), foco preso e Esc |
| `Table`, `Th`, `Td` | `components/ui/table.tsx` | números tabulares alinhados à direita |
| `Callout`, `Badge` | `components/ui/callout.tsx`, `badge.tsx` | estado sempre com texto e ícone |
| `EmptyState`, `ErrorState`, `LoadingBlock`, `QueryState` | `components/ui/feedback.tsx` | vazio, erro com "tentar novamente", carregamento |
| `Logo`, `LogoSymbol`, `Photo` | `components/brand/` | logotipo vetorial e fotos AVIF/WebP responsivas |

## O que a demonstração faz de verdade

- Navegação completa por perfil, formulários com validação e mensagens corrigíveis.
- Regras: pré-preenchimento pelo contexto, pendências com motivo, aviso de duplicidade antes de salvar,
  desfazer, devolução e reenvio, conferência com confirmação explícita quando a leitura é incerta.
- Cálculos (ver `docs/product/calculation-rules.md`): resultado, custo por km, consumo pelo hodômetro,
  comparação entre veículos, fechamento mensal e resumo de 12 meses, exportação CSV para Excel.

## Limitações

| Item | Situação na demonstração |
|---|---|
| Dados | **Sintéticos.** Placas `DMO…`, pessoas, clientes, postos, CNPJs e valores inventados |
| Persistência | **Sem servidor.** O que for registrado fica só na aba (sessionStorage); "Restaurar dados" volta ao início |
| Login | **Demonstrativo**, sem senha; o filtro por perfil é feito só na interface |
| Leitura de comprovante | **Simulada e rotulada.** Usa um comprovante de exemplo; nenhum arquivo é lido ou enviado |
| Voz, QR Code da NFC-e, modo escuro, app móvel | Fora do escopo desta versão |
| Totais | Calculados no navegador; em produção devem vir do backend |
