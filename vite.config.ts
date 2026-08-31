import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    // 학교 망은 외부를 막는 경우가 있다 (PP§6.4). 자산은 전부 번들 안에 있어야 한다.
    assetsInlineLimit: 0,
  },
})
