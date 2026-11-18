import type { PDFFont, PDFPage } from 'pdf-lib'

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r/g, '').split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('')
      continue
    }
    let line = ''
    for (const char of paragraph) {
      const next = line + char
      if (line && widthOf(font, next, size) > maxWidth) {
        lines.push(line)
        line = char
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines.length > 0 ? lines : ['']
}

export function sanitizeForFont(text: string, font: PDFFont): string {
  return [...text]
    .map((ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\t') return ch
      try {
        if (typeof font.getCharacterSet === 'function') {
          const code = ch.codePointAt(0)
          if (code !== undefined && !font.getCharacterSet().includes(code)) {
            return '·'
          }
        }
        font.encodeText(ch)
        return ch
      } catch {
        return '·'
      }
    })
    .join('')
}

function widthOf(font: PDFFont, text: string, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size)
  } catch {
    return [...text].length * size * 0.6
  }
}

export function drawWrappedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  options: {
    x: number
    y: number
    width: number
    height: number
    size: number
    color: ReturnType<typeof import('pdf-lib').rgb>
  },
) {
  const safe = sanitizeForFont(text, font)
  const lines = wrapText(safe, font, options.size, Math.max(8, options.width - 4))
  const lineHeight = options.size * 1.35
  let cursorY = options.y + options.height - options.size - 2
  for (const line of lines) {
    if (cursorY < options.y) break
    if (line) {
      try {
        page.drawText(line, {
          x: options.x + 2,
          y: cursorY,
          size: options.size,
          font,
          color: options.color,
        })
      } catch {
        // skip unsupported run
      }
    }
    cursorY -= lineHeight
  }
}
