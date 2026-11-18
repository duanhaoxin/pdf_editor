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
import { COMPRESS_PRESETS, type CompressQuality } from '@/lib/pdf/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (quality: CompressQuality) => void
}

export function CompressDialog({ open, onOpenChange, onConfirm }: Props) {
  const [quality, setQuality] = useState<CompressQuality>('standard')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>压缩 PDF</DialogTitle>
          <DialogDescription>
            会把页面栅格化后再打包，从而减小体积。批注会一并写入。压缩后的文件将直接下载，不会替换当前文档。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {(Object.keys(COMPRESS_PRESETS) as CompressQuality[]).map((key) => {
            const preset = COMPRESS_PRESETS[key]
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="compress-quality"
                  checked={quality === key}
                  onChange={() => setQuality(key)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onConfirm(quality)}>压缩并下载</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
