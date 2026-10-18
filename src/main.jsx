import React from 'react'
import ReactDOM from 'react-dom/client'
import './perf'
import App from './App.jsx'
import './styles/global.css'
import './styles/cinema.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register the service worker so the site is installable and works offline.
// Production only — a SW in dev fights Vite's HMR and caches stale modules.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW is a progressive enhancement — the site works fine without it */
    })
  })
}
