import type { PDFPageProxy } from 'pdfjs-dist'
import { getCachedPage } from './documentCache'
import { getPageViewport } from './pdfjs'

export async function renderPageToCanvas(
  canvas: HTMLCanvasElement,
  sourceId: string,
  pageIndex: number,
  extraRotation: number,
  scale: number,
): Promise<{ width: number; height: number }> {
  const page = await getCachedPage(sourceId, pageIndex)
  return renderPdfPageToCanvas(canvas, page, extraRotation, scale)
}

export async function renderPdfPageToCanvas(
  canvas: HTMLCanvasElement,
  page: PDFPageProxy,
  extraRotation: number,
  scale: number,
): Promise<{ width: number; height: number }> {
  const viewport = getPageViewport(page, scale, extraRotation)
  const outputScale = Math.min(2.5, window.devicePixelRatio || 1)
  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('无法创建画布')
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()

  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
  const task = page.render({
    canvasContext: ctx,
    canvas,
    viewport,
    transform,
    intent: 'display',
  })
  await task.promise
  return { width: viewport.width, height: viewport.height }
}

export async function rasterizePageBlob(
  sourceId: string,
  pageIndex: number,
  extraRotation: number,
  dpi: number,
  mime: 'image/jpeg' | 'image/png',
  quality = 0.72,
): Promise<{ blob: Blob; width: number; height: number }> {
  const page = await getCachedPage(sourceId, pageIndex)
  const scale = dpi / 72
  const canvas = document.createElement('canvas')
  await renderPdfPageToCanvas(canvas, page, extraRotation, scale)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) resolve(value)
        else reject(new Error('导出图片失败'))
      },
      mime,
      quality,
    )
  })
  return { blob, width: canvas.width, height: canvas.height }
}
