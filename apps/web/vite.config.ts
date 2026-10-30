import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${env.API_PORT || 3333}`,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
