import { getCachedDocument } from './documentCache'
import type { PageRecord } from './types'

type TextItem = { str?: string }

export async function extractPagesText(pages: PageRecord[]): Promise<string> {
  const chunks: string[] = []
  for (const [i, page] of pages.entries()) {
    chunks.push(`----- 第 ${i + 1} 页 -----`)
    if (!page.sourceId) {
      const extra = page.annotations
        .filter((ann) => ann.type === 'text')
        .map((ann) => (ann.type === 'text' ? ann.content : ''))
        .filter(Boolean)
      chunks.push(extra.join('\n') || '（空白页）')
      continue
    }
    const doc = getCachedDocument(page.sourceId)
    if (!doc) {
      chunks.push('（无法读取该页文字）')
      continue
    }
    const pdfPage = await doc.getPage(page.sourcePageIndex + 1)
    const content = await pdfPage.getTextContent()
    const lines: string[] = []
    let current = ''
    let lastY: number | null = null
    for (const item of content.items as TextItem[]) {
      const raw = item as TextItem & { transform?: number[] }
      const str = raw.str ?? ''
      const y: number | null = raw.transform ? raw.transform[5] : lastY
      if (lastY !== null && y !== null && Math.abs(lastY - y) > 6) {
        lines.push(current.trimEnd())
        current = ''
      }
      current += str
      lastY = y ?? lastY
    }
    if (current) lines.push(current.trimEnd())
    const body = lines.filter((line) => line.trim()).join('\n')
    const overlay = page.annotations
      .filter((ann) => ann.type === 'text' && ann.content.trim())
      .map((ann) => (ann.type === 'text' ? `［批注］${ann.content}` : ''))
    chunks.push([body, ...overlay].filter(Boolean).join('\n') || '（未识别到文字）')
  }
  return chunks.join('\n\n')
}
