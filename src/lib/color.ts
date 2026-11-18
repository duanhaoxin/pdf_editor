import { rgb, type RGB } from 'pdf-lib'

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '').trim()
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.padEnd(6, '0').slice(0, 6)
  return {
    r: Number.parseInt(full.slice(0, 2), 16) / 255,
    g: Number.parseInt(full.slice(2, 4), 16) / 255,
    b: Number.parseInt(full.slice(4, 6), 16) / 255,
  }
}

export function hexToPdf(hex: string): RGB {
  const { r, g, b } = hexToRgb(hex)
  return rgb(r, g, b)
}

export function contrastText(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma > 0.62 ? '#1c1917' : '#fffbeb'
}
