import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Questo è fondamentale per GitHub Pages:
  // Imposta i percorsi come relativi (./) invece che assoluti (/)
  base: './', 
})