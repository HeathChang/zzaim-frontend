/** 문단 하나를 OWPML 로 (zz-9 D3 «텍스트 + 강제 경계»).
 *
 *  ★ **강제 경계가 이 방식의 전부다.** 한글은 우리 조판을 모르고 자기 규칙으로
 *  다시 흘린다. 그래도 `hp:p` 의 `pageBreak` · `columnBreak` 를 켜 두면
 *  **쪽·단 경계만은 우리가 정한 자리에 남는다** — 문항이 쪽을 넘어 잘리지 않는다.
 *  보장하는 것과 못 하는 것의 경계가 바로 여기다 (D2).
 *
 *  `hp:linesegarray` 는 한글이 다시 계산하지만, 실제 파일은 **빈 문단에도**
 *  하나씩 갖고 있어 함께 넣는다. */
import { escapeText, stripInvalidXmlChars } from '@/export/hwpx/xml'
import { CHAR_BODY, PARA_END } from '@/export/hwpx/header'

export interface ParagraphInput {
  /** 문단 텍스트. 빈 문자열이면 빈 줄이 된다 */
  text: string
  /** ★ 이 문단에서 **쪽을 넘긴다** */
  pageBreak?: boolean
  /** ★ 이 문단에서 **단을 넘긴다** */
  columnBreak?: boolean
  charPrId?: number
  paraPrId?: number
  /** 지문 상자로 감싼다 — 1칸짜리 표가 된다 */
  boxed?: { widthHwp: number }
}

/** 한글이 다시 계산하지만 형식상 필요하다 */
function lineseg(): string {
  return (
    '<hp:linesegarray>' +
    '<hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850"' +
    ' spacing="600" horzpos="0" horzsize="0" flags="393216"/>' +
    '</hp:linesegarray>'
  )
}

function textRun(text: string, charPrId: number): string {
  const clean = stripInvalidXmlChars(text)
  return (
    `<hp:run charPrIDRef="${charPrId}">` +
    (clean === '' ? '<hp:t/>' : `<hp:t>${escapeText(clean)}</hp:t>`) +
    '</hp:run>'
  )
}

/** 지문 상자 = **1행 1열 표.** 한글에서 테두리가 살아 있고 안의 글이 편집된다 */
function boxedRun(text: string, charPrId: number, widthHwp: number): string {
  const inner =
    `<hp:p id="0" paraPrIDRef="${PARA_END}" styleIDRef="0" pageBreak="0" columnBreak="0"` +
    ` merged="0">${textRun(text, charPrId)}${lineseg()}</hp:p>`
  return (
    `<hp:run charPrIDRef="${charPrId}">` +
    '<hp:tbl id="0" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM"' +
    ' textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0"' +
    ' rowCnt="1" colCnt="1" cellSpacing="0" borderFillIDRef="3" noAdjust="0">' +
    `<hp:sz width="${widthHwp}" widthRelTo="ABSOLUTE" height="1000" heightRelTo="ABSOLUTE" protect="0"/>` +
    '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0"' +
    ' holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT"' +
    ' vertOffset="0" horzOffset="0"/>' +
    '<hp:outMargin left="0" right="0" top="0" bottom="0"/>' +
    '<hp:inMargin left="510" right="510" top="141" bottom="141"/>' +
    '<hp:tr><hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0"' +
    ' borderFillIDRef="3">' +
    '<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="TOP"' +
    ' linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0"' +
    ' hasNumRef="0">' +
    inner +
    '</hp:subList>' +
    '<hp:cellAddr colAddr="0" rowAddr="0"/>' +
    '<hp:cellSpan colSpan="1" rowSpan="1"/>' +
    `<hp:cellSz width="${widthHwp}" height="1000"/>` +
    '<hp:cellMargin left="510" right="510" top="141" bottom="141"/>' +
    '</hp:tc></hp:tr>' +
    '</hp:tbl>' +
    '<hp:t/>' +
    '</hp:run>'
  )
}

export function paragraphXml(p: ParagraphInput, id: number, extraInRun = ''): string {
  const charPrId = p.charPrId ?? CHAR_BODY
  const run = p.boxed
    ? boxedRun(p.text, charPrId, p.boxed.widthHwp)
    : textRun(p.text, charPrId)
  // `extraInRun` 은 첫 문단의 `secPr`·`colPr` 자리다 — 반드시 run **안**에 온다
  const withExtra = extraInRun
    ? run.replace(/^(<hp:run[^>]*>)/, `$1${extraInRun}`)
    : run
  return (
    `<hp:p id="${id}" paraPrIDRef="${p.paraPrId ?? PARA_END}" styleIDRef="0"` +
    ` pageBreak="${p.pageBreak ? 1 : 0}" columnBreak="${p.columnBreak ? 1 : 0}" merged="0">` +
    withExtra +
    lineseg() +
    '</hp:p>'
  )
}
