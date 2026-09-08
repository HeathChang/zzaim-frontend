/** 교정 통계 — **서버 없는 제품의 유일한 자동 계측** (zz-4 D7 · PP§13.1·13.3).
 *
 *  이 제품은 데이터를 서버로 보내지 않는다. 그래서 «휴리스틱을 고쳤을 때
 *  좋아졌는가»를 사람 없이 잴 수 있는 장치가 **이것뿐이다.**
 *
 *  화면에 상시 표시한다 — «다섯 군데만 고쳤네»는 사용자에게도 의미 있는 정보라
 *  표시할 명분이 있다. 그리고 **서버로 보내지 않는다**: `.etp` 안에만 쌓인다. */
import type { ImportStats } from '@/storage/etp/format'

/** 무조작이 이보다 길면 소요 시간에서 뺀다 — 자리를 비운 시간은 교정 시간이 아니다 */
export const IDLE_CUTOFF_MS = 30_000

export interface StatsState {
  /** 경계를 고친 횟수. `M`·`S`·`P`·`D`·경계 드래그 */
  corrections: number
  /** 번호·배점 수정 — **경계 교정과 성격이 다르므로 따로 센다** */
  fieldEdits: number
  /** 누적 작업 시간(ms). 무조작 구간은 빠져 있다 */
  activeMs: number
  /** 마지막 조작 시각 */
  lastActivityAt: number
}

export function createStats(now: number): StatsState {
  return { corrections: 0, fieldEdits: 0, activeMs: 0, lastActivityAt: now }
}

/** 조작이 일어났다. **30초 이상 손을 놓은 구간은 시간에서 뺀다.** */
export function tick(state: StatsState, now: number): StatsState {
  const gap = now - state.lastActivityAt
  return {
    ...state,
    activeMs: state.activeMs + (gap > IDLE_CUTOFF_MS ? 0 : gap),
    lastActivityAt: now,
  }
}

export type CountedOp =
  /** 경계를 고쳤다 */
  | 'correction'
  /** 번호·배점을 고쳤다 */
  | 'field'
  /** ⚠ 확인함 토글 — **경계를 고친 게 아니므로 세지 않는다** (zz-4 D5) */
  | 'confirm'

export function record(state: StatsState, op: CountedOp, now: number): StatsState {
  const ticked = tick(state, now)
  switch (op) {
    case 'correction':
      return { ...ticked, corrections: ticked.corrections + 1 }
    case 'field':
      return { ...ticked, fieldEdits: ticked.fieldEdits + 1 }
    case 'confirm':
      return ticked
  }
}

/** 되돌리면 **차감한다** — 안 그러면 «고쳤다 되돌렸다»가 정확도를 깎는다 */
export function undoRecord(state: StatsState, op: CountedOp, now: number): StatsState {
  const ticked = tick(state, now)
  switch (op) {
    case 'correction':
      return { ...ticked, corrections: Math.max(0, ticked.corrections - 1) }
    case 'field':
      return { ...ticked, fieldEdits: Math.max(0, ticked.fieldEdits - 1) }
    case 'confirm':
      return ticked
  }
}


/** `.etp` 의 `manifest.stats` 에 담을 모양으로 만든다 */
export function toManifestStats(state: StatsState, questionCount: number): ImportStats {
  return {
    corrections: state.corrections,
    fieldEdits: state.fieldEdits,
    seconds: Math.round(state.activeMs / 1000),
    questionCount,
  }
}
