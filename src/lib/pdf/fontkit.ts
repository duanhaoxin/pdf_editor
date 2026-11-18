import fontkitImport from '@pdf-lib/fontkit'

type FontkitLike = { create?: unknown; default?: FontkitLike }

function unwrap(mod: FontkitLike | undefined, depth = 0): FontkitLike | undefined {
  if (!mod || depth > 3) return mod
  if (typeof mod.create === 'function') return mod
  if (mod.default && mod.default !== mod) return unwrap(mod.default, depth + 1)
  return mod
}

const fontkit = unwrap(fontkitImport as FontkitLike) ?? (fontkitImport as FontkitLike)

export default fontkit
