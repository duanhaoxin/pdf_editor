import fontkit from '@/lib/pdf/fontkit'
import {
  BlendMode,
  LineCapStyle,
  PDFDocument,
  degrees,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'
import { hexToPdf } from '@/lib/color'
import { getCachedPage } from './documentCache'
import { getChineseFontBytes } from './font'
import { renderPdfPageToCanvas } from './renderPage'
import { drawWrappedText } from './text'
import {
  STAMP_COLORS,
  STAMP_LABELS,
  type Annotation,
  type ImageAsset,
  type PageRecord,
  type SourceFile,
} from './types'

export type ExportProgress = (info: { current: number; total: number; message: string }) => void

async function embedImage(pdf: PDFDocument, asset: ImageAsset): Promise<PDFImage> {
  if (asset.mime === 'image/png') return pdf.embedPng(asset.bytes)
  return pdf.embedJpg(asset.bytes)
}

async function flattenPageToImage(pdf: PDFDocument, page: PageRecord) {
  if (!page.sourceId) throw new Error('空白页无需栅格化')
  const pdfPage = await getCachedPage(page.sourceId, page.sourcePageIndex)
  const canvas = document.createElement('canvas')
  await renderPdfPageToCanvas(canvas, pdfPage, page.rotation, 144 / 72)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('栅格化失败'))), 'image/jpeg', 0.82)
  })
  const image = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer()))
  const size =
    page.rotation % 180 === 0
      ? { width: page.width, height: page.height }
      : { width: page.height, height: page.width }
  return { image, ...size }
}

function drawAnnotations(
  page: PDFPage,
  annotations: Annotation[],
  font: PDFFont,
  images: Map<string, PDFImage>,
) {
  for (const ann of annotations) {
    switch (ann.type) {
      case 'highlight':
        page.drawRectangle({
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          color: hexToPdf(ann.color),
          opacity: ann.opacity,
          blendMode: BlendMode.Multiply,
        })
        break
      case 'underline':
        page.drawLine({
          start: { x: ann.x, y: ann.y + 1 },
          end: { x: ann.x + ann.width, y: ann.y + 1 },
          thickness: ann.strokeWidth,
          color: hexToPdf(ann.color),
          lineCap: LineCapStyle.Round,
        })
        break
      case 'text':
        if (ann.coverBackground) {
          page.drawRectangle({
            x: ann.x,
            y: ann.y,
            width: ann.width,
            height: ann.height,
            color: rgb(1, 1, 1),
          })
        }
        drawWrappedText(page, ann.content, font, {
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          size: ann.fontSize,
          color: hexToPdf(ann.color),
        })
        break
      case 'pen': {
        if (ann.points.length < 2) break
        const d = ann.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(' ')
        page.drawSvgPath(d, {
          borderColor: hexToPdf(ann.color),
          borderWidth: ann.strokeWidth,
          borderLineCap: LineCapStyle.Round,
        })
        break
      }
      case 'shape': {
        const color = hexToPdf(ann.color)
        const fill = ann.fill ? hexToPdf(ann.fill) : undefined
        if (ann.shape === 'rect') {
          page.drawRectangle({
            x: ann.x,
            y: ann.y,
            width: Math.max(1, ann.width),
            height: Math.max(1, ann.height),
            borderColor: color,
            borderWidth: ann.strokeWidth,
            color: fill,
            opacity: fill ? 0.18 : undefined,
          })
        } else if (ann.shape === 'ellipse') {
          page.drawEllipse({
            x: ann.x + ann.width / 2,
            y: ann.y + ann.height / 2,
            xScale: Math.max(1, Math.abs(ann.width) / 2),
            yScale: Math.max(1, Math.abs(ann.height) / 2),
            borderColor: color,
            borderWidth: ann.strokeWidth,
            color: fill,
            opacity: fill ? 0.18 : undefined,
          })
        } else {
          const start = { x: ann.x, y: ann.y }
          const end = { x: ann.x + ann.width, y: ann.y + ann.height }
          page.drawLine({
            start,
            end,
            thickness: ann.strokeWidth,
            color,
            lineCap: LineCapStyle.Round,
          })
          if (ann.shape === 'arrow') {
            const angle = Math.atan2(end.y - start.y, end.x - start.x)
            const len = 12 + ann.strokeWidth * 1.5
            const left = {
              x: end.x - len * Math.cos(angle - Math.PI / 6),
              y: end.y - len * Math.sin(angle - Math.PI / 6),
            }
            const right = {
              x: end.x - len * Math.cos(angle + Math.PI / 6),
              y: end.y - len * Math.sin(angle + Math.PI / 6),
            }
            page.drawSvgPath(
              `M ${left.x} ${left.y} L ${end.x} ${end.y} L ${right.x} ${right.y}`,
              {
                borderColor: color,
                borderWidth: ann.strokeWidth,
                borderLineCap: LineCapStyle.Round,
              },
            )
          }
        }
        break
      }
      case 'image': {
        const image = images.get(ann.imageId)
        if (!image) break
        page.drawImage(image, {
          x: ann.x,
          y: ann.y,
          width: Math.max(1, ann.width),
          height: Math.max(1, ann.height),
        })
        break
      }
      case 'stamp': {
        const color = hexToPdf(STAMP_COLORS[ann.stamp])
        page.drawRectangle({
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          borderColor: color,
          borderWidth: 3,
          color: hexToPdf(STAMP_COLORS[ann.stamp]),
          opacity: 0.08,
        })
        const label = STAMP_LABELS[ann.stamp]
        const size = Math.min(ann.height * 0.42, (ann.width / Math.max(2, label.length)) * 1.05)
        try {
          const textWidth = font.widthOfTextAtSize(label, size)
          page.drawText(label, {
            x: ann.x + (ann.width - textWidth) / 2,
            y: ann.y + (ann.height - size) / 2,
            size,
            font,
            color,
          })
        } catch {
          // skip stamp text if glyph missing
        }
        break
      }
    }
  }
}

