import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

const telegram = window.Telegram?.WebApp

if (telegram) {
  const syncViewport = () => {
    const height = telegram.viewportStableHeight || telegram.viewportHeight || window.innerHeight
    const deviceSafeArea = telegram.safeAreaInset
    const contentSafeArea = telegram.contentSafeAreaInset
    const safeArea = {
      top: Math.max(deviceSafeArea?.top || 0, contentSafeArea?.top || 0),
      right: Math.max(deviceSafeArea?.right || 0, contentSafeArea?.right || 0),
      bottom: Math.max(deviceSafeArea?.bottom || 0, contentSafeArea?.bottom || 0),
      left: Math.max(deviceSafeArea?.left || 0, contentSafeArea?.left || 0),
    }

    document.documentElement.style.setProperty('--app-viewport-height', `${Math.round(height)}px`)
    document.documentElement.style.setProperty('--app-safe-top', `${safeArea.top}px`)
    document.documentElement.style.setProperty('--app-safe-right', `${safeArea.right}px`)
    document.documentElement.style.setProperty('--app-safe-bottom', `${safeArea.bottom}px`)
    document.documentElement.style.setProperty('--app-safe-left', `${safeArea.left}px`)
  }

  telegram.expand()
  syncViewport()
  telegram.onEvent?.('viewportChanged', syncViewport)
  telegram.onEvent?.('safeAreaChanged', syncViewport)
  telegram.onEvent?.('contentSafeAreaChanged', syncViewport)
  window.addEventListener('resize', syncViewport)
  telegram.ready()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
