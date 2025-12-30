import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, copyFileSync, existsSync, mkdirSync } from 'fs'

// Función para copiar archivos estáticos
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    buildStart() {
      const publicDir = resolve(fileURLToPath(import.meta.url), '../public')
      const distDir = resolve(fileURLToPath(import.meta.url), '../dist')
      
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true })
      }
      
      const files = readdirSync(publicDir)
      files.forEach(file => {
        if (file !== 'index.html') {
          const src = resolve(publicDir, file)
          const dest = resolve(distDir, file)
          copyFileSync(src, dest)
        }
      })
    }
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), copyStaticFiles()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop() || ''
          if (['mp3', 'mp4', 'jpeg', 'jpg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
            return `assets/[name][extname]`
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  server: {
    port: 3000
  }
});
