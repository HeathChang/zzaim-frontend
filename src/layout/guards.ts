/** 조절 범위 가드 — **2층이다** (zz-8 D2).
 *
 *  | 층 | 임계 | 동작 |
 *  | --- | --- | --- |
 *  | UI 가드 | 단 폭 **40mm** 미만 | 애초에 **고를 수 없게** 한다 |
 *  | 엔진 클램프 | `max(20, …)` | 조용히 20mm 로 고정 |
 *
 *  두 값이 다른 것은 모순이 아니라 **층이 다른 것**이다. UI 가 40mm 에서 막으므로
 *  정상 경로에서 엔진 하한 20mm 에 닿을 일이 없다. 닿았다면 **UI 가드가 새고 있다.**
 *
 *  ★ **되돌리거나 경고만 띄우지 않는다.** 정적 범위를 그대로 쓰면
 *  A4 2단 최대 여백에서 `colW = (210−60−60−20)/2 = 35mm` 로 가드 아래로 떨어진다.
 *  그래서 슬라이더의 **최대치 자체를** 현재 다른 값들에 맞춰 매번 계산한다 —
 *  «잘못된 값을 고르고 혼나는» 것보다 «고를 수 없는» 편이 낫다. */
import { RANGE, MIN_COL_W_MM } from '@/layout/constants'
import { effectivePage } from '@/layout/pageSize'
import type { Orientation, PageSize } from '@/domain/types'

/** UI 가 지키는 하한. 엔진 하한(20mm)보다 **넉넉하다** */
export const UI_MIN_COL_W_MM = 40

export interface GuardInput {
  pageSize: PageSize
  orientation: Orientation
  columns: number
  gutter: number
  margin: { top: number; bottom: number; inner: number; outer: number }
}

export type GuardField = 'top' | 'bottom' | 'inner' | 'outer' | 'gutter'

export interface Range {
  min: number
  max: number
  step: number
}

export function columnWidthMm(v: GuardInput): number {
  const { w } = effectivePage(v.pageSize, v.orientation)
  return (w - v.margin.inner - v.margin.outer - (v.columns - 1) * v.gutter) / v.columns
}

/** 이 값을 얼마까지 올려도 단 폭이 40mm 아래로 안 떨어지나.
 *  `colW = (W − inner − outer − (n−1)·gutter) / n ≥ 40` 을 해당 항목에 대해 푼다. */
function maxKeepingColumn(field: 'inner' | 'outer' | 'gutter', v: GuardInput): number {
  const { w } = effectivePage(v.pageSize, v.orientation)
  const budget = w - UI_MIN_COL_W_MM * v.columns
  if (field === 'gutter') {
    if (v.columns <= 1) return RANGE.gutter.max
    return Math.floor((budget - v.margin.inner - v.margin.outer) / (v.columns - 1))
  }
  const other = field === 'inner' ? v.margin.outer : v.margin.inner
  return Math.floor(budget - other - (v.columns - 1) * v.gutter)
}

/** 지금 이 항목이 고를 수 있는 범위. **상한이 값에 따라 움직인다** */
export function rangeFor(field: GuardField, v: GuardInput): Range {
  if (field === 'top' || field === 'bottom') {
    return { ...RANGE.marginBlock, step: 1 }
  }
  const stat = field === 'gutter' ? RANGE.gutter : RANGE.marginInline
  const dynamic = maxKeepingColumn(field, v)
  return {
    min: stat.min,
    // 동적 상한이 정적 하한보다 낮아지면 **더 못 올린다**는 뜻이다
    max: Math.max(stat.min, Math.min(stat.max, dynamic)),
    step: 1,
  }
}


/** 엔진 하한에 닿았는가 — 닿았다면 **UI 가드가 샌 것**이다 (D2).
 *  개발 빌드에서만 알린다. 사용자에게는 보일 이유가 없는 내부 모순이다. */
export function warnIfEngineClamped(v: GuardInput, dev: boolean): boolean {
  const leaked = columnWidthMm(v) <= MIN_COL_W_MM
  if (leaked && dev) {
    // 개발자용 경고는 영어로 둔다 — 사용자 문구가 아니다(기존 관례)
    console.warn(
      `[zzaim] column width hit the engine floor (${MIN_COL_W_MM}mm) — the UI guard is leaking`,
      v,
    )
  }
  return leaked
}
