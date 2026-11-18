import { create } from 'zustand'
import { addImage, addSource, assets, resetAssets } from '@/lib/assets'
import { toArrayBuffer } from '@/lib/download'
import { uid } from '@/lib/ids'
import { clearDocumentCache, removeCachedDocument } from '@/lib/pdf/documentCache'
import { loadPdfBytes, loadPdfFile } from '@/lib/pdf/loadDocument'
import { PasswordCancelledError, type PasswordAsker } from '@/lib/pdf/pdfjs'
import { createSamplePdf } from '@/lib/pdf/createSample'
import { normalizeImageFile } from '@/lib/pdf/images'
import type {
  Annotation,
  PageRecord,
  StampKind,
  Tool,
} from '@/lib/pdf/types'
import { Tools } from '@/lib/pdf/types'

type Snapshot = {
  fileName: string
  pages: PageRecord[]
  activePageId: string | null
  selectedPageIds: string[]
  selectedAnnotationId: string | null
}

type PasswordPrompt = { fileName: string; incorrect: boolean }

type EditorState = Snapshot & {
  tool: Tool
  zoom: number
  fitMode: 'width' | 'custom'
  strokeColor: string
  fillEnabled: boolean
  fillColor: string
  strokeWidth: number
  fontSize: number
  highlightColor: string
  stampKind: StampKind
  coverBackground: boolean
  busy: string | null
  loadProgress: number | null
  passwordPrompt: PasswordPrompt | null
  resolvePassword: ((value: string | null) => void) | null
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  past: Snapshot[]
  future: Snapshot[]

  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setFitMode: (mode: 'width' | 'custom') => void
  setStrokeColor: (color: string) => void
  setFillEnabled: (value: boolean) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (value: number) => void
  setFontSize: (value: number) => void
  setHighlightColor: (color: string) => void
  setStampKind: (kind: StampKind) => void
  setCoverBackground: (value: boolean) => void
  setBusy: (message: string | null) => void
  setActivePage: (id: string | null) => void
  selectPages: (ids: string[], additive?: boolean) => void
  selectAnnotation: (id: string | null) => void
  submitPassword: (password: string | null) => void

  openFiles: (files: File[], mode?: 'replace' | 'append') => Promise<void>
  openSample: () => Promise<void>
  closeDocument: () => Promise<void>
  undo: () => void
  redo: () => void
  rotatePages: (ids?: string[], delta?: number) => void
  deletePages: (ids?: string[]) => void
  insertBlankPage: (afterId?: string | null) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
  addAnnotation: (pageId: string, annotation: Annotation) => void
  updateAnnotation: (pageId: string, annotation: Annotation, recordHistory?: boolean) => void
  deleteAnnotation: (pageId: string, annotationId: string) => void
  addImageAnnotation: (pageId: string, file: File, x: number, y: number, width: number, height: number) => Promise<void>
  pushHistory: () => void
}

function cloneSnapshot(state: Snapshot): Snapshot {
  return {
    fileName: state.fileName,
    activePageId: state.activePageId,
    selectedPageIds: [...state.selectedPageIds],
    selectedAnnotationId: state.selectedAnnotationId,
    pages: state.pages.map((page) => ({
      ...page,
      annotations: page.annotations.map((ann) =>
        ann.type === 'pen' ? { ...ann, points: ann.points.map((p) => ({ ...p })) } : { ...ann },
      ),
    })),
  }
}

function takeSnapshot(state: Snapshot): Snapshot {
  return cloneSnapshot(state)
}

const emptySnapshot: Snapshot = {
  fileName: '',
  pages: [],
  activePageId: null,
  selectedPageIds: [],
  selectedAnnotationId: null,
}

