import { useEffect, useRef } from 'react'
import { PdfPageView } from '@/components/PdfPageView'
import { displaySize } from '@/lib/pdf/pdfjs'
import { useEditorStore } from '@/store/editorStore'

type Props = {
  pendingImage: File | null
  onConsumeImage: () => void
}

export function DocumentCanvas({ pendingImage, onConsumeImage }: Props) {
  const pages = useEditorStore((s) => s.pages)
  const zoom = useEditorStore((s) => s.zoom)
  const fitMode = useEditorStore((s) => s.fitMode)
  const setZoom = useEditorStore((s) => s.setZoom)
  const setFitMode = useEditorStore((s) => s.setFitMode)
  const setActivePage = useEditorStore((s) => s.setActivePage)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || pages.length === 0 || fitMode !== 'width') return
    const first = pages[0]
    const size = displaySize(first.width, first.height, first.originalRotation, first.rotation, 1)
    const next = Math.max(0.35, Math.min(2.4, (el.clientWidth - 48) / size.width))
    if (Math.abs(next - zoom) > 0.02) {
      useEditorStore.setState({ zoom: next })
    }
  }, [pages, fitMode, zoom])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (useEditorStore.getState().fitMode === 'width') {
        const first = useEditorStore.getState().pages[0]
        if (!first) return
        const size = displaySize(first.width, first.height, first.originalRotation, first.rotation, 1)
        const next = Math.max(0.35, Math.min(2.4, (el.clientWidth - 48) / size.width))
        useEditorStore.setState({ zoom: next })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const nodes = [...el.querySelectorAll<HTMLElement>('[id^="page-"]')]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id.startsWith('page-')) {
          setActivePage(visible.target.id.replace('page-', ''))
        }
      },
      { root: el, threshold: [0.35, 0.6] },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [pages, setActivePage])

  return (
    <div ref={scrollerRef} className="min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--canvas)]">
      <div
        className="mx-auto flex flex-col items-center gap-6 py-6"
        onWheel={(event) => {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            setFitMode('custom')
            setZoom(zoom + (event.deltaY > 0 ? -0.08 : 0.08))
          }
        }}
      >
        {pages.map((page) => (
          <PdfPageView
            key={page.id}
            page={page}
            zoom={zoom}
            pendingImage={pendingImage}
            onConsumeImage={onConsumeImage}
          />
        ))}
      </div>
    </div>
  )
}
