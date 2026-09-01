/** 문항 카드 — S-02·S-04 좌측이 쓰고, v1 에 S-03 이 더해진다 (SS부록A).
 *  **밀도만 다르다**: 상 56 / 중 88 / 하 자동 (SS부록D).
 *
 *  ⚠ 신뢰도 배지는 여기 없다 — S-02 전용이라 zz-4 가 소유한다 (zz-0 구현계획).
 *  zz-4 는 이 카드를 **래퍼로 감싼다. 사본을 만들지 않는다.** */
export type CardDensity = 'high' | 'medium' | 'low'

const HEIGHT: Record<CardDensity, number | undefined> = {
  high: 56,
  medium: 88,
  low: undefined, // 자동
}

/** 목록의 성격에 따라 맞는 역할이 다르다.
 *  `option` — 다중 선택 목록(`listbox`) 안. `aria-selected` 가 유효하다
 *  `listitem` — 단순 목록(`list`) 안. 선택 개념이 없다
 *  **필수 prop 인 이유**: 기본값을 주면 소비자가 잊고, 목록이 통째로 안 읽힌다. */
export type CardRole = 'option' | 'listitem'

export interface QuestionCardProps {
  /** 부모 목록의 역할에 맞춰 준다. 부모는 `listbox` 또는 `list` 여야 한다 */
  role: CardRole
  /** 표시용 번호 뱃지. 배치 순서에서 파생된 값이거나 원본 번호다 */
  badge?: string
  points?: number | null
  tags?: string[]
  /** 본문 미리보기. 이미 평문으로 만들어 넘긴다 — 카드가 HTML 을 해석하지 않는다 */
  preview: string
  density?: CardDensity
  selected?: boolean
  /** 이미 시험지에 담긴 문항은 흐리게 + `✓ 담김` (SS§6.3 A.3) */
  used?: boolean
  usedLabel?: string
  onClick?: () => void
  onDoubleClick?: () => void
  /** 카드 안에 얹을 것 — 신뢰도 배지 같은 화면 전용 요소 */
  children?: React.ReactNode
}

export function QuestionCard({
  role,
  badge,
  points,
  tags,
  preview,
  density = 'medium',
  selected = false,
  used = false,
  usedLabel,
  onClick,
  onDoubleClick,
  children,
}: QuestionCardProps) {
  const height = HEIGHT[density]
  return (
    <div
      role={role}
      // `aria-selected` 는 `option` 에서만 유효하다. `listitem` 에 붙이면
      // 스크린리더가 무시하거나 경고한다.
      aria-selected={role === 'option' ? selected : undefined}
      data-selected={selected || undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        height,
        overflow: 'hidden',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${selected ? 'var(--color-accent-700)' : 'var(--color-divider)'}`,
        background: 'var(--color-neutral-100)',
        opacity: used ? 0.55 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'center',
          color: 'var(--color-neutral-700)',
          fontSize: 13,
        }}
      >
        {badge && <span>{badge}</span>}
        {points != null && <span>[{points}점]</span>}
        {tags?.map((t) => (
          <span key={t}>{t}</span>
        ))}
        {used && usedLabel && <span>✓ {usedLabel}</span>}
        {children}
      </div>
      <div style={{ marginTop: 'var(--space-1)' }}>{preview}</div>
    </div>
  )
}
