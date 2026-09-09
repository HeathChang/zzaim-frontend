/** 조판 피드백 — **엔진의 판단을 사용자가 볼 수 있어야 한다** (zz-5 D3 · SS§6.5).
 *
 *  보이지 않으면 «왜 여기서 넘어갔지?»가 **불신으로 바뀐다.** 이 제품이 파는 것이
 *  «인쇄하면 화면 그대로»라는 신뢰이므로, 엔진이 내린 판단을 숨기면 안 된다.
 *
 *  ⚠ 표시는 **카드 안**에 붙인다(`warningStyle=card`, zz-5 D10).
 *  지면 밖 여백에 붙이면 «지면이 인쇄물과 같아야 한다»는 불변을 깨고,
 *  축소 배율에서 읽히지 않는다. */
import { strings } from '@/app/strings'

export type FeedbackKind =
  /** 다음 단·쪽으로 넘어갔다 — 참고 표시 */
  | 'carried'
  /** 한 단에 아예 안 들어간다 — ⚠ 경고 */
  | 'overflow'
  /** 다음과 같은 단에 묶였다 */
  | 'keepWith'
  /** 다른 문항을 언급한다 — 재배치 시 위험 */
  | 'crossRef'
  /** 지문이 시험지에 없다 — **답 없는 문항이 인쇄된다** */
  | 'missingPassage'
  /** 요청한 분할 정책대로 못 했다 (zz-2 D4) */
  | 'downgraded'

export interface FeedbackProps {
  kind: FeedbackKind
  /** 사용자가 바로 고칠 수 있는 것은 동작을 준다 */
  onAction?: () => void
}

const NEEDS_ACTION: FeedbackKind[] = ['overflow', 'missingPassage']

export function Feedback({ kind, onAction }: FeedbackProps) {
  const isWarning = kind !== 'carried' && kind !== 'keepWith'
  return (
    <span
      data-feedback={kind}
      style={{
        color: isWarning ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
        fontSize: 12,
      }}
    >
      {isWarning && '⚠ '}
      {strings.paperFeedback[kind]}
      {NEEDS_ACTION.includes(kind) && onAction && (
        <button type="button" onClick={onAction} style={{ marginLeft: 'var(--space-1)' }}>
          {strings.paperFeedback.action[kind as 'overflow' | 'missingPassage']}
        </button>
      )}
    </span>
  )
}

/** 마지막 쪽 여백 과다 — **정보 제공만 한다. 강제하지 않는다** (SS§6.5).
 *  «이 쪽의 3분의 2가 비어 있습니다» */
export const PAGE_FILL_WARN_RATIO = 1 / 3

export function shouldWarnPageFill(usedPx: number, capacityPx: number): boolean {
  if (capacityPx <= 0) return false
  return usedPx / capacityPx < PAGE_FILL_WARN_RATIO
}

export function PageFill({ ratio }: { ratio: number }) {
  return (
    <p style={{ color: 'var(--color-neutral-700)', fontSize: 12 }}>
      {strings.paperFeedback.pageFill(Math.round((1 - ratio) * 100))}
    </p>
  )
}
