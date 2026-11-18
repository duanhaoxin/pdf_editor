import { FileUp, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  onOpen: () => void
  onSample: () => void
  onDropFiles: (files: File[]) => void
}

export function EmptyState({ onOpen, onSample, onDropFiles }: Props) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
      <div
        className="w-full max-w-2xl rounded-3xl border-2 border-dashed border-primary/25 bg-card/80 p-8 shadow-sm md:p-12"
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(event) => {
          event.preventDefault()
          onDropFiles([...event.dataTransfer.files])
        }}
      >
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <FileUp className="size-8" />
        </div>
        <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground">轻页 PDF</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-muted-foreground">
          在浏览器里打开、批注、重排和导出 PDF。文件只留在本机，不会上传到任何服务器。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={onOpen}>
            打开 PDF
          </Button>
          <Button size="lg" variant="outline" onClick={onSample}>
            <Sparkles className="size-4" />
            打开示例文档
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">也可将 PDF 拖放到此区域，支持一次打开多个文件并合并。</p>
        <ul className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="rounded-2xl bg-secondary/70 p-4">
            <ShieldCheck className="mb-2 size-4 text-primary" />
            本地处理，无账号、无埋点
          </li>
          <li className="rounded-2xl bg-secondary/70 p-4">
            <FileUp className="mb-2 size-4 text-primary" />
            页面排序、旋转、拆分与合并
          </li>
          <li className="rounded-2xl bg-secondary/70 p-4">
            <Sparkles className="mb-2 size-4 text-primary" />
            文本、高亮、手绘、图片与印章
          </li>
        </ul>
      </div>
    </div>
  )
}
