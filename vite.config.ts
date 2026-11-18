import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function copyPdfjsAssets() {
  const dest = path.resolve(rootDir, 'public/pdfjs')
  const copies: Array<[string, string]> = [
    ['node_modules/pdfjs-dist/cmaps', 'cmaps'],
    ['node_modules/pdfjs-dist/standard_fonts', 'standard_fonts'],
    ['node_modules/pdfjs-dist/iccs', 'iccs'],
  ]
  fs.mkdirSync(dest, { recursive: true })
  for (const [from, to] of copies) {
    fs.cpSync(path.resolve(rootDir, from), path.join(dest, to), { recursive: true })
  }
  fs.copyFileSync(
    path.resolve(rootDir, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    path.join(dest, 'pdf.worker.min.mjs'),
  )
}

copyPdfjsAssets()

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4789,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4789,
    strictPort: true,
    allowedHosts: true,
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'pdf-lib', '@pdf-lib/fontkit'],
  },
  worker: {
    format: 'es',
  },
})
