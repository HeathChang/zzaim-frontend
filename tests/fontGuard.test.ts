/** zz-0 D7 — `@font-face` 가 404 여도 브라우저는 조용히 대체 폰트로 떨어진다.
 *  그 «조용함»이 이 제품에서는 조판 붕괴다. 시끄럽게 만든다. */
import { describe, expect, it, vi } from 'vitest'
import { checkCriticalFonts, HANGUL_PROBE, warnIfMissing } from '@/app/fontGuard'

function fakeDoc(available: boolean): Document {
  return {
    fonts: {
      ready: Promise.resolve(),
      load: () => Promise.resolve([]),
      check: () => available,
    },
  } as unknown as Document
}

describe('지면 폰트 가드', () => {
  it('폰트가 있으면 ready', async () => {
    const r = await checkCriticalFonts(fakeDoc(true))
    expect(r.ready).toBe(true)
    expect(r.missing).toEqual([])
  })

  it('폰트가 없으면 어느 것이 없는지 알려준다', async () => {
    const r = await checkCriticalFonts(fakeDoc(false))
    expect(r.ready).toBe(false)
    expect(r.missing).toContain('Noto Serif KR')
  })

  it('한글 글자로 확인한다 — 라틴만 물으면 한글 빠진 서브셋이 통과한다', async () => {
    const check = vi.fn().mockReturnValue(true)
    const doc = {
      fonts: { ready: Promise.resolve(), load: () => Promise.resolve([]), check },
    } as unknown as Document
    await checkCriticalFonts(doc)
    expect(check).toHaveBeenCalledWith(expect.stringContaining('Noto Serif KR'), HANGUL_PROBE)
    expect(HANGUL_PROBE).toBe('가')
  })

  it('개발 빌드에서만 운다', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    warnIfMissing({ ready: false, missing: ['Noto Serif KR'] }, false)
    expect(spy).not.toHaveBeenCalled()
    warnIfMissing({ ready: false, missing: ['Noto Serif KR'] }, true)
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})

describe('로드를 먼저 시킨다 — 안 그러면 교착이다', () => {
  it('check 전에 load 를 부른다', async () => {
    const load = vi.fn().mockResolvedValue([])
    const doc = {
      fonts: { ready: Promise.resolve(), load, check: () => true },
    } as unknown as Document
    await checkCriticalFonts(doc)
    expect(load).toHaveBeenCalledWith(expect.stringContaining('Noto Serif KR'), HANGUL_PROBE)
  })

  it('로드가 실패해도 검사까지는 간다 — 던지면 차단 화면조차 못 그린다', async () => {
    const doc = {
      fonts: {
        ready: Promise.resolve(),
        load: () => Promise.reject(new Error('404')),
        check: () => false,
      },
    } as unknown as Document
    const r = await checkCriticalFonts(doc)
    expect(r.ready).toBe(false)
  })
})

describe('document.fonts 가 없는 브라우저', () => {
  it('던지지 않는다 — 던지면 차단 화면조차 못 그린다', async () => {
    const doc = {} as Document
    const r = await checkCriticalFonts(doc)
    expect(r.ready).toBe(false)
    expect(r.missing).toContain('Noto Serif KR')
  })
})
