declare module '@pdf-lib/fontkit' {
  const fontkit: {
    create: (buffer: Uint8Array, postscriptName?: string) => unknown
  }
  export default fontkit
}
