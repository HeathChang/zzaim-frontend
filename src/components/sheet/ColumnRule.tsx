/** 단 사이 세로선. 값(`layout.rule`)은 zz-8 이, 렌더는 여기가 소유한다. */
import { MM } from '@/layout/constants'

export function ColumnLayout({
  columns,
  gutterMm,
  rule,
  children,
}: {
  columns: number
  gutterMm: number
  rule: boolean
  children: React.ReactNode[]
}) {
  return (
    // 남은 높이를 채운다 — `height: 100%` 로 두면 머리말이 있는 첫 쪽에서 넘친다
    <div style={{ display: 'flex', gap: gutterMm * MM, flex: '1 1 auto', minHeight: 0 }}>
      {children.map((col, i) => (
        <div key={i} data-column={i} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {col}
          {rule && i < columns - 1 && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: (-gutterMm * MM) / 2,
                borderLeft: '1px solid var(--color-divider)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
