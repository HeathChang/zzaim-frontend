/** 브라우저별 인쇄 설정 안내 (zz-6 D5 · D11).
 *
 *  **설정 이름이 브라우저마다 다르다.** «여백 없음»을 크롬은 «여백 → 없음»,
 *  엣지는 «여백 → 없음»으로 부르지만 위치가 다르다. 틀린 이름을 알려 주면
 *  교사가 그 항목을 못 찾고 «안내가 틀렸네»가 된다.
 *
 *  대상은 **Chrome·Edge 2종**뿐이다 (OD-01). 그 밖의 브라우저에는 크롬 안내를 준다. */

export type PrintBrowser = 'chrome' | 'edge'

export function detectPrintBrowser(userAgent: string): PrintBrowser {
  return /\bEdg\//.test(userAgent) ? 'edge' : 'chrome'
}

/** 인쇄 대화상자 스크린샷 자산. **코드가 아니라 캡처 작업이다** (D11).
 *  아직 없으면 이미지 없이 문구만 보여 준다 — 없는 이미지를 깨진 채로 두지 않는다. */
export function hintImage(browser: PrintBrowser): string {
  return `/print-hints/${browser}.png`
}
