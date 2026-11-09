import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.devtunnels.ms'],
    proxy: Object.fromEntries(
      ['/auth', '/users', '/productos', '/recommendations', '/sales'].map((path) => [
        path,
        {
          target: 'http://127.0.0.1:5300',
          changeOrigin: true,
        },
      ]),
    ),
  },
})
