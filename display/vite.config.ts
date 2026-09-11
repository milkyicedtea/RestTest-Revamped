import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tanstackStart(), // MUST come before react()
    viteReact(),
  ],

  resolve: {
    tsconfigPaths: true,
  },

  server: {
    port: 4000,
  },

  ssr: {
    external: ['bun'],
  },

  // `bun` is runtime-native (Bun SQL) — never bundle it
  optimizeDeps: {
    // native module, nothing to pre-bundle — keeps the dep scanner quiet
    exclude: ['bun'],
  },
})
