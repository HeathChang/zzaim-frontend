/** 인쇄 코어 — `@page` 규칙 주입.
 *
 *  **zz-2 가 소유한다** (zz-2 D9). 원래 zz-6(5~9주) 것이었는데, G0 게이트가
 *  4주차에 «종이 실측 ±1mm»를 요구한다. 종이에 뽑으려면 `@page` 가 있어야 하므로
 *  제품을 죽일 수 있는 게이트를 일정 안에 통과할 수 없었다. 규칙 정의는 zz-6 이,
 *  파일 소유는 여기가 한다.
 *
 *  **불변: `margin` 은 언제나 0이다.**
 *  여백은 지면 요소가 직접 그린다(PP§6.4). 이유가 둘이다.
 *  1. 브라우저 인쇄 대화상자의 여백 설정과 충돌하지 않는다
 *  2. 양면 미러링을 `@page :left/:right` 로 하면 **어느 쪽을 :left 로 볼지가
 *     인쇄 설정에 따라 달라진다.** 조판 엔진은 이미 쪽 번호를 알고 있으므로
 *     CSS 선택자에 의존할 이유가 없다 (PP§6.5②) */
import { effectivePage } from '@/layout/pageSize'
import type { Orientation, PageSize } from '@/domain/types'

const STYLE_ID = 'zzaim-page-rule'

export function pageRuleCss(pageSize: PageSize, orientation: Orientation = 'portrait'): string {
  // ⚠ 방향도 반영한다. 안 하면 가로 시험지가 세로 용지에 인쇄된다
  const { w, h } = effectivePage(pageSize, orientation)
  return `@page { size: ${w}mm ${h}mm; margin: 0; }`
}

/** 용지 크기는 런타임에 바뀌므로 `@page` 는 **주입**한다.
 *  정적 CSS 에 두면 A4/B4 전환을 표현할 수 없다.
 *
 *  ⚠ **문서에 `@page` 는 하나만 있어야 한다.** 둘이면 나중 것이 이기는데,
 *  프로토타입의 `support.js` 에는 `@page { margin: 0.5cm }` 가 있다 —
 *  그게 딸려오면 **인쇄 여백이 5mm 밀린다.** `scripts/check-page-rules.mjs` 가
 *  빌드 산출물에서 이걸 막는다 (zz-6 D2). */
export function applyPageRule(
  pageSize: PageSize,
  orientation: Orientation = 'portrait',
  doc: Document = document,
): void {
  let style = doc.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = STYLE_ID
    doc.head.appendChild(style)
  }
  const css = pageRuleCss(pageSize, orientation)
  // 같은 내용이면 건드리지 않는다 — 스타일 교체는 전체 리페인트를 유발한다
  if (style.textContent !== css) style.textContent = css
}


/** 인쇄 시 화면 전용 요소를 숨기고 지면만 남기는 훅 (zz-6 D3).
 *
 *  **인라인 배율(`transform: scale`)을 이겨야 하므로 `!important` 를 쓴다** —
 *  인쇄에서 `transform` 이 남으면 축소된 지면이 그대로 종이에 나간다. */
export const PRINT_ATTR = 'data-print'
export type PrintRole = 'sheet' | 'hide'
