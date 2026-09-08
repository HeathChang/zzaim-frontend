/** 쪼개기 모드 — **문단 경계로만** 자른다 (zz-4 D4 · SS§4.6).
 *
 *  문장 중간 분할은 지원하지 않는다: 시험지에서 필요하지 않고 UI 복잡도만 올린다.
 *  `↑↓` 지점 이동 · `Space` 복수 선택 · `Enter` 확정 · `Esc` 취소. */
import { useEffect, useRef, useState } from 'react'
import { strings } from '@/app/strings'

export interface SplitModeProps {
  lines: readonly string[]
  onConfirm(lineIndexes: number[]): void
  onCancel(): void
}

export function SplitMode({ lines, onConfirm, onCancel }: SplitModeProps) {
  // 자를 수 있는 지점은 줄 **사이**다 — 1 .. lines.length-1
  const points = lines.length - 1
  const [at, setAt] = useState(1)
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => ref.current?.focus(), [])

  if (points < 1) return null

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAt((v) => Math.min(points, v + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAt((v) => Math.max(1, v - 1))
    } else if (e.key === ' ') {
      // 쪼개기 모드 안에서는 `Space` 가 복수 지점 선택이다.
      // 모드가 달라 «확인함»과 충돌하지 않는다 (zz-4 D5)
      e.preventDefault()
      setPicked((prev) => {
        const next = new Set(prev)
        if (next.has(at)) next.delete(at)
        else next.add(at)
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm(picked.size > 0 ? [...picked] : [at])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={strings.segments.splitTitle}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      style={{
        border: '1px solid var(--color-divider)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        background: 'var(--color-neutral-100)',
      }}
    >
      <h3 style={{ fontSize: 15 }}>{strings.segments.splitTitle}</h3>
      {lines.map((line, i) => (
        <div key={`${i}-${line.slice(0, 8)}`}>
          {i > 0 && (
            <div
              data-cut={i}
              data-active={i === at || undefined}
              style={{
                borderTop: picked.has(i) || i === at ? '2px solid var(--color-accent-700)' : '1px dashed var(--color-divider)',
                color: 'var(--color-accent-700)',
                fontSize: 12,
              }}
            >
              {(picked.has(i) || i === at) && strings.segments.splitHere}
            </div>
          )}
          <div>{line}</div>
        </div>
      ))}
    </div>
  )
}
