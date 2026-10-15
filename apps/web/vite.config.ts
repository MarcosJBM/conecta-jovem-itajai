import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${env.API_PORT || 3333}`,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
