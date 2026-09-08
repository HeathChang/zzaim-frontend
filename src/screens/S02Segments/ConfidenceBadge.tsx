/** 신뢰도 배지 — **S-02 전용이라 이 영역이 소유한다** (zz-4 D2).
 *
 *  «숫자만 보여 주면 사용자가 판단할 근거가 없다» (SS§4.5).
 *  그래서 **점수와 근거를 함께** 낸다.
 *
 *  그리고 **색으로만 구분하지 않는다** — `⚠` 아이콘과 숫자를 함께 쓴다 (SS§1.6). */
import { strings } from '@/app/strings'
import type { ReasonCode } from '@/importing/confidence'

/** 3구간 (SS§4.5) */
export type ConfidenceTier = 'high' | 'medium' | 'low'

export function tierOf(confidence: number): ConfidenceTier {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

const COLOR: Record<ConfidenceTier, string> = {
  high: 'var(--color-neutral-700)',
  medium: 'var(--color-accent-700)',
  low: 'var(--color-accent-900)',
}

export function ConfidenceBadge({
  confidence,
  reasons,
}: {
  confidence: number
  reasons: readonly ReasonCode[]
}) {
  const tier = tierOf(confidence)
  const percent = Math.round(confidence * 100)

  return (
    <span
      data-tier={tier}
      style={{ color: COLOR[tier], fontSize: tier === 'high' ? 12 : 13 }}
      // 색이 안 보여도 뜻이 전해져야 한다
      aria-label={strings.segments.confidenceLabel(percent)}
    >
      {tier !== 'high' && '⚠ '}
      {percent}%
      {reasons.length > 0 && (
        <span style={{ display: 'block', fontWeight: 400 }}>
          {reasons.map((r) => (
            <span key={r} style={{ display: 'block' }}>
              ⚠ {strings.confidence[r]}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
