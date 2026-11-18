import type { PageViewport } from 'pdfjs-dist'
import type { Annotation, Point } from './types'

export function clientToPdf(
  event: { clientX: number; clientY: number },
  el: HTMLElement,
  viewport: PageViewport,
): Point {
  const rect = el.getBoundingClientRect()
  const vx = ((event.clientX - rect.left) / rect.width) * viewport.width
  const vy = ((event.clientY - rect.top) / rect.height) * viewport.height
  const [x, y] = viewport.convertToPdfPoint(vx, vy) as [number, number]
  return { x, y }
}

export function pdfRectToCss(
  x: number,
  y: number,
  width: number,
  height: number,
  viewport: PageViewport,
): { left: number; top: number; width: number; height: number } {
  const [x1, y1] = viewport.convertToViewportPoint(x, y) as [number, number]
  const [x2, y2] = viewport.convertToViewportPoint(x + width, y + height) as [
    number,
    number,
  ]
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.max(1, Math.abs(x2 - x1)),
    height: Math.max(1, Math.abs(y2 - y1)),
  }
}

export function pdfPointToCss(point: Point, viewport: PageViewport): Point {
  const [x, y] = viewport.convertToViewportPoint(point.x, point.y) as [number, number]
  return { x, y }
}

export function normalizeRect(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

export function boundsFromPoints(points: Point[], padding = 2) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs) - padding
  const minY = Math.min(...ys) - padding
  const maxX = Math.max(...xs) + padding
  const maxY = Math.max(...ys) + padding
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

export function annotationHitTest(
  annotations: Annotation[],
  point: Point,
): Annotation | null {
  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const ann = annotations[i]
    if (ann.type === 'pen') {
      if (distanceToPolyline(point, ann.points) <= Math.max(4, ann.strokeWidth + 2)) {
        return ann
      }
      continue
    }
    if (ann.type === 'shape' && (ann.shape === 'line' || ann.shape === 'arrow')) {
      if (
        distanceToSegment(point, { x: ann.x, y: ann.y }, { x: ann.x + ann.width, y: ann.y + ann.height }) <=
        Math.max(4, ann.strokeWidth + 2)
      ) {
        return ann
      }
      continue
    }
    if (
      point.x >= ann.x &&
      point.x <= ann.x + ann.width &&
      point.y >= ann.y &&
      point.y <= ann.y + ann.height
    ) {
      return ann
    }
  }
  return null
}

function distanceToPolyline(point: Point, points: Point[]): number {
  if (points.length === 0) return Infinity
  if (points.length === 1) {
    const dx = point.x - points[0].x
    const dy = point.y - points[0].y
    return Math.hypot(dx, dy)
  }
  let min = Infinity
  for (let i = 1; i < points.length; i += 1) {
    min = Math.min(min, distanceToSegment(point, points[i - 1], points[i]))
  }
  return min
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function moveAnnotation(ann: Annotation, dx: number, dy: number): Annotation {
  if (ann.type === 'pen') {
    return {
      ...ann,
      x: ann.x + dx,
      y: ann.y + dy,
      points: ann.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    }
  }
  return { ...ann, x: ann.x + dx, y: ann.y + dy }
}
