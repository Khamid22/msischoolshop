import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredHosts = (env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

  return {
    base: './',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      allowedHosts: configuredHosts.length > 0
        ? configuredHosts
        : [
            'msishop.up.railway.app',
            'msi-shop-development.up.railway.app',
            'shop-telegram-bot-development.up.railway.app',
          ],
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'admin.html'),
          'admin-login': resolve(__dirname, 'admin-login.html'),
          'admin-sso': resolve(__dirname, 'admin-sso.html'),
        },
      },
    },
  }
})
