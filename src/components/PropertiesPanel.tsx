import { STAMP_LABELS, StampKinds, Tools } from '@/lib/pdf/types'
import { useEditorStore } from '@/store/editorStore'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const highlightSwatches = ['#facc15', '#86efac', '#7dd3fc', '#f9a8d4', '#fdba74']

export function PropertiesPanel() {
  const tool = useEditorStore((s) => s.tool)
  const pages = useEditorStore((s) => s.pages)
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId)
  const strokeColor = useEditorStore((s) => s.strokeColor)
  const fillColor = useEditorStore((s) => s.fillColor)
  const fillEnabled = useEditorStore((s) => s.fillEnabled)
  const strokeWidth = useEditorStore((s) => s.strokeWidth)
  const fontSize = useEditorStore((s) => s.fontSize)
  const highlightColor = useEditorStore((s) => s.highlightColor)
  const stampKind = useEditorStore((s) => s.stampKind)
  const coverBackground = useEditorStore((s) => s.coverBackground)
  const zoom = useEditorStore((s) => s.zoom)
  const setStrokeColor = useEditorStore((s) => s.setStrokeColor)
  const setFillColor = useEditorStore((s) => s.setFillColor)
  const setFillEnabled = useEditorStore((s) => s.setFillEnabled)
  const setStrokeWidth = useEditorStore((s) => s.setStrokeWidth)
  const setFontSize = useEditorStore((s) => s.setFontSize)
  const setHighlightColor = useEditorStore((s) => s.setHighlightColor)
  const setStampKind = useEditorStore((s) => s.setStampKind)
  const setCoverBackground = useEditorStore((s) => s.setCoverBackground)
  const setZoom = useEditorStore((s) => s.setZoom)
  const setFitMode = useEditorStore((s) => s.setFitMode)
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation)
  const deleteAnnotation = useEditorStore((s) => s.deleteAnnotation)

  const selected = pages.flatMap((page) => page.annotations.map((ann) => ({ page, ann }))).find(
    ({ ann }) => ann.id === selectedAnnotationId,
  )

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-l bg-card lg:flex">
      <div className="px-4 py-3 text-sm font-medium">属性</div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6">
        <section className="space-y-2">
          <Label>缩放 {Math.round(zoom * 100)}%</Label>
          <Slider
            min={35}
            max={240}
            value={[Math.round(zoom * 100)]}
            onValueChange={([value]) => {
              setFitMode('custom')
              setZoom(value / 100)
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setFitMode('width')}>
              适合宽度
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFitMode('custom')
                setZoom(1)
              }}
            >
              100%
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <Label>颜色</Label>
          <div className="flex items-center gap-2">
            <Input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="h-9 w-12 p-1" />
            <span className="text-xs text-muted-foreground">描边 / 文字</span>
          </div>
          {(tool === Tools.rect || tool === Tools.ellipse) && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fillEnabled}
                onChange={(e) => setFillEnabled(e.target.checked)}
              />
              填充
              <Input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="h-8 w-10 p-1" />
            </label>
          )}
        </section>

        <section className="space-y-2">
          <Label>粗细 {strokeWidth}pt</Label>
          <Slider min={1} max={12} value={[strokeWidth]} onValueChange={([value]) => setStrokeWidth(value)} />
        </section>

        {(tool === Tools.text || selected?.ann.type === 'text') && (
          <section className="space-y-2">
            <Label>字号 {fontSize}</Label>
            <Slider min={9} max={48} value={[fontSize]} onValueChange={([value]) => setFontSize(value)} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={coverBackground}
                onChange={(e) => setCoverBackground(e.target.checked)}
              />
              遮盖原文
            </label>
          </section>
        )}

        {(tool === Tools.highlight || tool === Tools.underline) && (
          <section className="space-y-2">
            <Label>高亮色</Label>
            <div className="flex flex-wrap gap-2">
              {highlightSwatches.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="size-7 rounded-full border"
                  style={{ background: color, outline: highlightColor === color ? '2px solid #1d4ed8' : undefined }}
                  onClick={() => setHighlightColor(color)}
                />
              ))}
            </div>
          </section>
        )}

        {tool === Tools.stamp && (
          <section className="space-y-2">
            <Label>印章</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(StampKinds).map((kind) => (
                <Button
                  key={kind}
                  size="sm"
                  variant={stampKind === kind ? 'default' : 'outline'}
                  onClick={() => setStampKind(kind)}
                >
                  {STAMP_LABELS[kind]}
                </Button>
              ))}
            </div>
          </section>
        )}

        {selected ? (
          <section className="space-y-2 rounded-xl bg-secondary/60 p-3">
            <p className="text-sm font-medium">已选批注</p>
            {selected.ann.type === 'text' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.ann.coverBackground}
                  onChange={(e) => {
                    if (selected.ann.type !== 'text') return
                    updateAnnotation(selected.page.id, {
                      ...selected.ann,
                      coverBackground: e.target.checked,
                    })
                  }}
                />
                白色遮盖
              </label>
            ) : null}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteAnnotation(selected.page.id, selected.ann.id)}
            >
              删除批注
            </Button>
          </section>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            选择工具后在页面上拖动即可添加批注。文本框支持「遮盖原文」，导出时会写入 PDF。
          </p>
        )}
      </div>
    </aside>
  )
}
