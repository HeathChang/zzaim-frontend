/** 파생 기하 — 순수 함수. 출처는 HO§파생값.
 *
 *  `max()` 하한은 장식이 아니다. 여백 범위를 안 걸면 단 폭이 0 이하가 되어
 *  조판이 무너진다 (HO§기본레이아웃상태). */
import {
  clamp,
  DEFAULT_SAFETY_MARGIN_MM,
  GAP_BASE_PX,
  FONT_BASE_PX,
  HEADER_H_MM,
  MIN_COL_H_MM,
  MIN_COL_W_MM,
  MM,
  RANGE,
} from '@/layout/constants'
import { effectivePage } from '@/layout/pageSize'
import type { LayoutConfig } from '@/layout/types'

export interface Geometry {
  pageWmm: number
  pageHmm: number
  colWmm: number
  colHmm: number
  colWpx: number
  colHpx: number
  /** 본문 글자 크기(px) */
  fontPx: number
  /** 아이템 사이 간격(px) */
  gapPx: number
}

/** 입력값을 조절 범위 안으로 넣는다. **여기서 걸러야 조판이 무너지지 않는다.** */
export function clampConfig(config: LayoutConfig): LayoutConfig {
  const { marginBlock, marginInline, gutter, fontScale } = RANGE
  return {
    ...config,
    gutter: clamp(config.gutter, gutter.min, gutter.max),
    fontScale: clamp(config.fontScale, fontScale.min, fontScale.max),
    margin: {
      top: clamp(config.margin.top, marginBlock.min, marginBlock.max),
      bottom: clamp(config.margin.bottom, marginBlock.min, marginBlock.max),
      inner: clamp(config.margin.inner, marginInline.min, marginInline.max),
      outer: clamp(config.margin.outer, marginInline.min, marginInline.max),
    },
  }
}

export function deriveGeometry(rawConfig: LayoutConfig): Geometry {
  const config = clampConfig(rawConfig)
  // ⚠ 방향을 여기서 반영한다. 가드와 조판이 **같은 치수**를 봐야 한다 (zz-8 D1)
  const { w: pageWmm, h: pageHmm } = effectivePage(config.pageSize, config.orientation)
  const { inner, outer, top, bottom } = config.margin

  const usable = pageWmm - inner - outer - (config.columns - 1) * config.gutter
  const colWmm = Math.max(MIN_COL_W_MM, usable / config.columns)
  const colHmm = Math.max(MIN_COL_H_MM, pageHmm - top - bottom)

  return {
    pageWmm,
    pageHmm,
    colWmm,
    colHmm,
    colWpx: colWmm * MM,
    colHpx: colHmm * MM,
    fontPx: (FONT_BASE_PX * config.fontScale) / 100,
    gapPx: (GAP_BASE_PX * config.fontScale) / 100,
  }
}

/** 한 단이 담을 수 있는 높이(px).
 *
 *  첫 쪽은 머리말만큼 작다. 그리고 **안전 마진을 뺀다** — 화면 측정값과 인쇄
 *  실제 높이가 폰트 힌팅 차이로 어긋나기 때문이다 (PP§6.3 · UD-12). */
export function columnCapacity(
  geometry: Geometry,
  isFirstPage: boolean,
  safetyMarginMm: number = DEFAULT_SAFETY_MARGIN_MM,
): number {
  const header = isFirstPage ? HEADER_H_MM * MM : 0
  const safety = safetyMarginMm * MM
  // 여백을 극단으로 준 경우 음수가 될 수 있다. 0 밑으로는 내려가지 않게 한다 —
  // 음수 용량은 «모든 아이템이 overflow» 라는 뜻이라 화면이 답을 못 준다.
  return Math.max(0, geometry.colHpx - header - safety)
}
