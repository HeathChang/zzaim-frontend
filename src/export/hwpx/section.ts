/** `Contents/section0.xml` — 용지·단·본문 (zz-9 D3·D5).
 *
 *  용지와 단 설정은 **첫 문단 안**에 산다(`hp:secPr` · `hp:colPr`). 한글 파일이
 *  그렇게 생겼다 — 문서 속성이 아니라 «첫 문단에 붙은 제어»다. 그래서 본문이
 *  비어 있어도 문단이 최소 하나는 있어야 한다. */
import { paragraphXml, type ParagraphInput } from '@/export/hwpx/asText'
import { NAMESPACES, XML_DECL } from '@/export/hwpx/xml'
import { PAGE_HWPUNIT, mmToHwp } from '@/export/hwpx/units'
import type { LayoutConfig } from '@/layout/types'

export interface SectionInput {
  config: LayoutConfig
  /** 단 폭(mm) — 조판 엔진이 계산한 값을 그대로 쓴다 */
  columnWidthMm: number
  paragraphs: ParagraphInput[]
}

function secPr(config: LayoutConfig): string {
  // 가로면 치수를 바꾼다 — 한글에도 «가로 용지»가 그대로 가야 한다
  const base = PAGE_HWPUNIT[config.pageSize]
  const paper =
    config.orientation === 'landscape' ? { width: base.height, height: base.width } : base
  const m = config.margin
  return (
    '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000"' +
    ' tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="0" memoShapeIDRef="0"' +
    ' textVerticalWidthHead="0" masterPageCnt="0">' +
    '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>' +
    `<hp:startNum pageStartsOn="BOTH" page="${config.startNumber}" pic="0" tbl="0" equation="0"/>` +
    '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0"' +
    ' border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0"' +
    ' showLineNumber="0"/>' +
    '<hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>' +
    `<hp:pagePr landscape="WIDELY" width="${paper.width}" height="${paper.height}"` +
    ' gutterType="LEFT_ONLY">' +
    // ⚠ 여백은 여기서 준다. 인쇄 경로(`@page margin: 0`)와 정반대인데,
    // 한글에는 «지면 요소가 여백을 그린다»는 개념이 없기 때문이다
    `<hp:margin header="0" footer="0" gutter="0" left="${mmToHwp(m.inner)}"` +
    ` right="${mmToHwp(m.outer)}" top="${mmToHwp(m.top)}" bottom="${mmToHwp(m.bottom)}"/>` +
    '</hp:pagePr>' +
    '<hp:footNotePr>' +
    '<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>' +
    '<hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/>' +
    '<hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/>' +
    '<hp:numbering type="CONTINUOUS" newNum="1"/>' +
    '<hp:placement place="EACH_COLUMN" beneathText="0"/>' +
    '</hp:footNotePr>' +
    '<hp:endNotePr>' +
    '<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/>' +
    '<hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/>' +
    '<hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/>' +
    '<hp:numbering type="CONTINUOUS" newNum="1"/>' +
    '<hp:placement place="END_OF_DOCUMENT" beneathText="0"/>' +
    '</hp:endNotePr>' +
    (['BOTH', 'EVEN', 'ODD'] as const)
      .map(
        (type) =>
          `<hp:pageBorderFill type="${type}" borderFillIDRef="1" textBorder="PAPER"` +
          ' headerInside="0" footerInside="0" fillArea="PAPER">' +
          '<hp:offset left="1417" right="1417" top="1417" bottom="1417"/>' +
          '</hp:pageBorderFill>',
      )
      .join('') +
    '</hp:secPr>'
  )
}

/** 단 설정. **폭과 간격을 우리 값으로 못 박는다** — 한글에 맡기면 단 폭이
 *  달라지고, 그러면 한 단에 들어가던 문항이 넘친다 */
function colPr(config: LayoutConfig, columnWidthMm: number): string {
  const count = config.columns
  if (count <= 1) {
    return '<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl>'
  }
  const width = mmToHwp(columnWidthMm)
  const gap = mmToHwp(config.gutter)
  const sizes = Array.from({ length: count }, (_, i) =>
    `<hp:colSz width="${width}" gap="${i === count - 1 ? 0 : gap}"/>`,
  ).join('')
  return (
    '<hp:ctrl>' +
    `<hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="${count}" sameSz="1" sameGap="0">` +
    sizes +
    '</hp:colPr>' +
    '</hp:ctrl>'
  )
}

export function buildSectionXml(input: SectionInput): string {
  const { config, columnWidthMm } = input
  // 본문이 비어도 문단 하나는 있어야 한다 — 용지·단 설정이 거기 붙는다
  const paragraphs = input.paragraphs.length > 0 ? input.paragraphs : [{ text: '' }]
  const head = secPr(config) + colPr(config, columnWidthMm)

  const body = paragraphs
    .map((p, i) =>
      // ⚠ 첫 문단은 **쪽·단을 넘기지 않는다.** 첫 문단에서 넘기면 앞에 빈 쪽이 생긴다
      i === 0
        ? paragraphXml({ ...p, pageBreak: false, columnBreak: false }, i + 1, head)
        : paragraphXml(p, i + 1),
    )
    .join('')

  return XML_DECL + `<hs:sec ${NAMESPACES}>` + body + '</hs:sec>'
}
