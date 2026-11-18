import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BusyOverlay } from '@/components/BusyOverlay'
import { DocumentCanvas } from '@/components/DocumentCanvas'
import { EmptyState } from '@/components/EmptyState'
import { PageSidebar } from '@/components/PageSidebar'
import { PasswordDialog } from '@/components/PasswordDialog'
import { PropertiesPanel } from '@/components/PropertiesPanel'
import { StatusBar } from '@/components/StatusBar'
import { Toolbar } from '@/components/Toolbar'
import { CompressDialog } from '@/components/dialogs/CompressDialog'
import { ImageExportDialog } from '@/components/dialogs/ImageExportDialog'
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog'
import { TextDialog } from '@/components/dialogs/TextDialog'
import { assets } from '@/lib/assets'
import { compressPages } from '@/lib/pdf/compress'
import { exportPagesAsImages } from '@/lib/pdf/images'
import { extractPagesText } from '@/lib/pdf/extractText'
import { exportPagesToPdf } from '@/lib/pdf/exportDocument'
import { splitPagesToZip } from '@/lib/pdf/split'
import { downloadBlob, downloadBytes, withPdfExtension } from '@/lib/download'
import { Tools, type CompressQuality } from '@/lib/pdf/types'
import { useEditorStore } from '@/store/editorStore'

