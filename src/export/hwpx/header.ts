/** `Contents/header.xml` — 폰트·글자모양·문단모양·스타일 (zz-9 D5).
 *
 *  **구조는 한글이 만든 실제 파일에서 그대로 옮겼다.** `refList` 의 자식 순서까지
 *  같다(fontfaces → borderFills → charProperties → tabProperties → numberings →
 *  paraProperties → styles). 순서를 바꾸거나 하나를 빼면 열리지 않는다 —
 *  스키마가 순서를 정하고 있고, 우리는 그것을 확인할 한글이 없다.
 *  **지어내지 않는다는 원칙이 여기서는 «표본을 벗어나지 않는다»는 뜻이다.** */
import { EXPORT_FONT, FONT_LANGS } from '@/export/hwpx/fontMap'
import { NAMESPACES, XML_DECL, escapeAttr } from '@/export/hwpx/xml'
import { pxToFontHeight, lineSpacingPercent } from '@/export/hwpx/units'

/** 한글 산출물에서 그대로 옮긴 기본 번호매기기 정의.
 *  우리는 자동 번호를 쓰지 않지만(D3 — 번호는 글자로 박는다) 목록 자체는 남긴다. */
const NUMBERINGS =
  '<hh:numberings itemCnt="1"><hh:numbering id="1" start="0"><hh:paraHead start="1" level="1" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^1.</hh:paraHead><hh:paraHead start="1" level="2" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^2.</hh:paraHead><hh:paraHead start="1" level="3" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^3)</hh:paraHead><hh:paraHead start="1" level="4" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^4)</hh:paraHead><hh:paraHead start="1" level="5" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">(^5)</hh:paraHead><hh:paraHead start="1" level="6" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">(^6)</hh:paraHead><hh:paraHead start="1" level="7" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="CIRCLED_DIGIT" charPrIDRef="4294967295" checkable="1">^7</hh:paraHead></hh:numbering></hh:numberings>'

export interface HeaderInput {
  /** 본문 글자 크기(px). 우리 조판이 쓰는 값 그대로 */
  fontPx: number
  /** 본문 줄 간격(px) */
  lineHeightPx: number
}

/** 글자모양 id. **문단이 이 번호를 가리키므로 바꾸면 양쪽을 함께 고쳐야 한다** */
export const CHAR_BODY = 0

/** 문단모양 id.
 *
 *  ★ **한 문항을 한 덩어리로 묶는 것이 이 두 개의 존재 이유다.**
 *  D2 가 «문항이 쪽을 넘어 잘리지 않는다»를 약속하는데, 강제 경계만으로는
 *  단 **안에서** 한글이 문항을 쪼개는 것을 막지 못한다. 그래서 문항의 마지막 줄을
 *  뺀 모든 줄에 «다음 문단과 함께 붙임»을, 모든 줄에 «문단 나누지 않음»을 준다. */
/** 문항의 이어지는 줄 — 다음 줄과 붙어 다닌다 */
export const PARA_KEEP = 0
/** 문항의 **마지막** 줄 — 여기서 끊어도 된다. 안 끊으면 다음 문항까지 딸려 간다 */
export const PARA_END = 1

/** 테두리 id. 1 = 없음(문서 기본), 2 = 글자·문단이 가리키는 «없음»,
 *  3 = 실선(지문 상자). 실제 파일도 1부터 시작한다 — **0 은 쓰지 않는다** */
export const BORDER_NONE = 2
export const BORDER_SOLID = 3

function fontfaces(): string {
  const one = (lang: string) =>
    `<hh:fontface lang="${lang}" fontCnt="1">` +
    `<hh:font id="0" face="${escapeAttr(EXPORT_FONT)}" type="TTF" isEmbedded="0">` +
    '<hh:typeInfo familyType="FCAT_GOTHIC" weight="8" proportion="4" contrast="0"' +
    ' strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/>' +
    '</hh:font></hh:fontface>'
  return (
    `<hh:fontfaces itemCnt="${FONT_LANGS.length}">` + FONT_LANGS.map(one).join('') + '</hh:fontfaces>'
  )
}

function border(id: number, type: 'NONE' | 'SOLID'): string {
  const side = (name: string) =>
    `<hh:${name} type="${type}" width="0.12 mm" color="#000000"/>`
  return (
    `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">` +
    '<hh:slash type="NONE" Crooked="0" isCounter="0"/>' +
    '<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>' +
    side('leftBorder') +
    side('rightBorder') +
    side('topBorder') +
    side('bottomBorder') +
    '<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>' +
    '</hh:borderFill>'
  )
}

