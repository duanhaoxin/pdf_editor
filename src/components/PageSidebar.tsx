import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEditorStore } from '@/store/editorStore'
import { displaySize } from '@/lib/pdf/pdfjs'
import { renderPageToCanvas } from '@/lib/pdf/renderPage'
import { cn } from '@/lib/utils'
import type { PageRecord } from '@/lib/pdf/types'

export function PageSidebar() {
  const pages = useEditorStore((s) => s.pages)
  const activePageId = useEditorStore((s) => s.activePageId)
  const selectedPageIds = useEditorStore((s) => s.selectedPageIds)
  const selectPages = useEditorStore((s) => s.selectPages)
  const reorderPages = useEditorStore((s) => s.reorderPages)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = pages.findIndex((page) => page.id === String(active.id))
    const to = pages.findIndex((page) => page.id === String(over.id))
    if (from >= 0 && to >= 0) reorderPages(from, to)
  }

  return (
    <aside className="flex h-full w-[9.5rem] shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>页面</span>
        <span>{pages.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((page) => page.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {pages.map((page, index) => (
                <SortableThumb
                  key={page.id}
                  page={page}
                  index={index}
                  active={page.id === activePageId}
                  selected={selectedPageIds.includes(page.id)}
                  onClick={(event) => {
                    if (event.shiftKey || event.metaKey || event.ctrlKey) {
                      selectPages([page.id], true)
                    } else {
                      selectPages([page.id])
                      document.getElementById(`page-${page.id}`)?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  )
}

function SortableThumb({
  page,
  index,
  active,
  selected,
  onClick,
}: {
  page: PageRecord
  index: number
  active: boolean
  selected: boolean
  onClick: (event: MouseEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })
  const size = displaySize(page.width, page.height, page.originalRotation, page.rotation, 0.18)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-lg', isDragging && 'z-10 opacity-80')}
    >
      <button
        type="button"
        className={cn(
          'w-full rounded-lg border bg-white p-1 text-left shadow-sm transition',
          selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50',
          active && 'ring-2 ring-primary/40',
        )}
        onClick={onClick}
        {...attributes}
        {...listeners}
      >
        <ThumbCanvas page={page} width={size.width} height={size.height} />
        <p className="mt-1 text-center text-[11px] text-muted-foreground">{index + 1}</p>
      </button>
    </li>
  )
}

function ThumbCanvas({ page, width, height }: { page: PageRecord; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '120px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !page.sourceId || !canvasRef.current) return
    const canvas = canvasRef.current
    let cancelled = false
    void renderPageToCanvas(canvas, page.sourceId, page.sourcePageIndex, page.rotation, 0.22).catch(
      () => {
        if (!cancelled && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d')
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [visible, page.sourceId, page.sourcePageIndex, page.rotation, page.id])

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-md bg-neutral-100"
      style={{ width, height, margin: '0 auto' }}
    >
      {page.sourceId ? (
        <canvas ref={canvasRef} className="block h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">空白</div>
      )}
    </div>
  )
}
