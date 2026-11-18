import fontUrl from '@/assets/fonts/NotoSansSC-Regular.ttf?url'

let cached: ArrayBuffer | null = null

export async function getChineseFontBytes(): Promise<ArrayBuffer> {
  if (cached) return cached.slice(0)
  const response = await fetch(fontUrl)
  if (!response.ok) {
    throw new Error('无法加载内置中文字体')
  }
  cached = await response.arrayBuffer()
  return cached.slice(0)
}
