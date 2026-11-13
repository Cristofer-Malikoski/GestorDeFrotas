<#
  Fretuno - caches e temporarios de desenvolvimento no disco F: (quando existir)

  Uso (PowerShell, na pasta frontend/):
      . .\scripts\dev-env.ps1          # aplica as variaveis SO nesta sessao do terminal
      npm run storage:check            # mostra onde cada ferramenta vai gravar

  - Nao altera variaveis persistentes do Windows, nao move e nao apaga nada.
  - Sem o disco indicado, nao faz nada: os padroes das ferramentas continuam valendo.
  - O build e o CI nao dependem deste script.
  Detalhes: docs/product/dev-environment-storage.md
#>
param(
  # Raiz dos caches. Padrao: $env:FRETUNO_CACHE_ROOT ou F:\DevCache.
  [string]$CacheRoot = $(if ($env:FRETUNO_CACHE_ROOT) { $env:FRETUNO_CACHE_ROOT } else { 'F:\DevCache' })
)

$drive = Split-Path -Qualifier $CacheRoot
if (-not $drive -or -not (Test-Path "$drive\")) {
  Write-Warning "Disco $drive indisponivel: nada foi alterado; as ferramentas usam seus caminhos padrao."
  return
}
# O Fretuno nao compartilha caches nem temporarios com outros projetos (ex.: F:\monorepo).
if ($CacheRoot.TrimEnd('\') -like 'F:\monorepo*') {
  Write-Warning "CacheRoot dentro de F:\monorepo nao e permitido para o Fretuno. Nada foi alterado."
  return
}

$dirs = [ordered]@{
  npm    = Join-Path $CacheRoot 'npm'
  global = Join-Path $CacheRoot 'npm-global'
  pip    = Join-Path $CacheRoot 'pip'
  temp   = Join-Path $CacheRoot 'temp'
  pytest = Join-Path $CacheRoot 'pytest'
  vite   = Join-Path $CacheRoot 'vite'
  python = Join-Path $CacheRoot 'python'
}
foreach ($d in $dirs.Values) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

$env:FRETUNO_CACHE_ROOT  = $CacheRoot
$env:npm_config_cache    = $dirs.npm                       # npm / npx
$env:npm_config_prefix   = $dirs.global                    # npm -g nao grava na instalacao de outro projeto
$env:TEMP                = $dirs.temp                      # Node os.tmpdir, Python tempfile, Chrome, Vitest
$env:TMP                 = $dirs.temp
$env:PIP_CACHE_DIR       = $dirs.pip                       # padrao no Windows: %LOCALAPPDATA%\pip\cache (C:)
$env:PYTHONPYCACHEPREFIX = Join-Path $dirs.python 'pycache'
$env:FRETUNO_VITE_CACHE  = $dirs.vite                      # lido por vite.config.ts (cacheDir)

# pytest: acrescenta o cache_dir sem descartar opcoes ja definidas.
$pytestOpt = "-o cache_dir=$($dirs.pytest)"
if (-not $env:PYTEST_ADDOPTS) { $env:PYTEST_ADDOPTS = $pytestOpt }
elseif ($env:PYTEST_ADDOPTS -notmatch 'cache_dir=') { $env:PYTEST_ADDOPTS = "$($env:PYTEST_ADDOPTS) $pytestOpt" }

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($node -like 'F:\monorepo*') {
  Write-Warning "O Node em uso vem de $node (ferramentas de outro projeto). Funciona, mas nao e isolado; ver docs/product/dev-environment-storage.md."
}

Write-Host "Fretuno: caches desta sessao em $CacheRoot" -ForegroundColor Green
$dirs.GetEnumerator() | ForEach-Object { Write-Host ('  {0,-7} {1}' -f $_.Key, $_.Value) }
Write-Host 'Confira com: npm run storage:check'
