import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  // Se preparan al arrancar: si Vite los descubre más tarde, puede empaquetar dos copias de React
  optimizeDeps: { include: ['@phosphor-icons/react'] },
})
