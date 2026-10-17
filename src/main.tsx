import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Acceso a la tienda desde la consola durante el desarrollo
if (import.meta.env.DEV) {
  import('./game/store').then(({ useGrove }) => Object.assign(window, { grove: useGrove }))
}
