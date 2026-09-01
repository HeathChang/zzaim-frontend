import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/styles/tokens.css'
import '@/styles/fonts.css'
import '@/styles/print.css'
import '@/styles/sheet.css'
import '@/styles/tailwind.css'

const root = document.getElementById('root')
// 개발자용 오류 — 사용자에게 보이지 않으므로 문구 사전 대상이 아니다
if (!root) throw new Error('mount point #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
