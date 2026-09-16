/** 배점 일괄 (zz-8 D4 · PD-04).
 *
 *  ★ **«난이도별» 은 난이도가 없는 문항이 하나라도 있으면 못 쓴다.**
 *  균등으로 조용히 돌아가면 교사가 의도하지 않은 배분이 나오는데,
 *  그걸 알아챌 방법이 없다. 그래서 **버튼을 잠그고 사유를 보여 준다.** */
import { useState } from 'react'
import { strings } from '@/app/strings'
import {
  applyBulk,
  missingDifficulty,
  type BulkQuestion,
  type BulkRule,
} from '@/domain/pointsBulk'

export interface PointsBulkProps {
  questions: readonly BulkQuestion[]
  target: number
  disabled?: boolean
  onApply(points: Record<string, number>): void
}

const RULES: { rule: BulkRule; label: string }[] = [
  { rule: 'even', label: strings.settings.ruleEven },
  { rule: 'byDifficulty', label: strings.settings.ruleByDifficulty },
  { rule: 'toTarget', label: strings.settings.ruleToTarget },
]

export function PointsBulk({ questions, target, disabled = false, onApply }: PointsBulkProps) {
  const [done, setDone] = useState<number | null>(null)
  const missing = missingDifficulty(questions)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h3 style={{ fontSize: 14 }}>{strings.settings.groupPoints}</h3>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {RULES.map(({ rule, label }) => {
          const blocked =
            disabled ||
            questions.length === 0 ||
            (rule === 'byDifficulty' && missing.length > 0)
          return (
            <button
              key={rule}
              type="button"
              aria-disabled={blocked}
              {...(rule === 'byDifficulty' && missing.length > 0
                ? { 'aria-describedby': 'bulk-missing' }
                : {})}
              onClick={() => {
                if (blocked) return
                const result = applyBulk(rule, questions, target)
                onApply(result.points)
                setDone(result.total)
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* 왜 못 쓰는지 **숫자로** 말한다 (SS§1.7) */}
      {missing.length > 0 && (
        <p id="bulk-missing" style={{ color: 'var(--color-accent-700)' }}>
          {strings.settings.needDifficulty(missing.length)}
        </p>
      )}

      <p role="status">{done === null ? '' : strings.settings.bulkDone(done)}</p>
    </section>
  )
}
