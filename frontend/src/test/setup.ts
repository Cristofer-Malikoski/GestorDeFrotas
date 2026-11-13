import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup, configure } from '@testing-library/react'

// Páginas são carregadas sob demanda (lazy); a primeira importação no jsdom pode levar alguns segundos.
configure({ asyncUtilTimeout: 6000 })

// Polyfills de APIs de navegador ausentes no jsdom (usadas por Recharts, Radix e Sonner).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
URL.createObjectURL ??= () => 'blob:test'
URL.revokeObjectURL ??= () => {}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
