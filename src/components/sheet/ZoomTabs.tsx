/** 배율 탭 — 100% / 폭 맞춤 / 두 쪽 (HO§배율 · SS§6.3).
 *
 *  **기본이 100%(실제 배율)인 이유**: 이 도구가 파는 것은 «인쇄하면 화면 그대로»
 *  라는 신뢰다. 축소된 미리보기는 그 신뢰를 검증할 수 없다.
 *
 *  자동으로 폭 맞춤으로 떨어질 때 **조용히 하지 않는다.** 축소된 지면을 실제
 *  크기라고 믿게 하는 것이 이 화면이 저지를 수 있는 가장 나쁜 실수다. */
import { ZOOM, type ZoomKey } from '@/layout/constants'

export interface ZoomTabsProps {
  value: ZoomKey
  onChange(next: ZoomKey): void
  /** 자동으로 떨어진 상태인가 */
  auto: boolean
  labels: Record<ZoomKey, string> & { autoBadge: string }
}

export function ZoomTabs({ value, onChange, auto, labels }: ZoomTabsProps) {
  return (
    <div role="group" style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
      {(Object.keys(ZOOM) as ZoomKey[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          style={{
            padding: '2px var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-divider)',
            background: value === key ? 'var(--color-accent-100)' : 'transparent',
          }}
        >
          {labels[key]}
        </button>
      ))}
      {auto && (
        <span style={{ color: 'var(--color-accent-700)', fontSize: 12 }}>{labels.autoBadge}</span>
      )}
    </div>
  )
}

/** 자동 폭맞춤 임계 — **창 폭이 아니라 «가용 지면 폭 < 시트 폭»** 이다.
 *
 *  SS§6.3 의 계산(1280 − 좌패널 320 = 960 > A4 794)대로 1280px 에서는 들어가고,
 *  그 아래에서는 좌패널이 접혀 오히려 넓어진다. 그래서 창 폭으로 판정하면 틀린다.
 *  지면 스크롤 영역의 좌우 패딩은 0이므로(HO§도구UI크기 `26 0 60`) 패딩 항은 없다.
 *  **INFERRED — 원천에 공식이 없다 (UD-41).** */
export function shouldAutoFit(availableWidthPx: number, sheetWidthPx: number): boolean {
  return availableWidthPx < sheetWidthPx
}
