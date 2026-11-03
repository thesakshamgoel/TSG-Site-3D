import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// The public address, used for the canonical link and the share image. The
// deploy workflow sets it; this default keeps local builds working.
process.env.VITE_SITE_URL ||= 'https://thesakshamgoel.github.io/TSG-Site-3D/'

// GitHub Pages serves a project site from /<repo>/, so the deploy workflow
// sets VITE_BASE. Locally and on a custom domain it stays '/'.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1400,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ['framer-motion'],
          // separate chunk: downloads in parallel and stays cached across deploys
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
})
