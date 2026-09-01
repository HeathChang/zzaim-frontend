/** zz-0 D8 — 등급 판정. OD-01 이후 **축은 권한 하나**다. */
import { describe, expect, it } from 'vitest'
import {
  decideTier,
  isTargetBrowser,
  needsPersistentSaveWarning,
  readEnvironment,
} from '@/app/browserTier'

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const EDGE = `${CHROME} Edg/129.0.0.0`
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15'
const FIREFOX = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0'
const BRAVE = `${CHROME} Brave/129`
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.0.0 Mobile/15E148 Safari/604.1'

const ok = { hasFontsApi: true, hasResizeObserver: true, hasFileSystemAccess: true }

describe('대상 브라우저 판별 (OD-01)', () => {
  it('크롬과 엣지가 대상이다', () => {
    expect(isTargetBrowser(CHROME)).toBe(true)
    expect(isTargetBrowser(EDGE)).toBe(true)
  })

  it('사파리·파이어폭스는 비대상이다 — 막지 않되 보장하지 않는다', () => {
    expect(isTargetBrowser(SAFARI)).toBe(false)
    expect(isTargetBrowser(FIREFOX)).toBe(false)
  })

  it('★ Chrome 을 사칭하는 파생은 비대상이다 — UA 에 Chrome 이 들어 있어도', () => {
    expect(isTargetBrowser(BRAVE)).toBe(false)
  })

  it('★ iOS 의 크롬은 WebKit 이라 조판이 다르다 — 비대상', () => {
    expect(isTargetBrowser(CHROME_IOS)).toBe(false)
  })

  it('★ 헤드리스 크롬은 대상이다 — 빼면 E2E 가 «비대상» 안내에 덮인다', () => {
    expect(isTargetBrowser(`${CHROME.replace('Chrome/', 'HeadlessChrome/')}`)).toBe(true)
  })

  it('되쓰기가 안 되면 저장 상태를 상시 강조한다', () => {
    expect(needsPersistentSaveWarning('full')).toBe(false)
    expect(needsPersistentSaveWarning('limited')).toBe(true)
    expect(needsPersistentSaveWarning('unsupported')).toBe(true)
  })
})

describe('등급 — 축은 권한 하나다 (OD-01)', () => {
  it('★ 조판이 성립하지 않으면 가장 먼저 차단한다', () => {
    expect(
      decideTier({ ...ok, userAgent: CHROME, hasFontsApi: false, permission: 'granted' }),
    ).toBe('blocked')
    expect(
      decideTier({ ...ok, userAgent: CHROME, hasResizeObserver: false, permission: 'granted' }),
    ).toBe('blocked')
  })

  it('대상 브라우저 + 권한 허용이면 «완전»', () => {
    expect(decideTier({ ...ok, userAgent: CHROME, permission: 'granted' })).toBe('full')
    expect(decideTier({ ...ok, userAgent: EDGE, permission: 'granted' })).toBe('full')
  })

  it('★ 권한을 거부하거나 모르면 «제한» — 크롬이어도 그렇다', () => {
    expect(decideTier({ ...ok, userAgent: CHROME, permission: 'denied' })).toBe('limited')
    expect(decideTier({ ...ok, userAgent: CHROME, permission: 'unknown' })).toBe('limited')
  })

  it('비대상 브라우저거나 파일 접근이 없으면 «비대상»', () => {
    expect(decideTier({ ...ok, userAgent: SAFARI, permission: 'granted' })).toBe('unsupported')
    expect(
      decideTier({ ...ok, userAgent: CHROME, hasFileSystemAccess: false, permission: 'granted' }),
    ).toBe('unsupported')
  })
})

describe('환경 수집 — «있다»가 아니라 «쓸 수 있다»를 본다', () => {
  it('fonts 속성이 있어도 값이 undefined 면 없는 것으로 본다', () => {
    const win = {
      navigator: { userAgent: CHROME },
      document: { fonts: undefined },
      ResizeObserver: class {},
      showDirectoryPicker: () => Promise.resolve(),
    } as unknown as Window
    expect(readEnvironment(win).hasFontsApi).toBe(false)
  })

  it('정상 환경은 전부 참', () => {
    const win = {
      navigator: { userAgent: CHROME },
      document: { fonts: { check: () => true } },
      ResizeObserver: class {},
      showDirectoryPicker: () => Promise.resolve(),
    } as unknown as Window
    const env = readEnvironment(win)
    expect(env).toMatchObject({
      hasFontsApi: true,
      hasResizeObserver: true,
      hasFileSystemAccess: true,
    })
  })
})
