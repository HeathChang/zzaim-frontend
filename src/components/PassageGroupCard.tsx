/** 지문 묶음 카드 — 지문과 종속 문항을 **접힌 하나의 카드**로 (SS§5.3 S-03.4).
 *
 *  이게 이 제품의 규칙 하나를 눈에 보이게 만든다: 종속 문항을 따로 담으면
 *  지문 없는 문항이 인쇄된다. 그래서 **기본 단위가 묶음**이다 (PP§6.2). */
import { useId } from 'react'
import { strings } from '@/app/strings'

export interface PassageGroupCardProps {
  /** «[1~3]» 같은 범위 표기 */
  rangeLabel: string
  passagePreview: string
  childCount: number
  expanded: boolean
  onToggle(): void
  childrenNodes?: React.ReactNode
}

export function PassageGroupCard({
  rangeLabel,
  passagePreview,
  childCount,
  expanded,
  onToggle,
  childrenNodes,
}: PassageGroupCardProps) {
  const bodyId = useId()
  return (
    <div
      style={{
        border: '1px solid var(--color-divider)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-neutral-100)',
        padding: 'var(--space-2) var(--space-3)',
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={onToggle}
        style={{ display: 'block', width: '100%', textAlign: 'left' }}
      >
        <span style={{ color: 'var(--color-neutral-700)', fontSize: 13 }}>
          {strings.common.passage} {rangeLabel}
        </span>
        <span style={{ display: 'block' }}>{passagePreview}</span>
        <span style={{ color: 'var(--color-neutral-700)', fontSize: 13 }}>
          └ {strings.card.childCount(childCount)}
        </span>
      </button>
      {expanded && <div id={bodyId}>{childrenNodes}</div>}
    </div>
  )
}
