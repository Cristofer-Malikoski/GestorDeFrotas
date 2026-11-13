#!/usr/bin/env node
/**
 * Mostra onde cada ferramenta do front-end vai gravar e avisa o que cai no C:.
 * Só lê configurações; não cria, move nem apaga nada.
 *   npm run storage:check
 */
import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const project = path.resolve(here, '..')
const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return '(indisponível)'
  }
}

const rows = [
  ['Projeto (frontend/)', project],
  ['Git: raiz da worktree', run('git rev-parse --show-toplevel')],
  ['Git: repositório (.git)', run('git rev-parse --git-common-dir')],
  ['Node (executável)', process.execPath],
  ['npm cache', run('npm config get cache')],
  ['npm global (prefix)', run('npm config get prefix')],
  ['Temporários (os.tmpdir)', os.tmpdir()],
  ['node_modules', path.join(project, 'node_modules')],
  ['Vite/Vitest cache', process.env.FRETUNO_VITE_CACHE || path.join(project, 'node_modules', '.vite')],
  ['TypeScript buildinfo', path.join(project, 'node_modules', '.tmp')],
  ['Build (dist)', path.join(project, 'dist')],
  ['Python (executável)', run('python -c "import sys;print(sys.executable)"')],
  ['pip cache', run('python -m pip cache dir')],
  ['Python tempfile', run('python -c "import tempfile;print(tempfile.gettempdir())"')],
  ['Python pycache prefix', process.env.PYTHONPYCACHEPREFIX || '(padrão: __pycache__ ao lado do código)'],
  ['pytest cache', process.env.PYTEST_ADDOPTS || '(padrão: .pytest_cache na pasta do projeto)'],
]

const onWindows = process.platform === 'win32'
let warnings = 0
const width = Math.max(...rows.map(([k]) => k.length))
let shared = 0
for (const [label, value] of rows) {
  const onC = onWindows && /^c:/i.test(value)
  // Caminhos dentro de outro projeto (ex.: F:\monorepo) nao sao isolados.
  const other = onWindows && /^f:[\\/]monorepo/i.test(value)
  if (onC) warnings++
  if (other) shared++
  console.log(`${onC ? 'C:' : other ? 'M!' : '  '} ${label.padEnd(width)}  ${value}`)
}
console.log('')
if (!onWindows) console.log('Fora do Windows: verificação de disco não se aplica (ex.: CI do GitHub).')
else if (warnings) console.log(`${warnings} caminho(s) ainda no C:. Rode ". .\\scripts\\dev-env.ps1" e confira de novo.`)
else console.log('Tudo no F: (ou relativo ao projeto).')
if (shared) {
  console.log(`${shared} caminho(s) marcados com M! ficam dentro de F:\\monorepo (outro projeto).`)
  console.log('Use ". .\\scripts\\dev-env.ps1" para isolar caches e temporarios do Fretuno.')
}
