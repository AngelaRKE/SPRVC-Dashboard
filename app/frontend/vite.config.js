import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El "proxy" manda todas las peticiones que empiezan con /api al backend de Python (puerto 8000).
// Así React y FastAPI parecen un solo sitio y no hay problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
})
