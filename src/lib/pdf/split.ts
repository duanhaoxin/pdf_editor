import JSZip from 'jszip'
import { downloadBlob, withPdfExtension } from '@/lib/download'
import { exportSinglePagePdf } from './exportDocument'
import type { ImageAsset, PageRecord, SourceFile } from './types'

export async function splitPagesToZip(
  pages: PageRecord[],
  sources: Record<string, SourceFile>,
  images: Record<string, ImageAsset>,
  fileName: string,
  onProgress?: (current: number, total: number) => void,
) {
  const zip = new JSZip()
  const base = withPdfExtension(fileName, '').replace(/\.pdf$/i, '')
  for (const [index, page] of pages.entries()) {
    onProgress?.(index + 1, pages.length)
    const bytes = await exportSinglePagePdf(page, sources, images)
    zip.file(`${base}-p${String(index + 1).padStart(3, '0')}.pdf`, bytes)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${base}-split.zip`)
}
