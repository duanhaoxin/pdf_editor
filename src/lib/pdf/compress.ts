import { PDFDocument } from 'pdf-lib'
import { uid } from '@/lib/ids'
import { setCachedDocument, removeCachedDocument } from './documentCache'
import { exportPagesToPdf } from './exportDocument'
import { loadPdfjsDocument } from './pdfjs'
import { rasterizePageBlob } from './renderPage'
import { COMPRESS_PRESETS, type CompressQuality, type ImageAsset, type PageRecord, type SourceFile } from './types'

export async function compressPages(
  pages: PageRecord[],
  sources: Record<string, SourceFile>,
  images: Record<string, ImageAsset>,
  quality: CompressQuality,
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array> {
  const preset = COMPRESS_PRESETS[quality]
  const baked = await exportPagesToPdf(pages, sources, images, {
    onProgress: ({ current, total }) => onProgress?.(current, total + pages.length),
  })
  const { doc } = await loadPdfjsDocument(baked, { fileName: 'compress.pdf' })
  const tempId = uid('compress')
  setCachedDocument(tempId, doc)
  try {
    const pdf = await PDFDocument.create()
    pdf.setTitle('压缩后的 PDF')
    pdf.setProducer('轻页 PDF')
    for (let i = 0; i < doc.numPages; i += 1) {
      onProgress?.(pages.length + i + 1, pages.length * 2)
      const raster = await rasterizePageBlob(
        tempId,
        i,
        0,
        preset.dpi,
        'image/jpeg',
        preset.jpeg,
      )
      const image = await pdf.embedJpg(new Uint8Array(await raster.blob.arrayBuffer()))
      const width = image.width * (72 / preset.dpi)
      const height = image.height * (72 / preset.dpi)
      const page = pdf.addPage([width, height])
      page.drawImage(image, { x: 0, y: 0, width, height })
    }
    return pdf.save({ useObjectStreams: true })
  } finally {
    await removeCachedDocument(tempId)
  }
}
