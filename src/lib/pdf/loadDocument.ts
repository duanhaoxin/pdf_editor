import { uid } from '@/lib/ids'
import { setCachedDocument } from './documentCache'
import { loadPdfjsDocument, pageMediaSize, type PasswordAsker } from './pdfjs'
import type { PageRecord, SourceFile } from './types'

export async function loadPdfFile(
  file: File,
  options: {
    askPassword?: PasswordAsker
    onProgress?: (percent: number) => void
  } = {},
): Promise<{ source: SourceFile; pages: PageRecord[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return loadPdfBytes(bytes, file.name, options)
}

export async function loadPdfBytes(
  bytes: Uint8Array,
  name: string,
  options: {
    askPassword?: PasswordAsker
    onProgress?: (percent: number) => void
  } = {},
): Promise<{ source: SourceFile; pages: PageRecord[] }> {
  const { doc, password } = await loadPdfjsDocument(bytes, {
    fileName: name,
    onProgress: options.onProgress,
    askPassword: options.askPassword,
  })

  const sourceId = uid('src')
  setCachedDocument(sourceId, doc)

  const source: SourceFile = {
    id: sourceId,
    name,
    bytes,
    password,
    usedPassword: Boolean(password),
  }

  const pages: PageRecord[] = []
  for (let i = 0; i < doc.numPages; i += 1) {
    const pdfPage = await doc.getPage(i + 1)
    const { width, height } = pageMediaSize(pdfPage)
    pages.push({
      id: uid('page'),
      sourceId,
      sourcePageIndex: i,
      width,
      height,
      rotation: 0,
      originalRotation: pdfPage.rotate,
      annotations: [],
    })
  }

  return { source, pages }
}