// ⚠ 굵은 글자모양을 두지 않는다. `hh:bold` 는 **표본에 없는 마크업**이고 쓰는 곳도
// 없었다 — 근거 없는 태그를 넣었다가 파일이 안 열리면 원인을 찾을 길이 없다
function charPr(id: number, heightHundredthPt: number): string {
  const per = (attr: string, value: string) =>
    `<hh:${attr} hangul="${value}" latin="${value}" hanja="${value}" japanese="${value}"` +
    ` other="${value}" symbol="${value}" user="${value}"/>`
  return (
    `<hh:charPr id="${id}" height="${heightHundredthPt}" textColor="#000000" shadeColor="none"` +
    ` useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="${BORDER_NONE}">` +
    per('fontRef', '0') +
    per('ratio', '100') +
    per('spacing', '0') +
    per('relSz', '100') +
    per('offset', '0') +
    '<hh:underline type="NONE" shape="SOLID" color="#000000"/>' +
    '<hh:strikeout shape="NONE" color="#000000"/>' +
    '<hh:outline type="NONE"/>' +
    '<hh:shadow type="NONE" color="#B2B2B2" offsetX="10" offsetY="10"/>' +
    '</hh:charPr>'
  )
}

/** ⚠ 실제 파일은 문단 여백·행간을 `hp:switch`(2016 확장) 로 **두 번** 적는다.
 *  확장을 모르는 한글이 `hp:default` 를 읽게 하려는 구조라, 우리도 그대로 둔다. */
function paraPr(
  id: number,
  spacingPercent: number,
  marginNext: number,
  keepWithNext: boolean,
): string {
  const body =
    '<hh:margin>' +
    '<hc:intent value="0" unit="HWPUNIT"/>' +
    '<hc:left value="0" unit="HWPUNIT"/>' +
    '<hc:right value="0" unit="HWPUNIT"/>' +
    '<hc:prev value="0" unit="HWPUNIT"/>' +
    `<hc:next value="${marginNext}" unit="HWPUNIT"/>` +
    '</hh:margin>' +
    `<hh:lineSpacing type="PERCENT" value="${spacingPercent}" unit="HWPUNIT"/>`
  return (
    `<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1"` +
    ' suppressLineNumbers="0" checked="0">' +
    '<hh:align horizontal="JUSTIFY" vertical="BASELINE"/>' +
    '<hh:heading type="NONE" idRef="0" level="0"/>' +
    // ★ `keepLines` = 이 문단을 쪼개지 않는다 · `keepWithNext` = 다음 문단과 붙인다
    '<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0"' +
    ` keepWithNext="${keepWithNext ? 1 : 0}" keepLines="1" pageBreakBefore="0" lineWrap="BREAK"/>` +
    '<hh:autoSpacing eAsianEng="0" eAsianNum="0"/>' +
    '<hp:switch>' +
    '<hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">' +
    body +
    '</hp:case>' +
    '<hp:default>' +
    body +
    '</hp:default>' +
    '</hp:switch>' +
    `<hh:border borderFillIDRef="${BORDER_NONE}" offsetLeft="0" offsetRight="0" offsetTop="0"` +
    ' offsetBottom="0" connect="0" ignoreMargin="0"/>' +
    '</hh:paraPr>'
  )
}

export function buildHeaderXml(input: HeaderInput): string {
  const height = pxToFontHeight(input.fontPx)
  const spacing = lineSpacingPercent(input.fontPx, input.lineHeightPx)
  // 문항 사이 간격 — 우리 조판의 `gap` 에 해당한다
  const gapNext = Math.round(input.fontPx * 0.4 * 75)

  return (
    XML_DECL +
    `<hh:head ${NAMESPACES} version="1.4" secCnt="1">` +
    '<hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>' +
    '<hh:refList>' +
    fontfaces() +
    `<hh:borderFills itemCnt="3">${border(1, 'NONE')}${border(BORDER_NONE, 'NONE')}${border(
      BORDER_SOLID,
      'SOLID',
    )}</hh:borderFills>` +
    `<hh:charProperties itemCnt="1">${charPr(CHAR_BODY, height)}</hh:charProperties>` +
    '<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>' +
    // ⚠ 우리는 자동 번호를 쓰지 않지만(번호는 글자로 박는다) **목록을 비우지 않는다.**
    // 빈 목록이 허용되는지 확인할 한글이 없어서, 표본이 가진 것을 그대로 둔다
    NUMBERINGS +
    `<hh:paraProperties itemCnt="2">${paraPr(PARA_KEEP, spacing, 0, true)}${paraPr(
      PARA_END,
      spacing,
      gapNext,
      false,
    )}</hh:paraProperties>` +
    '<hh:styles itemCnt="1">' +
    // 기본 스타일은 «끊어도 되는» 쪽이다 — 홀로 선 문단이 다음 것을 끌고 가면 안 된다
    `<hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="${PARA_END}"` +
    ` charPrIDRef="${CHAR_BODY}" nextStyleIDRef="0" langID="1042" lockForm="0"/>` +
    '</hh:styles>' +
    '</hh:refList>' +
    '<hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>' +
    '<hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption>' +
    '<hh:trackchageConfig flags="0"/>' +
    '</hh:head>'
  )
}