const askPasswordFromStore = (): PasswordAsker => {
  return ({ fileName, incorrect }) =>
    new Promise((resolve) => {
      useEditorStore.setState({
        passwordPrompt: { fileName, incorrect },
        resolvePassword: resolve,
      })
    })
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...emptySnapshot,
  tool: Tools.select,
  zoom: 1.1,
  fitMode: 'width',
  strokeColor: '#1d4ed8',
  fillEnabled: false,
  fillColor: '#93c5fd',
  strokeWidth: 2,
  fontSize: 14,
  highlightColor: '#facc15',
  stampKind: 'approved',
  coverBackground: false,
  busy: null,
  loadProgress: null,
  passwordPrompt: null,
  resolvePassword: null,
  canUndo: false,
  canRedo: false,
  dirty: false,
  past: [],
  future: [],

  setTool: (tool) => set({ tool, selectedAnnotationId: tool === Tools.select ? get().selectedAnnotationId : null }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.35, zoom)), fitMode: 'custom' }),
  setFitMode: (fitMode) => set({ fitMode }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillEnabled: (fillEnabled) => set({ fillEnabled }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setHighlightColor: (highlightColor) => set({ highlightColor }),
  setStampKind: (stampKind) => set({ stampKind }),
  setCoverBackground: (coverBackground) => set({ coverBackground }),
  setBusy: (busy) => set({ busy }),
  setActivePage: (activePageId) => set({ activePageId }),
  pushHistory: () => {
    const current = get()
    set({
      past: [...current.past, takeSnapshot(current)].slice(-80),
      future: [],
      canUndo: true,
      canRedo: false,
    })
  },
  selectPages: (ids, additive = false) => {
    if (additive) {
      const current = new Set(get().selectedPageIds)
      ids.forEach((id) => {
        if (current.has(id)) current.delete(id)
        else current.add(id)
      })
      const selectedPageIds = [...current]
      set({
        selectedPageIds,
        activePageId: selectedPageIds.at(-1) ?? get().activePageId,
      })
    } else {
      set({
        selectedPageIds: ids,
        activePageId: ids[0] ?? null,
      })
    }
  },
  selectAnnotation: (selectedAnnotationId) => set({ selectedAnnotationId, tool: Tools.select }),
  submitPassword: (password) => {
    const resolve = get().resolvePassword
    set({ passwordPrompt: null, resolvePassword: null })
    resolve?.(password)
  },

  openFiles: async (files, mode = 'replace') => {
    const pdfs = files.filter((file) => /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name))
    if (pdfs.length === 0) {
      throw new Error('请选择 PDF 文件')
    }
    set({ busy: mode === 'append' ? '正在合并 PDF…' : '正在打开 PDF…', loadProgress: 0 })
    try {
      const loadedPages: PageRecord[] = []
      const askPassword = askPasswordFromStore()
      const previousSourceIds = Object.keys(assets.sources)
      const newSourceIds: string[] = []
      for (const [index, file] of pdfs.entries()) {
        const { source, pages } = await loadPdfFile(file, {
          askPassword,
          onProgress: (percent) => {
            const overall = Math.round(((index + percent / 100) / pdfs.length) * 100)
            set({ loadProgress: overall })
          },
        })
        addSource(source)
        newSourceIds.push(source.id)
        loadedPages.push(...pages)
      }
      if (mode === 'replace') {
        for (const id of previousSourceIds) {
          if (!newSourceIds.includes(id)) {
            delete assets.sources[id]
            await removeCachedDocument(id)
          }
        }
        for (const image of Object.values(assets.images)) {
          URL.revokeObjectURL(image.url)
        }
        assets.images = {}
        const fileName = pdfs.length === 1 ? pdfs[0].name : `合并文档（${pdfs.length} 个文件）.pdf`
        set({
          ...takeSnapshot({
            fileName,
            pages: loadedPages,
            activePageId: loadedPages[0]?.id ?? null,
            selectedPageIds: loadedPages[0] ? [loadedPages[0].id] : [],
            selectedAnnotationId: null,
          }),
          dirty: false,
          past: [],
          future: [],
          canUndo: false,
          canRedo: false,
          zoom: 1.1,
          fitMode: 'width',
        })
      } else {
        commit(set, get, (state) => {
          const pages = [...state.pages, ...loadedPages]
          return {
            pages,
            fileName: state.fileName || (pdfs.length === 1 ? pdfs[0].name : '合并文档.pdf'),
            activePageId: loadedPages[0]?.id ?? state.activePageId,
            selectedPageIds: loadedPages[0] ? [loadedPages[0].id] : state.selectedPageIds,
          }
        })
      }
    } catch (error) {
      if (error instanceof PasswordCancelledError) {
        throw new Error('已取消打开加密文件')
      }
      throw error
    } finally {
      set({ busy: null, loadProgress: null })
    }
  },

  openSample: async () => {
    set({ busy: '正在生成示例文档…', loadProgress: 8 })
    try {
      const previousSourceIds = Object.keys(assets.sources)
      const sample = await createSamplePdf()
      const { source, pages } = await loadPdfBytes(sample.bytes, sample.name, {
        onProgress: (percent) => set({ loadProgress: percent }),
      })
      for (const id of previousSourceIds) {
        await removeCachedDocument(id)
      }
      resetAssets()
      addSource(source)
      set({
        ...takeSnapshot({
          fileName: sample.name,
          pages,
          activePageId: pages[0]?.id ?? null,
          selectedPageIds: pages[0] ? [pages[0].id] : [],
          selectedAnnotationId: null,
        }),
        dirty: false,
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        fitMode: 'width',
      })
    } finally {
      set({ busy: null, loadProgress: null })
    }
  },

  closeDocument: async () => {
    await clearDocumentCache()
    resetAssets()
    set({
      ...emptySnapshot,
      dirty: false,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      selectedAnnotationId: null,
    })
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    const current = takeSnapshot(get())
    set({
      ...cloneSnapshot(previous),
      past: past.slice(0, -1),
      future: [current, ...future].slice(0, 80),
      canUndo: past.length > 1,
      canRedo: true,
      dirty: true,
    })
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return
    const next = future[0]
    const current = takeSnapshot(get())
    set({
      ...cloneSnapshot(next),
      past: [...past, current].slice(-80),
      future: future.slice(1),
      canUndo: true,
      canRedo: future.length > 1,
      dirty: true,
    })
  },

  rotatePages: (ids, delta = 90) => {
    const target = new Set(ids?.length ? ids : get().selectedPageIds)
    const active = get().activePageId
    if (target.size === 0 && active) target.add(active)
    commit(set, get, (state) => ({
      pages: state.pages.map((page) =>
        target.has(page.id) ? { ...page, rotation: (page.rotation + delta + 360) % 360 } : page,
      ),
    }))
  },

  deletePages: (ids) => {
    const target = new Set(ids?.length ? ids : get().selectedPageIds)
    const active = get().activePageId
    if (target.size === 0 && active) target.add(active)
    commit(set, get, (state) => {
      const pages = state.pages.filter((page) => !target.has(page.id))
      const activePageId = pages.find((page) => page.id === state.activePageId)?.id ?? pages[0]?.id ?? null
      return {
        pages,
        activePageId,
        selectedPageIds: activePageId ? [activePageId] : [],
        selectedAnnotationId: null,
      }
    })
  },

  insertBlankPage: (afterId) => {
    const after = afterId ?? get().activePageId
    const current = get().pages.find((page) => page.id === after)
    const blank: PageRecord = {
      id: uid('page'),
      sourceId: null,
      sourcePageIndex: 0,
      width: current?.width ?? 595.28,
      height: current?.height ?? 841.89,
      rotation: 0,
      originalRotation: 0,
      annotations: [],
    }
    commit(set, get, (state) => {
      const pages = [...state.pages]
      const index = after ? pages.findIndex((page) => page.id === after) : pages.length - 1
      pages.splice(index + 1, 0, blank)
      return {
        pages,
        activePageId: blank.id,
        selectedPageIds: [blank.id],
      }
    })
  },

  reorderPages: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    commit(set, get, (state) => {
      const pages = [...state.pages]
      const [moved] = pages.splice(fromIndex, 1)
      pages.splice(toIndex, 0, moved)
      return { pages }
    })
  },

  addAnnotation: (pageId, annotation) => {
    commit(set, get, (state) => ({
      selectedAnnotationId: annotation.id,
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, annotations: [...page.annotations, annotation] } : page,
      ),
    }))
  },

  updateAnnotation: (pageId, annotation, recordHistory = true) => {
    const apply = (state: EditorState) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              annotations: page.annotations.map((item) => (item.id === annotation.id ? annotation : item)),
            }
          : page,
      ),
    })
    if (recordHistory) commit(set, get, apply)
    else set(apply(get()))
  },

  deleteAnnotation: (pageId, annotationId) => {
    commit(set, get, (state) => ({
      selectedAnnotationId: state.selectedAnnotationId === annotationId ? null : state.selectedAnnotationId,
      pages: state.pages.map((page) =>
        page.id === pageId
          ? { ...page, annotations: page.annotations.filter((item) => item.id !== annotationId) }
          : page,
      ),
    }))
  },

  addImageAnnotation: async (pageId, file, x, y, width, height) => {
    const normalized = await normalizeImageFile(file)
    const image = {
      id: uid('img'),
      bytes: normalized.bytes,
      mime: normalized.mime,
      url: URL.createObjectURL(new Blob([toArrayBuffer(normalized.bytes)], { type: normalized.mime })),
    }
    addImage(image)
    const annotation: Annotation = {
      id: uid('ann'),
      type: 'image',
      imageId: image.id,
      x,
      y,
      width,
      height,
    }
    get().addAnnotation(pageId, annotation)
  },
}))

function commit(
  set: (partial: Partial<EditorState>) => void,
  get: () => EditorState,
  recipe: (state: EditorState) => Partial<Snapshot>,
) {
  const current = get()
  const past = [...current.past, takeSnapshot(current)].slice(-80)
  const next = recipe(current)
  set({
    ...next,
    past,
    future: [],
    canUndo: true,
    canRedo: false,
    dirty: true,
  })
}
