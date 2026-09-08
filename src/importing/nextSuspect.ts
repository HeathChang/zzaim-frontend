/** `N` — **이 화면의 핵심 키다** (zz-4 D1 · SS§4.4).
 *
 *  24개를 다 훑지 않고 의심스러운 3곳만 보게 하는 장치다.
 *  «문항당 6초»는 «전부 검토»가 아니라 «의심스러운 곳만 검토»를 전제한 숫자이고,
 *  **이 키가 없으면 그 숫자가 나오지 않는다.**
 *
 *  ⚠ 신뢰도 낮은 **순**이 아니라 **현재 위치 이후 가장 가까운** 곳으로 간다.
 *  낮은 순으로 뛰면 목록 위아래를 오가게 되고, 사용자가 «어디까지 봤는지»를 잃는다. */
import { isSuspect } from '@/importing/confidence'
import type { Segment } from '@/importing/types'

export interface SuspectState {
  /** 사용자가 «봤고 문제없다»고 표시한 카드 (zz-4 D5) */
  confirmed: ReadonlySet<number>
}

/** 이 카드를 아직 봐야 하는가.
 *  **확인함 카드는 신뢰도가 낮아도 빠진다** — 그래야 «확인이 필요한 곳»이 0에 닿는다 */
export function needsAttention(
  segments: readonly Segment[],
  index: number,
  state: SuspectState,
): boolean {
  const s = segments[index]
  if (!s) return false
  if (state.confirmed.has(index)) return false
  return isSuspect(s)
}

export function suspectCount(segments: readonly Segment[], state: SuspectState): number {
  return segments.reduce((n, _, i) => (needsAttention(segments, i, state) ? n + 1 : n), 0)
}

export interface NextResult {
  index: number
  /** 끝에 닿아 처음으로 돌아왔다 — 사용자에게 알린다 (SS§4.4) */
  wrapped: boolean
  /** 남은 의심 지점이 없다 */
  none: boolean
}

/** 현재 위치 **이후** 가장 가까운 의심 지점. 끝에 닿으면 처음으로 순환한다. */
export function nextSuspect(
  segments: readonly Segment[],
  from: number,
  state: SuspectState,
): NextResult {
  const n = segments.length
  if (n === 0) return { index: from, wrapped: false, none: true }

  for (let step = 1; step <= n; step += 1) {
    const index = (from + step) % n
    if (!needsAttention(segments, index, state)) continue
    // 뒤로 돌아왔으면 «처음으로 돌아왔습니다»를 알린다
    return { index, wrapped: index <= from, none: false }
  }
  // 자기 자신만 남았을 수도 있다
  if (needsAttention(segments, from, state)) {
    return { index: from, wrapped: false, none: false }
  }
  return { index: from, wrapped: false, none: true }
}

/** 진입 시 커서 위치 — **1번 카드가 아니라 첫 의심 지점**이다 (zz-4 불변3).
 *  훑기가 아니라 교정이 이 화면의 일이다. */
export function initialCursor(segments: readonly Segment[]): number {
  const first = segments.findIndex((s) => isSuspect(s))
  return first === -1 ? 0 : first
}
