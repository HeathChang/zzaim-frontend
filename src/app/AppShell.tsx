/** 앱 셸 — SS§1.1 골격.
 *  헤더 40 + 좌측 패널 + 상태바 32. 세 화면(S-02·S-04·v1 의 S-03)이 이걸 공유한다.
 *
 *  «좌측은 재료, 우측은 결과». 최소 지원 폭 1280px 아래에서는
 *  **좌측 패널을 접는다 — 지면을 줄이지 않는다** (SS§6.3). */
import { useEffect } from 'react'
import { Header } from '@/app/Header'
import { useUiStore } from '@/app/store/ui'
import { strings } from '@/app/strings'

const NARROW_PX = 1280

export function useNarrowWatcher() {
  const setNarrow = useUiStore((s) => s.setNarrow)
  useEffect(() => {
    // 아주 오래된 브라우저에는 matchMedia 가 없다. 없으면 «넓은 폭»으로 두고 넘어간다 —
    // 여기서 던지면 앱이 통째로 안 뜬다.
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(`(max-width: ${NARROW_PX - 1}px)`)
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [setNarrow])
}

export interface AppShellProps {
  left?: React.ReactNode
  main: React.ReactNode
  statusBar?: React.ReactNode
  /** 넓은 좌측 패널이 필요한 화면(S-02 원본)은 480 을 쓴다 */
  leftWidth?: 'default' | 'wide'
  /** 접기 버튼의 접근성 이름. 좌측 패널이 있으면 반드시 준다 */
  panelLabel?: string
}

export function AppShell({ left, main, statusBar, leftWidth = 'default', panelLabel }: AppShellProps) {
  const narrow = useUiStore((s) => s.narrow)
  const collapsed = useUiStore((s) => s.leftPanelCollapsed)
  const setCollapsed = useUiStore((s) => s.setLeftPanelCollapsed)
  const showLeft = left != null && !collapsed
  const width =
    leftWidth === 'wide'
      ? 'var(--size-panel-wide)'
      : narrow
        ? 'var(--size-panel-narrow)'
        : 'var(--size-panel)'

  return (
    // 인쇄에서는 화면 높이 제한을 푼다 (zz-6 D3)
    <div data-print="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      {/* 좌우 분할도 인쇄에서는 푼다 — 남겨 두면 지면이 쪽 밖으로 밀려
          빈 쪽이 딸려 나온다 (zz-6 D3) */}
      <div data-print="app" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {showLeft && (
          <aside
            data-print="hide"
            style={{
              width,
              flex: `0 0 ${width}`,
              borderRight: '1px solid var(--color-divider)',
              overflow: 'auto',
            }}
          >
            {left}
          </aside>
        )}
        {left != null && (
          // 좁은 폭에서 자동으로 접히므로 **다시 펼 방법이 반드시 있어야 한다** (SS§1.1)
          <button
            type="button"
            // 화면 도구다. 인쇄에 남으면 지면을 22.5px 밀어 **빈 쪽이 딸려 나온다**
            data-print="hide"
            aria-expanded={!collapsed}
            // ⚠ 패널 **내용**과 같은 이름을 쓰면 스크린리더가 둘을 구분하지 못하고,
            // 선택자도 겹친다. 동작을 이름에 넣는다
            aria-label={panelLabel ? strings.shell.togglePanel(panelLabel, !collapsed) : undefined}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 18,
              flex: '0 0 18px',
              border: 0,
              borderRight: '1px solid var(--color-divider)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
            }}
          >
            {collapsed ? '›' : '‹'}
          </button>
        )}
        <main data-print="scroll" style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {main}
        </main>
      </div>
      {statusBar}
    </div>
  )
}
