import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5200,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5080',
          changeOrigin: true,
          secure: false,
        },
        '/hubs': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5080',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      port: 5201,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@govie-ds/react'],
          },
        },
      },
    },
  }
})
