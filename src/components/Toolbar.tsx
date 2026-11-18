import type { ReactNode } from 'react'
import {
  ArrowDownToLine,
  FilePlus2,
  FolderOpen,
  Highlighter,
  ImagePlus,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCw,
  Spline,
  Square,
  Stamp,
  Trash2,
  Type,
  Underline,
  Undo2,
  Files,
  Circle,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Tools, type Tool } from '@/lib/pdf/types'
import { useEditorStore } from '@/store/editorStore'

const toolButtons: Array<{ id: Tool; label: string; shortcut: string; icon: typeof Type }> = [
  { id: Tools.select, label: '选择', shortcut: 'V', icon: MousePointer2 },
  { id: Tools.text, label: '文本框', shortcut: 'T', icon: Type },
  { id: Tools.highlight, label: '高亮', shortcut: 'H', icon: Highlighter },
  { id: Tools.underline, label: '下划线', shortcut: 'U', icon: Underline },
  { id: Tools.pen, label: '手绘', shortcut: 'P', icon: Pencil },
  { id: Tools.rect, label: '矩形', shortcut: 'R', icon: Square },
  { id: Tools.ellipse, label: '椭圆', shortcut: 'O', icon: Circle },
  { id: Tools.line, label: '直线', shortcut: 'L', icon: Minus },
  { id: Tools.arrow, label: '箭头', shortcut: 'A', icon: Spline },
  { id: Tools.image, label: '图片', shortcut: 'I', icon: ImagePlus },
  { id: Tools.stamp, label: '印章', shortcut: 'S', icon: Stamp },
]

type Props = {
  onOpen: () => void
  onMerge: () => void
  onDownload: () => void
  onExtract: () => void
  onSplit: () => void
  onCompress: () => void
  onText: () => void
  onImages: () => void
  onShortcuts: () => void
  onPickImage: () => void
}

export function Toolbar({
  onOpen,
  onMerge,
  onDownload,
  onExtract,
  onSplit,
  onCompress,
  onText,
  onImages,
  onShortcuts,
  onPickImage,
}: Props) {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const fileName = useEditorStore((s) => s.fileName)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const rotatePages = useEditorStore((s) => s.rotatePages)
  const deletePages = useEditorStore((s) => s.deletePages)
  const insertBlankPage = useEditorStore((s) => s.insertBlankPage)
  const hasDoc = useEditorStore((s) => s.pages.length > 0)

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b bg-card/90 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          页
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none">轻页 PDF</p>
          <p className="mt-1 max-w-[16rem] truncate text-xs text-muted-foreground">
            {fileName || '尚未打开文档'}
          </p>
        </div>
      </div>

      <Separator orientation="vertical" className="hidden h-8 sm:block" />

      <ToolButton label="打开" shortcut="⌘O" onClick={onOpen}>
        <FolderOpen />
      </ToolButton>
      <ToolButton label="合并 PDF" disabled={!hasDoc} onClick={onMerge}>
        <FilePlus2 />
      </ToolButton>
      <ToolButton label="撤销" shortcut="⌘Z" disabled={!canUndo} onClick={undo}>
        <Undo2 />
      </ToolButton>
      <ToolButton label="重做" shortcut="⌘⇧Z" disabled={!canRedo} onClick={redo}>
        <Redo2 />
      </ToolButton>

      <Separator orientation="vertical" className="hidden h-8 md:block" />

      <div className="flex flex-wrap items-center gap-0.5">
        {toolButtons.map((item) => {
          const Icon = item.icon
          return (
            <ToolButton
              key={item.id}
              label={item.label}
              shortcut={item.shortcut}
              active={tool === item.id}
              disabled={!hasDoc}
              onClick={() => {
                setTool(item.id)
                if (item.id === Tools.image) onPickImage()
              }}
            >
              <Icon />
            </ToolButton>
          )
        })}
      </div>

      <Separator orientation="vertical" className="hidden h-8 lg:block" />

      <ToolButton label="旋转页面" disabled={!hasDoc} onClick={() => rotatePages()}>
        <RotateCw />
      </ToolButton>
      <ToolButton label="插入空白页" disabled={!hasDoc} onClick={() => insertBlankPage()}>
        <FilePlus2 />
      </ToolButton>
      <ToolButton label="删除页面" disabled={!hasDoc} onClick={() => deletePages()}>
        <Trash2 />
      </ToolButton>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={onShortcuts}>
          快捷键
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!hasDoc}>
              <Files className="size-4" />
              工具
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExtract}>提取所选页面</DropdownMenuItem>
            <DropdownMenuItem onClick={onSplit}>拆分成多个 PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={onCompress}>压缩 PDF</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onText}>提取文字</DropdownMenuItem>
            <DropdownMenuItem onClick={onImages}>导出为图片</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button disabled={!hasDoc} onClick={onDownload}>
          <ArrowDownToLine className="size-4" />
          下载 PDF
        </Button>
      </div>
    </header>
  )
}

function ToolButton({
  label,
  shortcut,
  children,
  onClick,
  disabled,
  active,
}: {
  label: string
  shortcut?: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={active ? 'default' : 'ghost'}
          disabled={disabled}
          onClick={onClick}
          className={cn(active && 'shadow-sm')}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? <span className="ml-2 opacity-70">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  )
}
