import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router'
import { routes } from '@/App'
import { STATIC_ROUTES } from '../../static-routes'

/** Toda rota do app precisa de um index.html estático no build do GitHub Pages (e vice-versa). */
function paths(list: RouteObject[], prefix = ''): string[] {
  return list.flatMap((r) => {
    const here = r.index ? prefix : r.path ? `${prefix}/${r.path}`.replace(/\/+/g, '/') : prefix
    return [...(r.path || r.index ? [here] : []), ...(r.children ? paths(r.children, here) : [])]
  })
}

describe('rotas estáticas do GitHub Pages', () => {
  it('coincidem com as rotas do React Router', () => {
    const appRoutes = [...new Set(paths(routes).map((p) => p.replace(/^\//, '')))].filter((p) => p && p !== '*')
    expect([...appRoutes].sort()).toEqual([...STATIC_ROUTES].sort())
  })
})
