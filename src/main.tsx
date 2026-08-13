import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

const telegram = window.Telegram?.WebApp

if (telegram) {
  const syncViewport = () => {
    const height = telegram.viewportStableHeight || telegram.viewportHeight || window.innerHeight
    const deviceSafeArea = telegram.safeAreaInset
    const contentSafeArea = telegram.contentSafeAreaInset
    const isIosFullscreen = telegram.platform === 'ios' && telegram.isFullscreen
    const safeArea = {
      top: Math.max((deviceSafeArea?.top || 0) + (contentSafeArea?.top || 0), isIosFullscreen ? 112 : 0),
      right: (deviceSafeArea?.right || 0) + (contentSafeArea?.right || 0),
      bottom: (deviceSafeArea?.bottom || 0) + (contentSafeArea?.bottom || 0),
      left: (deviceSafeArea?.left || 0) + (contentSafeArea?.left || 0),
    }

    document.documentElement.style.setProperty('--app-viewport-height', `${Math.round(height)}px`)
    document.documentElement.style.setProperty('--app-safe-top', `${safeArea.top}px`)
    document.documentElement.style.setProperty('--app-safe-right', `${safeArea.right}px`)
    document.documentElement.style.setProperty('--app-safe-bottom', `${safeArea.bottom}px`)
    document.documentElement.style.setProperty('--app-safe-left', `${safeArea.left}px`)
  }

  telegram.setHeaderColor?.('bg_color')
  telegram.setBackgroundColor?.('bg_color')
  if (telegram.isVersionAtLeast?.('7.10')) {
    telegram.setBottomBarColor?.('bottom_bar_bg_color')
  }

  telegram.expand()
  syncViewport()
  telegram.onEvent?.('viewportChanged', syncViewport)
  telegram.onEvent?.('safeAreaChanged', syncViewport)
  telegram.onEvent?.('contentSafeAreaChanged', syncViewport)
  telegram.onEvent?.('fullscreenChanged', syncViewport)
  window.addEventListener('resize', syncViewport)
  telegram.ready()

  if (telegram.isVersionAtLeast?.('8.0') && !telegram.isFullscreen) {
    telegram.requestFullscreen?.()
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
