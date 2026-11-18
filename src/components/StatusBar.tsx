import { useEditorStore } from '@/store/editorStore'
import { assets } from '@/lib/assets'
import { formatBytes } from '@/lib/download'

export function StatusBar() {
  const pages = useEditorStore((s) => s.pages)
  const activePageId = useEditorStore((s) => s.activePageId)
  const zoom = useEditorStore((s) => s.zoom)
  const selectedPageIds = useEditorStore((s) => s.selectedPageIds)
  const tool = useEditorStore((s) => s.tool)
  const index = Math.max(0, pages.findIndex((page) => page.id === activePageId))
  const bytes = Object.values(assets.sources).reduce((sum, source) => sum + source.bytes.byteLength, 0)

  const toolHint: Record<string, string> = {
    select: '拖动批注可移动，Delete 删除',
    text: '单击页面添加文本框，可勾选遮盖原文',
    highlight: '拖动以高亮区域',
    underline: '拖动以下划线',
    pen: '按住拖动手绘',
    rect: '拖动绘制矩形',
    ellipse: '拖动绘制椭圆',
    line: '拖动绘制直线',
    arrow: '拖动绘制箭头',
    image: '先选择图片，再单击页面放置',
    stamp: '单击页面盖章',
  }

  return (
    <footer className="flex min-h-9 items-center justify-between gap-3 border-t bg-card px-3 text-xs text-muted-foreground">
      <p>
        {pages.length === 0
          ? '未打开文档'
          : `第 ${index + 1} / ${pages.length} 页 · 已选 ${selectedPageIds.length} 页`}
      </p>
      <p className="hidden truncate sm:block">{toolHint[tool]}</p>
      <p>
        {Math.round(zoom * 100)}%
        {bytes > 0 ? ` · ${formatBytes(bytes)}` : ''}
      </p>
    </footer>
  )
}
