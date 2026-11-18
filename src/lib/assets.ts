import type { ImageAsset, SourceFile } from '@/lib/pdf/types'

export const assets = {
  sources: {} as Record<string, SourceFile>,
  images: {} as Record<string, ImageAsset>,
}

export function resetAssets() {
  for (const image of Object.values(assets.images)) {
    URL.revokeObjectURL(image.url)
  }
  assets.sources = {}
  assets.images = {}
}

export function addSource(source: SourceFile) {
  assets.sources[source.id] = source
}

export function addImage(image: ImageAsset) {
  assets.images[image.id] = image
}
