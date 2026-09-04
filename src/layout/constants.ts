/** 조판 상수 — 출처는 HO§지면조판 하나다. **값을 지어내지 않는다.**
 *
 *  이 파일의 숫자가 틀리면 «인쇄하면 화면 그대로»가 통째로 무너진다. */

/** 1mm 를 px 로. 모든 mm 값은 이 상수로 px 로 바꾼다 (HO§지면조판 · PT:703) */
export const MM = 3.7795275591

export const PAGE_SIZE_MM = {
  A4: { w: 210, h: 297 },
  /** JIS B4 — 국내 시험지가 쓰는 규격 */
  B4: { w: 257, h: 364 },
} as const

/** 머리말 높이. **첫 쪽에서만** 단 높이에서 뺀다 (HO§파생값 · PT:1213·1255).
 *  ⚠ 머리말이 비어도 차감한다 — 그게 맞는지는 종이로 봐야 안다 (UD-43) */
export const HEADER_H_MM = 20

/** 컬럼 용량 안전 마진.
 *  화면 측정값과 인쇄 실제 높이가 폰트 힌팅 차이로 미세하게 어긋난다.
 *  딱 맞춘 컬럼은 인쇄에서 한 줄이 넘친다 (PP§6.3).
 *
 *  ⚠ **2mm 라는 값 자체에는 실측 근거가 없다** — 핸드오프·프로토타입에는 아예
 *  없는 항이다. 종이 실측(G0)으로 확정한다 → UD-12. 그래서 상수로 고정하지
 *  않고 `LayoutConfig.safetyMarginMm` 로 **바꿔 끼울 수 있게** 노출한다. */
export const DEFAULT_SAFETY_MARGIN_MM = 2

/** 아이템 사이 간격 (px). 측정 높이에 더해 배치에 쓴다 (HO§지면본문서식 · PT:1246) */
export const GAP_BASE_PX = 4.4

/** 본문 기준 글자 크기 (px). `fs = 13.6 * fontScale / 100` (HO§지면본문서식) */
export const FONT_BASE_PX = 13.6

/** 측정 임계 — 이전 값과 이만큼 미만으로 다르면 무시한다.
 *  없으면 서브픽셀 진동으로 **측정 → 렌더 → 측정** 루프가 끝나지 않는다 (PT:846) */
export const MEASURE_EPSILON_PX = 0.6

/** 같은 아이템이 이만큼 연속으로 흔들리면 마지막 값으로 고정한다.
 *  0.6px 임계만으로는 양쪽 정렬·스크롤바 등장처럼 **0.6px 이상 진동**하는
 *  경우를 못 막는다 (zz-2 D2) */
export const MEASURE_MAX_PASSES = 3

/** 배율 (HO§배율 · PT:1336) */
export const ZOOM = {
  '100': 1,
  fit: 0.72,
  spread: 0.46,
} as const
export type ZoomKey = keyof typeof ZOOM

/** 조절 범위 — **반드시 건다.** 안 걸면 단 폭이 0 이하가 되어 조판이 무너진다
 *  (HO§기본레이아웃상태) */
export const RANGE = {
  marginBlock: { min: 5, max: 45 }, // 위·아래
  marginInline: { min: 5, max: 60 }, // 안쪽·바깥쪽
  gutter: { min: 4, max: 20 },
  fontScale: { min: 85, max: 115, step: 5 },
} as const

/** 파생값의 하한 — 여백을 최대로 넣어도 지면이 성립해야 한다 */
export const MIN_COL_W_MM = 20
export const MIN_COL_H_MM = 40

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
