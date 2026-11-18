import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type PageViewport,
} from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let workerReady = false

export function ensurePdfjsWorker() {
  if (workerReady) return
  GlobalWorkerOptions.workerSrc = pdfWorker
  workerReady = true
}

export type PasswordAsker = (info: {
  fileName: string
  incorrect: boolean
}) => Promise<string | null>

export class PasswordCancelledError extends Error {
  constructor() {
    super('PASSWORD_CANCELLED')
    this.name = 'PasswordCancelledError'
  }
}

export async function loadPdfjsDocument(
  bytes: Uint8Array,
  options: {
    fileName: string
    password?: string
    onProgress?: (percent: number) => void
    askPassword?: PasswordAsker
  },
): Promise<{ doc: PDFDocumentProxy; password?: string }> {
  ensurePdfjsWorker()
  const data = bytes.slice()
  let usedPassword = options.password

  const task = getDocument({
    data,
    password: options.password,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    iccUrl: '/pdfjs/iccs/',
    useSystemFonts: true,
    verbosity: 0,
  })

  task.onProgress = (progress: { loaded: number; total: number }) => {
    if (progress.total) {
      options.onProgress?.(Math.min(100, Math.round((progress.loaded / progress.total) * 100)))
    }
  }

  task.onPassword = (updatePassword: (password: string) => void, reason: number) => {
    const incorrect = reason === PasswordResponses.INCORRECT_PASSWORD
    void (async () => {
      const pwd = await options.askPassword?.({
        fileName: options.fileName,
        incorrect,
      })
      if (!pwd) {
        task.destroy()
        return
      }
      usedPassword = pwd
      updatePassword(pwd)
    })()
  }

  try {
    const doc = await task.promise
    return { doc, password: usedPassword }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('password') || message.includes('NeedPassword')) {
      throw new PasswordCancelledError()
    }
    throw error
  }
}

export function pageMediaSize(page: PDFPageProxy): { width: number; height: number } {
  const view = page.view
  return {
    width: Math.abs(view[2] - view[0]),
    height: Math.abs(view[3] - view[1]),
  }
}

export function displayRotation(original: number, extra: number): number {
  return ((original + extra) % 360 + 360) % 360
}

export function getPageViewport(
  page: PDFPageProxy,
  scale: number,
  extraRotation: number,
): PageViewport {
  return page.getViewport({
    scale,
    rotation: displayRotation(page.rotate, extraRotation),
  })
}

export function displaySize(
  width: number,
  height: number,
  originalRotation: number,
  extraRotation: number,
  scale = 1,
): { width: number; height: number } {
  const rotated = displayRotation(originalRotation, extraRotation)
  const swap = rotated % 180 !== 0
  return {
    width: (swap ? height : width) * scale,
    height: (swap ? width : height) * scale,
  }
}
