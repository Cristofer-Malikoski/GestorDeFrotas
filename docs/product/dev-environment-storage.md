# Ambiente de desenvolvimento: caches e temporários no disco F:

Contexto: o disco C: da máquina de desenvolvimento tem pouco espaço livre. O projeto fica em
`F:\GestorDeFrotas`. Este documento cobre **apenas o front-end** (`frontend/`).

## Situação verificada (13/11/2026)

| Item | Caminho efetivo | Origem da configuração |
|---|---|---|
| Repositório e worktree | `F:\GestorDeFrotas`, `F:\GestorDeFrotas\.worktrees\frontend` | — |
| `node_modules`, `dist`, cache do Vite/Vitest, buildinfo do TypeScript | dentro de `frontend/` (F:) | padrão das ferramentas |
| Cache do npm | `F:\monorepo\.cache\npm` | variável de usuário `npm_config_cache` |
| Temporários (TEMP/TMP) | `F:\monorepo\.cache\tmp` | variáveis de usuário |
| Cache do pip | **`C:\Users\<usuário>\AppData\Local\pip\cache`** | padrão (sem `PIP_CACHE_DIR`) |

O front-end não usa Python; o cache do pip aparece aqui porque a mesma máquina roda o backend.

## Script opcional: `frontend/scripts/dev-env.ps1`

```powershell
cd F:\GestorDeFrotas\.worktrees\frontend\frontend
. .\scripts\dev-env.ps1
npm run storage:check
```

- Define **só para a sessão do terminal**: `npm_config_cache`, `TEMP`/`TMP`, `PIP_CACHE_DIR`,
  `PYTHONPYCACHEPREFIX`, `PYTEST_ADDOPTS` (acrescenta `cache_dir`) e `FRETUNO_VITE_CACHE`, todos sob `F:\DevCache`.
- Raiz alternativa: `. .\scripts\dev-env.ps1 -CacheRoot 'F:\OutroLugar'` ou `$env:FRETUNO_CACHE_ROOT`.
- Sem o disco indicado, mostra um aviso e **não altera nada**.
- Não muda variáveis persistentes do Windows, não move e não apaga arquivos.

`npm run storage:check` lista onde cada ferramenta vai gravar e marca com `C:` o que ainda cai no C:.
Fora do Windows (CI do GitHub), apenas informa que a checagem não se aplica.

## Portabilidade (CI/Linux)

- `vite.config.ts` usa `FRETUNO_VITE_CACHE` **somente se** a variável existir; sem ela, o Vite usa o
  padrão (`node_modules/.vite`). O workflow do GitHub Pages não usa o script nem caminhos do Windows.
- Não há `.npmrc` com caminho de Windows no repositório.

## Para tornar permanente (requer decisão do usuário)

O script não faz isto. Se desejado, definir **variáveis de usuário** do Windows:

| Variável | Valor sugerido | Efeito |
|---|---|---|
| `PIP_CACHE_DIR` | `F:\DevCache\pip` | novos downloads do pip deixam de ir para o C: |
| `PYTHONPYCACHEPREFIX` | `F:\DevCache\python\pycache` | `__pycache__` fora das pastas de código |

O cache antigo do pip no C: pode ser removido depois de validar (`python -m pip cache dir` apontando
para o F:). Não foi removido automaticamente.

## Limitações conhecidas

- Ferramentas que não respeitam TEMP/variáveis (ex.: dados do próprio VS Code, Codex e Claude Code
  em `%USERPROFILE%`) continuam no C:. Mover esses diretórios exige fechar os programas e é decisão do usuário.
- O TEMP de nível máquina (`C:\Windows\TEMP`) é usado por serviços do Windows, não pelo projeto.
