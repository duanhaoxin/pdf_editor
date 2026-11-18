import JSZip from 'jszip'
import { downloadBlob, withPdfExtension } from '@/lib/download'
import { getCachedPage, setCachedDocument } from './documentCache'
import { exportPagesToPdf } from './exportDocument'
import { loadPdfjsDocument } from './pdfjs'
import { renderPdfPageToCanvas } from './renderPage'
import type { ImageAsset, PageRecord, SourceFile } from './types'

export async function exportPagesAsImages(options: {
  pages: PageRecord[]
  sources: Record<string, SourceFile>
  images: Record<string, ImageAsset>
  mime: 'image/png' | 'image/jpeg'
  dpi: number
  fileName: string
  onProgress?: (current: number, total: number) => void
}) {
  const { pages, mime, dpi, fileName, onProgress } = options
  const quality = mime === 'image/jpeg' ? 0.86 : 0.92
  const baked = await exportPagesToPdf(pages, options.sources, options.images)
  const { doc } = await loadPdfjsDocument(baked, { fileName: 'export.pdf' })
  const tempId = 'export-preview'
  setCachedDocument(tempId, doc)

  const zip = new JSZip()
  const ext = mime === 'image/png' ? 'png' : 'jpg'
  try {
    for (let i = 0; i < doc.numPages; i += 1) {
      onProgress?.(i + 1, doc.numPages)
      const page = await getCachedPage(tempId, i)
      const canvas = document.createElement('canvas')
      await renderPdfPageToCanvas(canvas, page, 0, dpi / 72)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('导出图片失败'))),
          mime,
          quality,
        )
      })
      zip.file(`page-${String(i + 1).padStart(3, '0')}.${ext}`, blob)
    }
  } finally {
    await doc.destroy()
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const base = withPdfExtension(fileName, '').replace(/\.pdf$/i, '')
  downloadBlob(zipBlob, `${base}-pages.zip`)
}

export async function normalizeImageFile(
  file: File,
): Promise<{ bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' }> {
  if (file.type === 'image/png' || file.type === 'image/jpeg') {
    return { bytes: new Uint8Array(await file.arrayBuffer()), mime: file.type }
  }
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法读取图片')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('图片转换失败'))), 'image/png')
  })
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/png' }
}
