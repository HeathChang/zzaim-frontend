/** SS§1.1 골격 — 헤더 40 + 좌패널 + 상태바 32.
 *  «1280 미만에서 좌패널이 접힌다»가 zz-0 의 검증 항목이다. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppShell, useNarrowWatcher } from '@/app/AppShell'
import { StatusBar } from '@/app/StatusBar'
import { useUiStore } from '@/app/store/ui'

/** jsdom 에는 matchMedia 가 없다. 폭을 흉내내고 change 를 쏠 수 있게 만든다. */
function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.delete(fn),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  )
  return {
    resize(next: boolean) {
      mql.matches = next
      act(() => listeners.forEach((fn) => fn({ matches: next } as MediaQueryListEvent)))
    },
  }
}

function Harness() {
  useNarrowWatcher()
  return <AppShell left={<div>tray</div>} main={<div>paper</div>} panelLabel="panel" />
}

describe('앱 셸', () => {
  beforeEach(() => {
    useUiStore.setState({ narrow: false, leftPanelCollapsed: false })
  })

  it('넓은 폭에서는 좌측 패널이 보인다', () => {
    mockMatchMedia(false)
    render(<Harness />)
    expect(screen.getByText('tray')).toBeTruthy()
  })

  it('1280 미만이 되면 좌측 패널이 접힌다 — 지면은 줄이지 않는다', () => {
    const mq = mockMatchMedia(false)
    render(<Harness />)
    mq.resize(true)
    expect(screen.queryByText('tray')).toBeNull()
    expect(screen.getByText('paper')).toBeTruthy()
  })

  it('접힌 패널을 다시 펼 수 있다 — 자동으로 접혔는데 방법이 없으면 갇힌다', () => {
    const mq = mockMatchMedia(false)
    render(<Harness />)
    mq.resize(true)
    fireEvent.click(screen.getByLabelText(/panel/))
    expect(screen.getByText('tray')).toBeTruthy()
  })

  it('토글 버튼이 펼침 상태를 알린다', () => {
    mockMatchMedia(false)
    render(<Harness />)
    expect(screen.getByLabelText(/panel/).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('상태바 밀도 (zz-0 D9)', () => {
  beforeEach(() => useUiStore.setState({ narrow: false }))

  it('넓으면 보조 수치를 보여준다', () => {
    render(<StatusBar counts={<span>24</span>} secondary={<span>보조</span>} />)
    expect(screen.getByText('보조')).toBeTruthy()
  })

  it('좁으면 보조 수치를 뺀다 — 주 수치는 남는다', () => {
    useUiStore.setState({ narrow: true })
    render(<StatusBar counts={<span>24</span>} secondary={<span>보조</span>} />)
    expect(screen.queryByText('보조')).toBeNull()
    expect(screen.getByText('24')).toBeTruthy()
  })
})

describe('matchMedia 가 없는 환경', () => {
  it('던지지 않는다 — 던지면 앱이 통째로 안 뜬다', () => {
    vi.stubGlobal('matchMedia', undefined)
    useUiStore.setState({ narrow: false, leftPanelCollapsed: false })
    expect(() => render(<Harness />)).not.toThrow()
  })
})
