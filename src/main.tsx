import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root')

function showBootError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  if (!root) return
  root.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px;font-family:system-ui,sans-serif;text-align:center">
      <strong style="font-size:22px">轻页 PDF 加载失败</strong>
      <p style="margin:0;color:#9a3412;max-width:36rem">${message}</p>
      <p style="margin:0;color:#6f6a63">请刷新页面重试。</p>
    </div>
  `
}

window.addEventListener('error', (event) => {
  if (!root?.querySelector('[data-app-ready]')) {
    showBootError(event.error ?? event.message)
  }
})

try {
  if (!root) throw new Error('找不到页面根节点')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  showBootError(error)
}
