/** 측정 캐시 키.
 *
 *  기획서(PP§6.3)는 `hash(body) + columnWidthMm + fontScale` 이라고 했다.
 *  거기에 **`box` 를 더한다** — 지문 박스를 테두리↔음영으로 바꾸면 padding·border
 *  가 달라져 **높이가 바뀐다.** 프로토타입의 서명(PT:834-840)은 `L.box` 를
 *  포함하므로, 기획서대로만 하면 프로토타입보다 후퇴한다 (zz-2 D2).
 *
 *  그리고 프로토타입에는 **본문 해시가 없다.** `data-mk` 키 목록만 본다 —
 *  그래서 문항 본문을 고쳐도 서명이 그대로라 **재측정이 아예 돌지 않는다.**
 *  여기서는 반드시 본문을 키에 넣는다. */

/** 문자열 해시. 암호용이 아니라 **캐시 키용**이다 — 짧고 빠르면 된다.
 *  FNV-1a 32비트. 충돌하면 «안 바뀐 것으로 보고 재측정을 건너뛰는» 오류가
 *  나므로, 본문 길이를 함께 붙여 우연한 충돌을 줄인다. */
export function hashString(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${(h >>> 0).toString(36)}.${text.length.toString(36)}`
}

/** 아이템 종류마다 «무엇이 높이를 바꾸는가»가 다르다 (zz-2 D2) */
export type RenderInput =
  | { kind: 'question'; html: string; points: number | null; numberWidthEm: number }
  | { kind: 'group'; passageHtml: string; instruction: string; childrenHtml: string[] }
  | { kind: 'spacer'; heightMm: number; ruled: boolean }
  | { kind: 'divider' }
  | { kind: 'notice'; html: string }

export function renderInputHash(input: RenderInput): string {
  switch (input.kind) {
    case 'question':
      // 배점과 번호 폭도 높이에 영향을 준다 (줄바꿈이 달라진다)
      return `q:${hashString(input.html)}:${input.points ?? '-'}:${input.numberWidthEm}`
    case 'group':
      return `g:${hashString(input.passageHtml)}:${hashString(input.instruction)}:${hashString(
        input.childrenHtml.join(' '),
      )}`
    case 'spacer':
      return `s:${input.heightMm}:${input.ruled ? 1 : 0}`
    case 'divider':
      return 'd'
    case 'notice':
      return `n:${hashString(input.html)}`
  }
}

export interface MeasureContext {
  columnWidthMm: number
  fontScale: number
  box: 'border' | 'shade'
}

export function measureKey(input: RenderInput, ctx: MeasureContext): string {
  // 폭은 소수점이 길게 붙는다. 0.01mm 아래는 측정에 의미가 없으므로 자른다 —
  // 안 자르면 부동소수 잡음으로 캐시가 매번 빗나간다.
  const w = ctx.columnWidthMm.toFixed(2)
  return `${renderInputHash(input)}|${w}|${ctx.fontScale}|${ctx.box}`
}
