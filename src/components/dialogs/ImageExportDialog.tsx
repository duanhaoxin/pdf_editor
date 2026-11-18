import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: { mime: 'image/png' | 'image/jpeg'; dpi: number }) => void
}

export function ImageExportDialog({ open, onOpenChange, onConfirm }: Props) {
  const [mime, setMime] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [dpi, setDpi] = useState(144)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导出为图片</DialogTitle>
          <DialogDescription>每页一张图，多页会打包成 ZIP 下载。导出内容包含当前批注。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mime === 'image/png' ? 'default' : 'outline'} onClick={() => setMime('image/png')}>
              PNG
            </Button>
            <Button variant={mime === 'image/jpeg' ? 'default' : 'outline'} onClick={() => setMime('image/jpeg')}>
              JPEG
            </Button>
          </div>
          <label className="block text-sm">
            分辨率
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              value={dpi}
              onChange={(event) => setDpi(Number(event.target.value))}
            >
              <option value={96}>96 DPI（较小）</option>
              <option value={144}>144 DPI（推荐）</option>
              <option value={200}>200 DPI（更清晰）</option>
            </select>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onConfirm({ mime, dpi })}>导出</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
