/** zz-0 D7 폴백 — 서브셋 밖 글자를 만나면 전체본을 받는다.
 *  폴백이 없으면 서브셋은 «가끔 조판이 깨지는» 최적화가 된다. */
import { describe, expect, it, vi } from 'vitest'
import { checkCoverage, createFullFontGate, visibleTextOf } from '@/app/fontCoverage'

const table = { codepoints: new Set(['가', '나', '다', '한', '국'].map((c) => c.codePointAt(0)!)) }

describe('서브셋 커버리지', () => {
  it('전부 서브셋 안이면 covered', () => {
    expect(checkCoverage('가나다', table).covered).toBe(true)
  })

  it('ASCII 는 언제나 있는 것으로 본다 — 아니면 모든 문서가 전체본을 받는다', () => {
    expect(checkCoverage('abc 123 ()[]', table).covered).toBe(true)
  })

  it('서브셋 밖 글자를 집어낸다', () => {
    const r = checkCoverage('가나다 龘', table)
    expect(r.covered).toBe(false)
    expect(r.missing).toContain('龘')
  })

  it('서로게이트 쌍(확장 한자)을 한 글자로 센다', () => {
    const rare = '\u{20000}' // CJK 확장 B
    const r = checkCoverage(rare, table)
    expect(r.missingCount).toBe(1)
    expect(r.missing).toEqual([rare])
  })

  it('같은 글자가 여러 번 나와도 샘플은 중복 없이, 개수는 전부 센다', () => {
    const r = checkCoverage('龘龘龘', table)
    expect(r.missingCount).toBe(3)
    expect(r.missing).toEqual(['龘'])
  })
})

describe('HTML 에서 보이는 글자만', () => {
  it('태그와 속성은 세지 않는다', () => {
    const text = visibleTextOf('<p class="龘">가나</p>')
    expect(text).toBe('가나')
  })
})

describe('전체본 로드 게이트', () => {
  it('동시에 여러 번 불러도 한 번만 받는다', async () => {
    const load = vi.fn().mockResolvedValue(undefined)
    const gate = createFullFontGate(load)
    await Promise.all([gate.ensure(), gate.ensure(), gate.ensure()])
    expect(load).toHaveBeenCalledOnce()
    expect(gate.loaded).toBe(true)
  })

  it('실패하면 다음 시도를 허용한다 — 한 번 실패로 영영 못 받으면 안 된다', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue(undefined)
    const gate = createFullFontGate(load)
    await expect(gate.ensure()).rejects.toThrow()
    await gate.ensure()
    expect(load).toHaveBeenCalledTimes(2)
    expect(gate.loaded).toBe(true)
  })
})
