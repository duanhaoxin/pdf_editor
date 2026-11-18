import { useEffect, useMemo, useRef, useState } from 'react'
import { AnnotationLayer } from '@/components/AnnotationLayer'
import { displaySize, getPageViewport } from '@/lib/pdf/pdfjs'
import { getCachedPage } from '@/lib/pdf/documentCache'
import { renderPdfPageToCanvas } from '@/lib/pdf/renderPage'
import type { PageRecord } from '@/lib/pdf/types'
import type { PageViewport } from 'pdfjs-dist'

type Props = {
  page: PageRecord
  zoom: number
  pendingImage: File | null
  onConsumeImage: () => void
}

export function PdfPageView({ page, zoom, pendingImage, onConsumeImage }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [viewport, setViewport] = useState<PageViewport | null>(null)
  const display = useMemo(
    () => displaySize(page.width, page.height, page.originalRotation, page.rotation, zoom),
    [page.width, page.height, page.originalRotation, page.rotation, zoom],
  )

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    async function draw() {
      if (page.sourceId) {
        const pdfPage = await getCachedPage(page.sourceId, page.sourcePageIndex)
        if (cancelled) return
        const vp = getPageViewport(pdfPage, zoom, page.rotation)
        setViewport(vp)
        if (canvasRef.current) {
          await renderPdfPageToCanvas(canvasRef.current, pdfPage, page.rotation, zoom)
        }
      } else {
        setViewport(blankViewport(page.width, page.height, zoom))
      }
    }
    void draw()
    return () => {
      cancelled = true
    }
  }, [visible, page.id, page.sourceId, page.sourcePageIndex, page.rotation, page.width, page.height, zoom])

  return (
    <section
      id={`page-${page.id}`}
      ref={hostRef}
      className="relative mx-auto bg-white shadow-[0_18px_50px_rgba(60,40,20,0.12)]"
      style={{ width: display.width, height: display.height }}
    >
      {page.sourceId ? (
        <canvas ref={canvasRef} className="block h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[repeating-linear-gradient(0deg,transparent,transparent_27px,#eee7da_28px)] text-sm text-muted-foreground">
          空白页
        </div>
      )}
      {viewport ? (
        <AnnotationLayer
          page={page}
          viewport={viewport}
          pendingImage={pendingImage}
          onConsumeImage={onConsumeImage}
        />
      ) : null}
    </section>
  )
}

function blankViewport(width: number, height: number, scale: number): PageViewport {
  return {
    width: width * scale,
    height: height * scale,
    scale,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    viewBox: [0, 0, width, height],
    transform: [scale, 0, 0, -scale, 0, height * scale],
    convertToViewportPoint(x: number, y: number) {
      return [x * scale, (height - y) * scale]
    },
    convertToPdfPoint(x: number, y: number) {
      return [x / scale, height - y / scale]
    },
    convertToViewportRectangle() {
      return []
    },
    clone() {
      return this
    },
    rawDims: {},
    userUnit: 1,
  } as PageViewport
}
