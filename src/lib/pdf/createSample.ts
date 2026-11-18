import { PDFDocument, rgb } from 'pdf-lib'
import { getChineseFontBytes } from './font'

export async function createSamplePdf(): Promise<{ bytes: Uint8Array; name: string }> {
  const pdf = await PDFDocument.create()
  const fontkit = (await import('@/lib/pdf/fontkit')).default
  pdf.registerFontkit(fontkit as never)
  const font = await pdf.embedFont(await getChineseFontBytes(), { subset: false })
  const accent = rgb(0.18, 0.35, 0.55)
  const ink = rgb(0.15, 0.13, 0.12)
  const muted = rgb(0.38, 0.35, 0.32)

  const page1 = pdf.addPage([595.28, 841.89])
  page1.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: accent })
  page1.drawText('轻页 PDF 示例文档', {
    x: 48,
    y: 792,
    size: 22,
    font,
    color: rgb(1, 1, 1),
  })
  page1.drawText('全部编辑都在浏览器本地完成，文件不会上传。', {
    x: 48,
    y: 768,
    size: 11,
    font,
    color: rgb(0.9, 0.93, 0.96),
  })

  const intro = [
    '这是一份可随意修改的多页示例，用来体验打开、批注、排版和导出。',
    '你可以：拖动左侧缩略图调整页序、旋转或删除页面、插入空白页。',
    '在页面上添加文本框、高亮、下划线、手绘、形状、图片和印章。',
    '文本框可勾选「遮盖原文」，覆盖后再写新内容，适合修订条款。',
  ]
  intro.forEach((line, i) => {
    page1.drawText(line, { x: 48, y: 700 - i * 28, size: 13, font, color: ink })
  })

  const features = ['打开 / 合并 PDF', '页面排序与旋转', '批注写入导出文件', '拆分、压缩、提取文字', '导出 PNG / JPEG', '撤销与重做']
  features.forEach((label, i) => {
    const x = 48 + (i % 2) * 250
    const y = 520 - Math.floor(i / 2) * 42
    page1.drawRectangle({
      x,
      y: y - 8,
      width: 230,
      height: 32,
      color: rgb(0.93, 0.9, 0.84),
      borderColor: rgb(0.82, 0.78, 0.7),
      borderWidth: 1,
    })
    page1.drawText(label, { x: x + 14, y: y + 2, size: 12, font, color: accent })
  })

  page1.drawText('第 1 页 · 功能导览', { x: 48, y: 40, size: 10, font, color: muted })

  const page2 = pdf.addPage([595.28, 841.89])
  page2.drawText('示例条款（可高亮或遮盖后重写）', {
    x: 48,
    y: 780,
    size: 18,
    font,
    color: accent,
  })
  const clauses = [
    '第一条  保密义务。接收方应对本文件中的非公开信息予以保密，未经书面许可不得向第三方披露。',
    '第二条  交付时间。供方应在合同生效后十五个工作日内完成初稿交付，并预留三个工作日供需方提出书面修改意见。',
    '第三条  费用与结算。项目总价为人民币捌万元整，于验收通过后五个工作日内一次性支付。',
    '第四条  争议解决。因本合同引起的争议，双方应先行协商；协商不成的，提交文件签署地有管辖权的人民法院处理。',
    '第五条  文本效力。本合同一式两份，双方各执一份，具有同等法律效力。',
  ]
  clauses.forEach((line, i) => {
    const y = 720 - i * 96
    page2.drawRectangle({
      x: 44,
      y: y - 48,
      width: 508,
      height: 84,
      color: rgb(0.98, 0.97, 0.94),
    })
    wrap(page2, font, line, 56, y, 12, 480, ink)
  })
  page2.drawText('第 2 页 · 长文本', { x: 48, y: 40, size: 10, font, color: muted })

  const page3 = pdf.addPage([595.28, 841.89])
  page3.drawText('行程与清单', { x: 48, y: 780, size: 18, font, color: accent })
  const rows = [
    ['日期', '事项', '负责人'],
    ['周一', '整理材料并打开 PDF', '编辑'],
    ['周二', '批注关键条款', '法务'],
    ['周三', '插入附图与印章', '设计'],
    ['周四', '压缩后发给同事', '项目'],
  ]
  rows.forEach((row, r) => {
    const y = 720 - r * 36
    page3.drawRectangle({
      x: 48,
      y: y - 10,
      width: 500,
      height: 32,
      color: r === 0 ? rgb(0.18, 0.35, 0.55) : r % 2 === 0 ? rgb(0.95, 0.93, 0.88) : rgb(1, 1, 1),
    })
    const color = r === 0 ? rgb(1, 1, 1) : ink
    page3.drawText(row[0], { x: 60, y, size: 12, font, color })
    page3.drawText(row[1], { x: 180, y, size: 12, font, color })
    page3.drawText(row[2], { x: 430, y, size: 12, font, color })
  })
  page3.drawText('可在本页练习图片、形状和手绘批注。', {
    x: 48,
    y: 500,
    size: 13,
    font,
    color: ink,
  })
  page3.drawEllipse({
    x: 160,
    y: 360,
    xScale: 70,
    yScale: 48,
    borderColor: accent,
    borderWidth: 2,
    color: rgb(0.85, 0.9, 0.95),
  })
  page3.drawRectangle({
    x: 300,
    y: 312,
    width: 180,
    height: 96,
    borderColor: rgb(0.55, 0.35, 0.18),
    borderWidth: 2,
  })
  page3.drawText('插图区域', { x: 348, y: 352, size: 12, font, color: muted })
  page3.drawText('第 3 页 · 清单', { x: 48, y: 40, size: 10, font, color: muted })

  const page4 = pdf.addPage([595.28, 841.89])
  page4.drawText('草稿页', { x: 48, y: 780, size: 18, font, color: accent })
  page4.drawText('这里空间较大，适合练习手绘、箭头、印章和文本框。', {
    x: 48,
    y: 748,
    size: 12,
    font,
    color: ink,
  })
  page4.drawLine({
    start: { x: 48, y: 700 },
    end: { x: 547, y: 700 },
    thickness: 1,
    color: rgb(0.8, 0.76, 0.7),
  })
  for (let i = 0; i < 12; i += 1) {
    page4.drawLine({
      start: { x: 48, y: 660 - i * 44 },
      end: { x: 547, y: 660 - i * 44 },
      thickness: 0.6,
      color: rgb(0.9, 0.87, 0.82),
    })
  }
  page4.drawText('第 4 页 · 草稿', { x: 48, y: 40, size: 10, font, color: muted })

  const bytes = await pdf.save()
  return { bytes, name: '轻页示例.pdf' }
}

function wrap(
  page: ReturnType<PDFDocument['addPage']>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  text: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
) {
  const chars = [...text]
  let line = ''
  let cursor = y
  for (const ch of chars) {
    const next = line + ch
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: cursor, size, font, color })
      line = ch
      cursor -= size * 1.45
    } else {
      line = next
    }
  }
  if (line) page.drawText(line, { x, y: cursor, size, font, color })
}