export function EditorApp() {
  const pages = useEditorStore((s) => s.pages)
  const fileName = useEditorStore((s) => s.fileName)
  const busy = useEditorStore((s) => s.busy)
  const loadProgress = useEditorStore((s) => s.loadProgress)
  const passwordPrompt = useEditorStore((s) => s.passwordPrompt)
  const submitPassword = useEditorStore((s) => s.submitPassword)
  const openFiles = useEditorStore((s) => s.openFiles)
  const openSample = useEditorStore((s) => s.openSample)
  const selectedPageIds = useEditorStore((s) => s.selectedPageIds)
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId)
  const setTool = useEditorStore((s) => s.setTool)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const rotatePages = useEditorStore((s) => s.rotatePages)
  const deletePages = useEditorStore((s) => s.deletePages)
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation)
  const setZoom = useEditorStore((s) => s.setZoom)
  const setFitMode = useEditorStore((s) => s.setFitMode)
  const zoom = useEditorStore((s) => s.zoom)
  const setBusy = useEditorStore((s) => s.setBusy)

  const openInputRef = useRef<HTMLInputElement>(null)
  const mergeInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [compressOpen, setCompressOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [extractedText, setExtractedText] = useState('')

  const handleOpen = useCallback(
    async (files: File[], mode: 'replace' | 'append' = 'replace') => {
      try {
        await openFiles(files, mode)
        toast.success(mode === 'append' ? '已合并到当前文档' : '已打开文档')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '无法打开这个 PDF')
      }
    },
    [openFiles],
  )

  const runTask = useCallback(
    async (message: string, task: (onProgress: (current: number, total: number) => void) => Promise<void>) => {
      setBusy(message)
      try {
        await task((current, total) => {
          useEditorStore.setState({
            loadProgress: total ? Math.round((current / total) * 100) : null,
            busy: `${message}（${current}/${total}）`,
          })
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '操作失败')
      } finally {
        setBusy(null)
        useEditorStore.setState({ loadProgress: null })
      }
    },
    [setBusy],
  )

  async function downloadPdf() {
    if (pages.length === 0) return
    await runTask('正在导出 PDF…', async (onProgress) => {
      const bytes = await exportPagesToPdf(pages, assets.sources, assets.images, {
        onProgress: ({ current, total, message }) => {
          onProgress(current, total)
          useEditorStore.setState({ busy: message })
        },
      })
      downloadBytes(bytes, withPdfExtension(fileName || '文档'), 'application/pdf')
      toast.success('已下载编辑后的 PDF')
    })
  }

  async function extractSelected() {
    const chosen = pages.filter((page) => selectedPageIds.includes(page.id))
    const target = chosen.length > 0 ? chosen : pages
    await runTask('正在提取页面…', async () => {
      const bytes = await exportPagesToPdf(target, assets.sources, assets.images)
      downloadBytes(bytes, withPdfExtension(fileName || '文档', '-提取'), 'application/pdf')
      toast.success(`已提取 ${target.length} 页`)
    })
  }

  async function splitPdf() {
    await runTask('正在拆分 PDF…', async (onProgress) => {
      await splitPagesToZip(pages, assets.sources, assets.images, fileName || '文档', onProgress)
      toast.success('已打包下载拆分结果')
    })
  }

  async function compress(quality: CompressQuality) {
    setCompressOpen(false)
    await runTask('正在压缩…', async (onProgress) => {
      const bytes = await compressPages(pages, assets.sources, assets.images, quality, onProgress)
      downloadBytes(bytes, withPdfExtension(fileName || '文档', '-压缩'), 'application/pdf')
      toast.success('压缩完成')
    })
  }

  async function extractText() {
    await runTask('正在提取文字…', async () => {
      const text = await extractPagesText(pages)
      setExtractedText(text)
      setTextOpen(true)
    })
  }

  async function exportImages(options: { mime: 'image/png' | 'image/jpeg'; dpi: number }) {
    setImageOpen(false)
    await runTask('正在导出图片…', async (onProgress) => {
      await exportPagesAsImages({
        pages,
        sources: assets.sources,
        images: assets.images,
        mime: options.mime,
        dpi: options.dpi,
        fileName: fileName || '文档',
        onProgress,
      })
      toast.success('图片已打包下载')
    })
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = Boolean(
        event.isComposing ||
          target?.closest('textarea, input, [contenteditable="true"]') ||
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable,
      )
      if (typing) return

      const meta = event.metaKey || event.ctrlKey

      if (meta && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        openInputRef.current?.click()
        return
      }
      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void downloadPdf()
        return
      }
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (meta && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        rotatePages()
        return
      }
      if (meta && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        setFitMode('custom')
        setZoom(zoom + 0.1)
        return
      }
      if (meta && event.key === '-') {
        event.preventDefault()
        setFitMode('custom')
        setZoom(zoom - 0.1)
        return
      }
      if (meta && event.key === '0') {
        event.preventDefault()
        setFitMode('width')
        return
      }
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        setShortcutsOpen(true)
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedAnnotationId) {
          event.preventDefault()
          const host = pages.find((page) => page.annotations.some((ann) => ann.id === selectedAnnotationId))
          if (host) deleteAnnotation(host.id, selectedAnnotationId)
        } else if (event.key === 'Delete') {
          event.preventDefault()
          deletePages()
        }
        return
      }
      const toolMap: Record<string, (typeof Tools)[keyof typeof Tools]> = {
        v: Tools.select,
        t: Tools.text,
        h: Tools.highlight,
        u: Tools.underline,
        p: Tools.pen,
        r: Tools.rect,
        o: Tools.ellipse,
        l: Tools.line,
        a: Tools.arrow,
        i: Tools.image,
        s: Tools.stamp,
      }
      const mapped = toolMap[event.key.toLowerCase()]
      if (mapped && pages.length > 0) {
        setTool(mapped)
        if (mapped === Tools.image) imageInputRef.current?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    deleteAnnotation,
    deletePages,
    downloadPdf,
    pages,
    redo,
    rotatePages,
    selectedAnnotationId,
    setFitMode,
    setTool,
    setZoom,
    undo,
    zoom,
  ])

  useEffect(() => {
    function prevent(event: DragEvent) {
      event.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDrop={(event) => {
        event.preventDefault()
        const files = [...event.dataTransfer.files]
        if (files.length) void handleOpen(files, pages.length ? 'append' : 'replace')
      }}
    >
      <input
        ref={openInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          if (files.length) void handleOpen(files, 'replace')
        }}
      />
      <input
        ref={mergeInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          if (files.length) void handleOpen(files, 'append')
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) {
            setPendingImage(file)
            setTool(Tools.image)
            toast.message('单击页面以放置图片')
          } else {
            setTool(Tools.select)
          }
        }}
      />

      <Toolbar
        onOpen={() => openInputRef.current?.click()}
        onMerge={() => mergeInputRef.current?.click()}
        onDownload={() => void downloadPdf()}
        onExtract={() => void extractSelected()}
        onSplit={() => void splitPdf()}
        onCompress={() => setCompressOpen(true)}
        onText={() => void extractText()}
        onImages={() => setImageOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onPickImage={() => imageInputRef.current?.click()}
      />

      {pages.length === 0 && !fileName ? (
        <EmptyState
          onOpen={() => openInputRef.current?.click()}
          onSample={() =>
            openSample()
              .then(() => toast.success('已打开示例文档'))
              .catch((error) => toast.error(error instanceof Error ? error.message : '无法生成示例'))
          }
          onDropFiles={(files) => void handleOpen(files, 'replace')}
        />
      ) : pages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <p>文档里已经没有页面。</p>
          <button type="button" className="text-primary underline" onClick={() => useEditorStore.getState().insertBlankPage()}>
            插入空白页
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <PageSidebar />
          <DocumentCanvas pendingImage={pendingImage} onConsumeImage={() => setPendingImage(null)} />
          <PropertiesPanel />
        </div>
      )}

      <StatusBar />

      {busy ? <BusyOverlay message={busy} progress={loadProgress} /> : null}
      {passwordPrompt ? (
        <PasswordDialog
          fileName={passwordPrompt.fileName}
          incorrect={passwordPrompt.incorrect}
          onSubmit={(password) => submitPassword(password)}
          onCancel={() => submitPassword(null)}
        />
      ) : null}

      <CompressDialog open={compressOpen} onOpenChange={setCompressOpen} onConfirm={(quality) => void compress(quality)} />
      <ImageExportDialog open={imageOpen} onOpenChange={setImageOpen} onConfirm={(options) => void exportImages(options)} />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <TextDialog
        open={textOpen}
        text={extractedText}
        onOpenChange={setTextOpen}
        onCopy={() => {
          void navigator.clipboard.writeText(extractedText)
          toast.success('已复制文字')
        }}
        onDownload={() => {
          downloadBlob(new Blob([extractedText], { type: 'text/plain;charset=utf-8' }), `${fileName || '文档'}.txt`)
        }}
      />
    </div>
  )
}
