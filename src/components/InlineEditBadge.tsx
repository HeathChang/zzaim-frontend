/** 인라인 편집 뱃지 — S-02 의 번호·배점, S-04 의 배점이 쓴다 (SS부록A).
 *  «그 자리에서 고친다» — 별도 화면으로 보내지 않는 것이 6초 목표의 전제다. */
import { useEffect, useRef, useState } from 'react'

export interface InlineEditBadgeProps {
  value: number | null
  /** 값이 없을 때 보여줄 것. 예: `[?]` */
  emptyLabel: string
  format(v: number): string
  ariaLabel: string
  onChange(next: number | null): void
  min?: number
  max?: number
}

export function InlineEditBadge({
  value,
  emptyLabel,
  format,
  ariaLabel,
  onChange,
  min = 0,
  max = 999,
}: InlineEditBadgeProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed === '') {
      onChange(null)
    } else {
      const n = Number(trimmed)
      // 숫자가 아니거나 범위 밖이면 **버리고 원래 값을 지킨다** — 조용히 0 이 되면 안 된다
      if (Number.isFinite(n) && n >= min && n <= max) onChange(n)
    }
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          setDraft(value == null ? '' : String(value))
          setEditing(true)
        }}
      >
        {value == null ? emptyLabel : format(value)}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={draft}
      size={4}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation() // 다이얼로그·패널까지 닫히면 안 된다
          setEditing(false)
        }
      }}
    />
  )
}
