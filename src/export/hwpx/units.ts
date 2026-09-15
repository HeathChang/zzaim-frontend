/** HWPX 단위 변환.
 *
 *  **HWPUNIT = 1/7200 인치**다. 한글이 만든 실제 파일에서 확인했다 —
 *  A4 210mm 가 `width="59528"` 로 적혀 있고 `210/25.4*7200 = 59527.6` 이다.
 *  (근거: 한컴 공개 OWPML + `hwpxlib`(Apache-2.0)에 든 한글 산출 표본)
 *
 *  ⚠ 우리 화면은 **CSS px(96dpi)** 로 조판한다. 두 단위를 섞으면 조용히 어긋나므로
 *  변환은 이 파일 밖에서 하지 않는다. */

/** 1인치 = 7200 HWPUNIT */
export const HWPUNIT_PER_INCH = 7200
/** 1인치 = 25.4mm */
export const MM_PER_INCH = 25.4
export function mmToHwp(mm: number): number {
  return Math.round((mm / MM_PER_INCH) * HWPUNIT_PER_INCH)
}


/** 글자 크기는 **1/100 pt** 단위다 (`height="1000"` = 10pt).
 *  HWPUNIT 이 아니다 — 한 문서 안에 단위가 둘이라 헷갈리기 쉽다. */
export function pxToFontHeight(px: number): number {
  // CSS 96px = 72pt 이므로 pt = px * 0.75
  return Math.round(px * 0.75 * 100)
}

/** 행간은 «글자 크기의 %» 로 준다. 우리 조판은 «본문 대비 간격(px)» 을 쓰므로
 *  둘을 잇는다. 한글 기본값은 130% 다. */
export function lineSpacingPercent(fontPx: number, lineHeightPx: number): number {
  if (fontPx <= 0) return 130
  return Math.max(50, Math.min(500, Math.round((lineHeightPx / fontPx) * 100)))
}

/** ★ 용지 크기는 **계산하지 않고 한글이 쓰는 값을 그대로 쓴다.**
 *
 *  A4 297mm 를 계산하면 84188.98 → 반올림 84189 인데, **한글은 84188 을 적는다.**
 *  용지 규격은 그때그때 계산하는 값이 아니라 **미리 정해진 쌍**이기 때문이다.
 *  1 HWPUNIT 은 0.0035mm 라 물리적으로는 무의미하지만, 값이 다르면 한글이
 *  «사용자 정의» 용지로 볼 수 있고 그러면 인쇄 대화상자에서 A4 가 안 잡힌다.
 *
 *  ⚠ **B4 는 표본이 없어 계산값이다** — 실측 미검증(UD-21). */
export const PAGE_HWPUNIT = {
  /** 한글 산출물에서 그대로 확인 */
  A4: { width: 59528, height: 84188 },
  /** 257 x 364mm 계산값. 한글 표본을 구하면 교체할 것 */
  B4: { width: 72850, height: 103181 },
} as const
