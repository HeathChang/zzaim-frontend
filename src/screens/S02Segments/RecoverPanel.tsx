/** 분리 붕괴 복구 — **한 번의 선택이 50번의 교정을 대신한다** (zz-4 D6 · SS§4.8).
 *
 *  판정: 60% 미만이 전체의 절반 이상. 그때 카드를 하나씩 고치게 두는 것은 학대다. */
import { useState } from 'react'
import { strings } from '@/app/strings'
import type { NumberFormat } from '@/importing/ops'
import type { Segment } from '@/importing/types'

/** 자동 분리가 무너졌는가 */
export function isCollapsed(segments: readonly Segment[]): boolean {
  if (segments.length === 0) return false
  const low = segments.filter((s) => s.confidence < 0.6).length
  return low / segments.length >= 0.5
}

const FORMATS: { value: NumberFormat; label: string }[] = [
  { value: 'dot', label: strings.segments.formatDot },
  { value: 'paren', label: strings.segments.formatParen },
  { value: 'circled', label: strings.segments.formatCircled },
  { value: 'word', label: strings.segments.formatWord },
  { value: 'custom', label: strings.segments.formatCustom },
]

export function RecoverPanel({
  onRetry,
  onManual,
}: {
  onRetry(format: NumberFormat, custom?: string): void
  onManual(): void
}) {
  const [format, setFormat] = useState<NumberFormat>('dot')
  const [custom, setCustom] = useState('')

  return (
    <section
      role="alert"
      style={{
        border: '1px solid var(--color-accent-700)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-3)',
      }}
    >
      <h3 style={{ fontSize: 15 }}>{strings.segments.recoverTitle}</h3>
      <p>{strings.segments.recoverBody}</p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {FORMATS.map((f) => (
          <label key={f.value}>
            <input
              type="radio"
              name="number-format"
              checked={format === f.value}
              onChange={() => setFormat(f.value)}
            />
            {f.label}
          </label>
        ))}
        {format === 'custom' && (
          <input
            aria-label={strings.segments.formatCustom}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <button type="button" onClick={onManual}>
          {strings.segments.recoverManual}
        </button>
        <button type="button" onClick={() => onRetry(format, custom || undefined)}>
          {strings.segments.recoverRetry}
        </button>
      </div>
    </section>
  )
}
