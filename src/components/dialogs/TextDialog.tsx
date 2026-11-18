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
  text: string
  onOpenChange: (open: boolean) => void
  onCopy: () => void
  onDownload: () => void
}

export function TextDialog({ open, text, onOpenChange, onCopy, onDownload }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>提取文字</DialogTitle>
          <DialogDescription>从当前文档页面识别到的文本。扫描件可能没有可选文字。</DialogDescription>
        </DialogHeader>
        <textarea
          className="h-80 w-full rounded-xl border bg-secondary/40 p-3 text-sm leading-6 outline-none"
          readOnly
          value={text}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCopy}>
            复制
          </Button>
          <Button onClick={onDownload}>下载 TXT</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
