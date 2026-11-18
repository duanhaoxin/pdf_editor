import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { PageViewport } from 'pdfjs-dist'
import { assets } from '@/lib/assets'
import {
  annotationHitTest,
  boundsFromPoints,
  clientToPdf,
  moveAnnotation,
  normalizeRect,
  pdfPointToCss,
  pdfRectToCss,
} from '@/lib/pdf/coords'
import { uid } from '@/lib/ids'
import {
  STAMP_COLORS,
  STAMP_LABELS,
  Tools,
  type Annotation,
  type PageRecord,
  type Point,
  type ShapeAnnotation,
} from '@/lib/pdf/types'
import { useEditorStore } from '@/store/editorStore'
import { cn } from '@/lib/utils'

type Draft =
  | { kind: 'rect'; start: Point; current: Point }
  | { kind: 'pen'; points: Point[] }

type Props = {
  page: PageRecord
  viewport: PageViewport
  pendingImage: File | null
  onConsumeImage: () => void
}

export function AnnotationLayer({ page, viewport, pendingImage, onConsumeImage }: Props) {
  const tool = useEditorStore((s) => s.tool)
  const selectedId = useEditorStore((s) => s.selectedAnnotationId)
  const addAnnotation = useEditorStore((s) => s.addAnnotation)
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation)
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation)
  const selectAnnotation = useEditorStore((s) => s.selectAnnotation)
  const strokeColor = useEditorStore((s) => s.strokeColor)
  const fillEnabled = useEditorStore((s) => s.fillEnabled)
  const fillColor = useEditorStore((s) => s.fillColor)
  const strokeWidth = useEditorStore((s) => s.strokeWidth)
  const fontSize = useEditorStore((s) => s.fontSize)
  const highlightColor = useEditorStore((s) => s.highlightColor)
  const stampKind = useEditorStore((s) => s.stampKind)
  const coverBackground = useEditorStore((s) => s.coverBackground)

  const hostRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ignoreBlurRef = useRef(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const dragRef = useRef<{
    id: string
    origin: Point
    start: Annotation
    moved: boolean
  } | null>(null)

  useEffect(() => {
    setEditingId(null)
  }, [page.id])

  useEffect(() => {
    if (!editingId) return
    ignoreBlurRef.current = true
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.select()
      window.setTimeout(() => {
        ignoreBlurRef.current = false
      }, 120)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editingId])

  function pointFromEvent(event: { clientX: number; clientY: number }): Point {
    return clientToPdf(event, hostRef.current!, viewport)
  }

  function commitDraft(next: Draft) {
    if (next.kind === 'pen') {
      if (next.points.length < 2) return
      const bounds = boundsFromPoints(next.points, strokeWidth + 2)
      addAnnotation(page.id, {
        id: uid('ann'),
        type: 'pen',
        points: next.points,
        color: strokeColor,
        strokeWidth,
        ...bounds,
      })
      return
    }
    const rect = normalizeRect(next.start, next.current)
    if (rect.width < 2 && rect.height < 2 && tool !== Tools.stamp && tool !== Tools.text) return

    if (tool === Tools.highlight) {
      addAnnotation(page.id, {
        id: uid('ann'),
        type: 'highlight',
        color: highlightColor,
        opacity: 0.38,
        ...rect,
      })
    } else if (tool === Tools.underline) {
      addAnnotation(page.id, {
        id: uid('ann'),
        type: 'underline',
        color: highlightColor,
        strokeWidth: Math.max(1.2, strokeWidth),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: Math.max(rect.height, 8),
      })
    } else if (tool === Tools.rect || tool === Tools.ellipse || tool === Tools.line || tool === Tools.arrow) {
      const shape = tool === Tools.rect ? 'rect' : tool === Tools.ellipse ? 'ellipse' : tool
      const ann: ShapeAnnotation = {
        id: uid('ann'),
        type: 'shape',
        shape,
        color: strokeColor,
        fill: fillEnabled && (shape === 'rect' || shape === 'ellipse') ? fillColor : null,
        strokeWidth,
        x: tool === Tools.line || tool === Tools.arrow ? next.start.x : rect.x,
        y: tool === Tools.line || tool === Tools.arrow ? next.start.y : rect.y,
        width: tool === Tools.line || tool === Tools.arrow ? next.current.x - next.start.x : rect.width,
        height: tool === Tools.line || tool === Tools.arrow ? next.current.y - next.start.y : rect.height,
      }
      addAnnotation(page.id, ann)
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !hostRef.current) return
    const point = pointFromEvent(event)
    const hit = annotationHitTest(page.annotations, point)

    if (tool === Tools.select || (tool === Tools.text && hit?.type === 'text')) {
      if (hit) {
        selectAnnotation(hit.id)
        if (hit.type === 'text' && tool === Tools.text) {
          setEditingId(hit.id)
          return
        }
        hostRef.current.setPointerCapture(event.pointerId)
        useEditorStore.getState().pushHistory()
        dragRef.current = { id: hit.id, origin: point, start: hit, moved: false }
      } else {
        selectAnnotation(null)
        setEditingId(null)
      }
      if (tool !== Tools.text) return
      if (hit?.type === 'text') return
    }

    if (tool === Tools.text) {
      const corner = pointFromEvent({ clientX: event.clientX + 200, clientY: event.clientY + 56 })
      const rect = normalizeRect(point, corner)
      const id = uid('ann')
      addAnnotation(page.id, {
        id,
        type: 'text',
        content: '',
        fontSize,
        color: strokeColor,
        coverBackground,
        ...rect,
      })
      setEditingId(id)
      return
    }

    hostRef.current.setPointerCapture(event.pointerId)

    if (tool === Tools.stamp) {
      const corner = pointFromEvent({ clientX: event.clientX + 132, clientY: event.clientY + 52 })
      const rect = normalizeRect(point, corner)
      addAnnotation(page.id, {
        id: uid('ann'),
        type: 'stamp',
        stamp: stampKind,
        ...rect,
      })
      return
    }

    if (tool === Tools.image && pendingImage) {
      const corner = pointFromEvent({ clientX: event.clientX + 180, clientY: event.clientY + 120 })
      const rect = normalizeRect(point, corner)
      void useEditorStore.getState().addImageAnnotation(page.id, pendingImage, rect.x, rect.y, rect.width, rect.height)
      onConsumeImage()
      return
    }

    if (tool === Tools.pen) {
      setDraft({ kind: 'pen', points: [point] })
      return
    }

    setDraft({ kind: 'rect', start: point, current: point })
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointFromEvent(event)
    if (dragRef.current) {
      const dx = point.x - dragRef.current.origin.x
      const dy = point.y - dragRef.current.origin.y
      if (Math.hypot(dx, dy) > 1.5) dragRef.current.moved = true
      const moved = moveAnnotation(dragRef.current.start, dx, dy)
      updateAnnotation(page.id, moved, false)
      return
    }
    setDraft((current) => {
      if (!current) return current
      if (current.kind === 'pen') {
        const last = current.points[current.points.length - 1]
        if (Math.hypot(point.x - last.x, point.y - last.y) < 1.2) return current
        return { kind: 'pen', points: [...current.points, point] }
      }
      return { ...current, current: point }
    })
  }

  function onPointerUp() {
    const drag = dragRef.current
    dragRef.current = null
    if (drag && !drag.moved && drag.start.type === 'text') {
      setEditingId(drag.id)
    }
    setDraft((current) => {
      if (current) commitDraft(current)
      return null
    })
  }

  const cursor =
    tool === Tools.select ? (selectedId ? 'move' : 'default') : tool === Tools.text ? 'text' : 'crosshair'

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 touch-none"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(event) => {
        const hit = annotationHitTest(page.annotations, pointFromEvent(event))
        if (hit?.type === 'text') setEditingId(hit.id)
      }}
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {page.annotations.map((ann) => (
          <AnnotationSvg key={ann.id} annotation={ann} viewport={viewport} selected={ann.id === selectedId} />
        ))}
        {draft ? <DraftSvg draft={draft} viewport={viewport} /> : null}
      </svg>

      {page.annotations.map((ann) => {
        if (ann.type === 'text') {
          const box = pdfRectToCss(ann.x, ann.y, ann.width, ann.height, viewport)
          return (
            <div
              key={ann.id}
              className={cn(
                'absolute overflow-hidden rounded-sm px-1',
                ann.coverBackground ? 'bg-white' : 'bg-transparent',
                selectedId === ann.id && 'ring-2 ring-primary',
              )}
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                color: ann.color,
                fontSize: ann.fontSize * viewport.scale,
                lineHeight: 1.35,
                pointerEvents: 'auto',
              }}
              onPointerDown={(event) => {
                event.stopPropagation()
                if (tool === Tools.select || tool === Tools.text) {
                  selectAnnotation(ann.id)
                  setEditingId(ann.id)
                }
              }}
            >
              {editingId === ann.id ? (
                <textarea
                  ref={textareaRef}
                  className="h-full w-full resize-none bg-transparent outline-none"
                  defaultValue={ann.content}
                  placeholder="输入文字"
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onBlur={(event) => {
                    if (ignoreBlurRef.current) {
                      event.target.focus()
                      return
                    }
                    const content = event.target.value
                    setEditingId(null)
                    if (!content.trim()) deleteAnnotation(page.id, ann.id)
                    else updateAnnotation(page.id, { ...ann, content })
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  {ann.content || '输入文字'}
                </div>
              )}
            </div>
          )
        }
        if (ann.type === 'image') {
          const box = pdfRectToCss(ann.x, ann.y, ann.width, ann.height, viewport)
          const src = assets.images[ann.imageId]?.url
          return (
            <img
              key={ann.id}
              src={src}
              alt=""
              draggable={false}
              className={cn('absolute object-contain', selectedId === ann.id && 'ring-2 ring-primary')}
              style={{ left: box.left, top: box.top, width: box.width, height: box.height, pointerEvents: 'none' }}
            />
          )
        }
        if (ann.type === 'stamp') {
          const box = pdfRectToCss(ann.x, ann.y, ann.width, ann.height, viewport)
          return (
            <div
              key={ann.id}
              className={cn(
                'absolute flex items-center justify-center rounded-sm border-[3px] text-lg font-black tracking-widest',
                selectedId === ann.id && 'ring-2 ring-primary',
              )}
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                color: STAMP_COLORS[ann.stamp],
                borderColor: STAMP_COLORS[ann.stamp],
                background: `${STAMP_COLORS[ann.stamp]}14`,
                pointerEvents: 'none',
              }}
            >
              {STAMP_LABELS[ann.stamp]}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

function AnnotationSvg({
  annotation,
  viewport,
  selected,
}: {
  annotation: Annotation
  viewport: PageViewport
  selected: boolean
}) {
  const stroke = selected ? '#2563eb' : undefined
  if (annotation.type === 'highlight') {
    const box = pdfRectToCss(annotation.x, annotation.y, annotation.width, annotation.height, viewport)
    return (
      <rect
        x={box.left}
        y={box.top}
        width={box.width}
        height={box.height}
        fill={annotation.color}
        opacity={annotation.opacity}
        style={{ mixBlendMode: 'multiply' }}
        stroke={stroke}
        strokeWidth={selected ? 1.5 : 0}
      />
    )
  }
  if (annotation.type === 'underline') {
    const a = pdfPointToCss({ x: annotation.x, y: annotation.y }, viewport)
    const b = pdfPointToCss({ x: annotation.x + annotation.width, y: annotation.y }, viewport)
    return (
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth * viewport.scale}
        strokeLinecap="round"
      />
    )
  }
  if (annotation.type === 'pen') {
    const d = annotation.points
      .map((p, i) => {
        const c = pdfPointToCss(p, viewport)
        return `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`
      })
      .join(' ')
    return (
      <path
        d={d}
        fill="none"
        stroke={annotation.color}
        strokeWidth={annotation.strokeWidth * viewport.scale}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (annotation.type === 'shape') {
    if (annotation.shape === 'rect') {
      const box = pdfRectToCss(annotation.x, annotation.y, annotation.width, annotation.height, viewport)
      return (
        <rect
          x={box.left}
          y={box.top}
          width={box.width}
          height={box.height}
          fill={annotation.fill ?? 'none'}
          fillOpacity={annotation.fill ? 0.18 : 0}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth * viewport.scale}
        />
      )
    }
    if (annotation.shape === 'ellipse') {
      const box = pdfRectToCss(annotation.x, annotation.y, annotation.width, annotation.height, viewport)
      return (
        <ellipse
          cx={box.left + box.width / 2}
          cy={box.top + box.height / 2}
          rx={box.width / 2}
          ry={box.height / 2}
          fill={annotation.fill ?? 'none'}
          fillOpacity={annotation.fill ? 0.18 : 0}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth * viewport.scale}
        />
      )
    }
    const a = pdfPointToCss({ x: annotation.x, y: annotation.y }, viewport)
    const b = pdfPointToCss(
      { x: annotation.x + annotation.width, y: annotation.y + annotation.height },
      viewport,
    )
    return (
      <g>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth * viewport.scale}
          strokeLinecap="round"
        />
        {annotation.shape === 'arrow' ? (
          <polygon
            points={arrowHead(a, b, 10 + annotation.strokeWidth)}
            fill={annotation.color}
          />
        ) : null}
      </g>
    )
  }
  return null
}

function DraftSvg({ draft, viewport }: { draft: Draft; viewport: PageViewport }) {
  if (draft.kind === 'pen') {
    const d = draft.points
      .map((p, i) => {
        const c = pdfPointToCss(p, viewport)
        return `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`
      })
      .join(' ')
    return <path d={d} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" />
  }
  const rect = normalizeRect(draft.start, draft.current)
  const box = pdfRectToCss(rect.x, rect.y, rect.width, rect.height, viewport)
  return (
    <rect
      x={box.left}
      y={box.top}
      width={box.width}
      height={box.height}
      fill="rgba(37,99,235,0.12)"
      stroke="#2563eb"
      strokeDasharray="4 3"
    />
  )
}

function arrowHead(a: Point, b: Point, size: number): string {
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  const left = { x: b.x - size * Math.cos(angle - Math.PI / 6), y: b.y - size * Math.sin(angle - Math.PI / 6) }
  const right = { x: b.x - size * Math.cos(angle + Math.PI / 6), y: b.y - size * Math.sin(angle + Math.PI / 6) }
  return `${b.x},${b.y} ${left.x},${left.y} ${right.x},${right.y}`
}
