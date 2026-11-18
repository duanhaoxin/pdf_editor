import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

const docs = new Map<string, PDFDocumentProxy>()

export function setCachedDocument(sourceId: string, doc: PDFDocumentProxy) {
  const prev = docs.get(sourceId)
  if (prev && prev !== doc) {
    void prev.destroy()
  }
  docs.set(sourceId, doc)
}

export function getCachedDocument(sourceId: string): PDFDocumentProxy | undefined {
  return docs.get(sourceId)
}

export async function getCachedPage(
  sourceId: string,
  pageIndex: number,
): Promise<PDFPageProxy> {
  const doc = docs.get(sourceId)
  if (!doc) {
    throw new Error('找不到原始 PDF 文档，请重新打开文件。')
  }
  return doc.getPage(pageIndex + 1)
}

export async function clearDocumentCache() {
  const pending = [...docs.values()].map((doc) => doc.destroy())
  docs.clear()
  await Promise.allSettled(pending)
}

export async function removeCachedDocument(sourceId: string) {
  const doc = docs.get(sourceId)
  docs.delete(sourceId)
  if (doc) await doc.destroy()
}