export async function exportPagesToPdf(
  pages: PageRecord[],
  sources: Record<string, SourceFile>,
  images: Record<string, ImageAsset>,
  options?: {
    onProgress?: ExportProgress
    flattenAll?: boolean
  },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit as never)
  const font = await pdf.embedFont(await getChineseFontBytes(), { subset: true })
  pdf.setTitle('轻页 PDF 导出')
  pdf.setProducer('轻页 PDF')
  pdf.setCreator('轻页 PDF')

  const sourceDocs = new Map<string, PDFDocument>()
  const embeddedImages = new Map<string, PDFImage>()
  for (const [id, asset] of Object.entries(images)) {
    embeddedImages.set(id, await embedImage(pdf, asset))
  }

  async function getSource(sourceId: string): Promise<PDFDocument | null> {
    if (sourceDocs.has(sourceId)) return sourceDocs.get(sourceId)!
    const file = sources[sourceId]
    if (!file) return null
    try {
      const doc = await PDFDocument.load(file.bytes, {
        ignoreEncryption: true,
        updateMetadata: false,
      })
      sourceDocs.set(sourceId, doc)
      return doc
    } catch {
      return null
    }
  }

  const total = Math.max(1, pages.length)
  for (const [index, page] of pages.entries()) {
    options?.onProgress?.({
      current: index + 1,
      total,
      message: `正在写入第 ${index + 1} / ${total} 页`,
    })

    let pdfPage: PDFPage
    if (!page.sourceId) {
      pdfPage = pdf.addPage([page.width, page.height])
    } else {
      const src = options?.flattenAll ? null : await getSource(page.sourceId)
      if (!src || page.sourcePageIndex >= src.getPageCount()) {
        const raster = await flattenPageToImage(pdf, page)
        pdfPage = pdf.addPage([raster.width, raster.height])
        pdfPage.drawImage(raster.image, {
          x: 0,
          y: 0,
          width: raster.width,
          height: raster.height,
        })
      } else {
        const [copied] = await pdf.copyPages(src, [page.sourcePageIndex])
        const rotation = (((copied.getRotation().angle + page.rotation) % 360) + 360) % 360
        copied.setRotation(degrees(rotation))
        pdfPage = pdf.addPage(copied)
      }
    }

    drawAnnotations(pdfPage, page.annotations, font, embeddedImages)
  }

  return pdf.save({ useObjectStreams: true })
}

export async function exportSinglePagePdf(
  page: PageRecord,
  sources: Record<string, SourceFile>,
  images: Record<string, ImageAsset>,
): Promise<Uint8Array> {
  return exportPagesToPdf([page], sources, images)
}
