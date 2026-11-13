/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { STATIC_ROUTES } from './static-routes'

// GitHub Pages publica em https://<usuario>.github.io/<repositorio>/.
// O workflow define VITE_BASE_PATH=/GestorDeFrotas/; localmente o padrão é "/".
const base = process.env.VITE_BASE_PATH ?? '/'


/**
 * GitHub Pages não tem fallback de SPA. Para acesso direto e refresh:
 * - cada rota conhecida ganha um index.html próprio (resposta 200, sem erro no console);
 * - qualquer outro caminho cai no 404.html, que é o mesmo app e mostra a página "rota não existe".
 */
function staticSpaRoutes(): Plugin {
  return {
    name: 'static-spa-routes',
    apply: 'build',
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist', import.meta.url))
      copyFileSync(`${dist}/index.html`, `${dist}/404.html`)
      for (const route of STATIC_ROUTES) {
        mkdirSync(`${dist}/${route}`, { recursive: true })
        copyFileSync(`${dist}/index.html`, `${dist}/${route}/index.html`)
      }
    },
  }
}

export default defineConfig({
  base,
  // Cache do Vite/Vitest: padrao node_modules/.vite. Opcional: FRETUNO_VITE_CACHE (scripts/dev-env.ps1).
  // Sem a variavel (ex.: CI), o comportamento padrao do Vite nao muda.
  cacheDir: process.env.FRETUNO_VITE_CACHE || undefined,
  plugins: [react(), tailwindcss(), staticSpaRoutes()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 15000,
  },
})
