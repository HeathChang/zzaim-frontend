/** 상태바 — **이것 하나뿐이다.** 화면마다 새로 만들지 않는다 (SS부록A).
 *
 *  zz-4·zz-5 는 슬롯을 채우기만 한다. 읽히는 순서는 언제나
 *  **숫자 → 경고 → 다음 동작** 이다 (SS§1.1).
 *
 *  좁은 폭에서는 보조 수치를 뺀다 (zz-0 D9 · HO§반응형). */
import { statusDensityFor, useUiStore } from '@/app/store/ui'

export interface StatusBarSlots {
  /** 언제나 보인다 */
  counts?: React.ReactNode
  /** 보조 수치 — `lean` 밀도에서 빠진다 */
  secondary?: React.ReactNode
  warnings?: React.ReactNode
  /** 우측 주 동작 */
  action?: React.ReactNode
}

export function StatusBar({ counts, secondary, warnings, action }: StatusBarSlots) {
  const narrow = useUiStore((s) => s.narrow)
  const density = statusDensityFor(narrow)

  return (
    <footer
      data-print="hide"
      style={{
        height: 'var(--size-statusbar)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '0 var(--space-4)',
        borderTop: '1px solid var(--color-divider)',
        background: 'var(--color-surface)',
      }}
    >
      {counts}
      {density === 'full' && secondary}
      {warnings}
      <span style={{ marginLeft: 'auto' }}>{action}</span>
    </footer>
  )
}
