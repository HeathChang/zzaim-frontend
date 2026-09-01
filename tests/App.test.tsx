/** 부팅 경로 — 등급 판정과 그에 따른 화면. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { App } from '@/App'
import { useUiStore } from '@/app/store/ui'
import { strings } from '@/app/strings'

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15'

function setup(ua: string, opts: { fonts?: boolean; fsa?: boolean } = {}) {
  const { fonts = true, fsa = true } = opts
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  vi.stubGlobal('ResizeObserver', class {})
  if (fsa) (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn()
  else delete (window as unknown as Record<string, unknown>).showDirectoryPicker
  if (fonts) {
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve(), check: () => true },
      configurable: true,
    })
  } else {
    // `'fonts' in document` 가 거짓이어야 차단이 성립한다
    Reflect.deleteProperty(document, 'fonts')
  }
}

describe('부팅', () => {
  beforeEach(() => {
    useUiStore.setState({ tier: 'full', helpOpen: false })
    vi.unstubAllGlobals()
  })

  it('조판이 불가능한 브라우저는 진입을 막는다 (SS§13.4)', async () => {
    setup(CHROME, { fonts: false })
    await act(async () => {
      render(<App />)
    })
    expect(screen.getByText(strings.tier.blockedTitle)).toBeTruthy()
  })

  it('비대상 브라우저는 막지 않고 1회만 알린다 (OD-01)', async () => {
    setup(SAFARI)
    await act(async () => {
      render(<App />)
    })
    expect(screen.getByText(strings.tier.unsupportedTitle)).toBeTruthy()
    // 막지 않는다 — 앱 본문이 함께 있어야 한다
    expect(screen.getByText(strings.app.tagline)).toBeTruthy()
  })

  it('크롬은 안내 없이 바로 앱으로 간다', async () => {
    setup(CHROME)
    await act(async () => {
      render(<App />)
    })
    expect(screen.queryByText(strings.tier.unsupportedTitle)).toBeNull()
    expect(screen.getByText(strings.app.tagline)).toBeTruthy()
  })
})
