export const Tools = {
  select: 'select',
  text: 'text',
  highlight: 'highlight',
  underline: 'underline',
  pen: 'pen',
  rect: 'rect',
  ellipse: 'ellipse',
  line: 'line',
  arrow: 'arrow',
  image: 'image',
  stamp: 'stamp',
} as const

export type Tool = (typeof Tools)[keyof typeof Tools]

export const StampKinds = {
  approved: 'approved',
  confidential: 'confidential',
  draft: 'draft',
  reviewed: 'reviewed',
  rejected: 'rejected',
} as const

export type StampKind = (typeof StampKinds)[keyof typeof StampKinds]

export const STAMP_LABELS: Record<StampKind, string> = {
  approved: '通过',
  confidential: '机密',
  draft: '草稿',
  reviewed: '已审核',
  rejected: '作废',
}

export const STAMP_COLORS: Record<StampKind, string> = {
  approved: '#15803d',
  confidential: '#b91c1c',
  draft: '#57534e',
  reviewed: '#1d4ed8',
  rejected: '#7f1d1d',
}

export type Point = { x: number; y: number }

export type AnnBase = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export type TextAnnotation = AnnBase & {
  type: 'text'
  content: string
  fontSize: number
  color: string
  coverBackground: boolean
}

export type HighlightAnnotation = AnnBase & {
  type: 'highlight'
  color: string
  opacity: number
}

export type UnderlineAnnotation = AnnBase & {
  type: 'underline'
  color: string
  strokeWidth: number
}

export type PenAnnotation = AnnBase & {
  type: 'pen'
  points: Point[]
  color: string
  strokeWidth: number
}

export type ShapeAnnotation = AnnBase & {
  type: 'shape'
  shape: 'rect' | 'ellipse' | 'line' | 'arrow'
  color: string
  fill: string | null
  strokeWidth: number
}

export type ImageAnnotation = AnnBase & {
  type: 'image'
  imageId: string
}

export type StampAnnotation = AnnBase & {
  type: 'stamp'
  stamp: StampKind
}

export type Annotation =
  | TextAnnotation
  | HighlightAnnotation
  | UnderlineAnnotation
  | PenAnnotation
  | ShapeAnnotation
  | ImageAnnotation
  | StampAnnotation

export type PageRecord = {
  id: string
  sourceId: string | null
  sourcePageIndex: number
  width: number
  height: number
  rotation: number
  originalRotation: number
  annotations: Annotation[]
}

export type SourceFile = {
  id: string
  name: string
  bytes: Uint8Array
  password?: string
  usedPassword: boolean
}

export type ImageAsset = {
  id: string
  bytes: Uint8Array
  mime: 'image/png' | 'image/jpeg'
  url: string
}

export type CompressQuality = 'high' | 'standard' | 'small'

export const COMPRESS_PRESETS: Record<
  CompressQuality,
  { dpi: number; jpeg: number; label: string; hint: string }
> = {
  high: { dpi: 144, jpeg: 0.82, label: '高清', hint: '约 144 DPI，适合打印' },
  standard: { dpi: 110, jpeg: 0.7, label: '标准', hint: '体积与清晰度较均衡' },
  small: { dpi: 72, jpeg: 0.52, label: '较小', hint: '明显减小体积，适合分享' },
}
