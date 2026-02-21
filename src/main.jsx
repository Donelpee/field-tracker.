import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './lib/ToastContext'

// Recover from stale chunk/preload errors after new deployments.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const retryKey = 'vite-preload-reload-attempted'
  if (sessionStorage.getItem(retryKey) === '1') return
  sessionStorage.setItem(retryKey, '1')
  window.location.reload()
})

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
