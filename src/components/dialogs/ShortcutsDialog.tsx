import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const shortcuts = [
  ['打开文件', 'Ctrl / ⌘ + O'],
  ['下载 PDF', 'Ctrl / ⌘ + S'],
  ['撤销', 'Ctrl / ⌘ + Z'],
  ['重做', 'Ctrl / ⌘ + Shift + Z'],
  ['删除批注或页面', 'Delete'],
  ['旋转所选页面', 'Ctrl / ⌘ + R'],
  ['放大 / 缩小', 'Ctrl / ⌘ + 滚轮，或 + / -'],
  ['适合宽度', 'Ctrl / ⌘ + 0'],
  ['选择 / 文本 / 高亮', 'V / T / H'],
  ['下划线 / 手绘 / 图片', 'U / P / I'],
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
        </DialogHeader>
        <ul className="divide-y text-sm">
          {shortcuts.map(([name, keys]) => (
            <li key={name} className="flex items-center justify-between py-2">
              <span>{name}</span>
              <kbd className="rounded bg-secondary px-2 py-1 text-xs">{keys}</kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
