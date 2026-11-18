import fontkitImport from '@pdf-lib/fontkit'

const imported = fontkitImport as {
  create?: unknown
  default?: { create?: unknown }
}

const fontkit = typeof imported.create === 'function' ? imported : imported.default

export default fontkit
