import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import './index.css'
import { App } from './App'
import { createRepository } from './data/createRepository'

// Rotas profundas no GitHub Pages: o build copia index.html para 404.html (ver vite.config.ts).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App repository={createRepository()} />
  </StrictMode>,
)
