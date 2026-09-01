/** zz-0 D7 폴백의 실행부 — **3단계는 실측이 정했다.**
 *  한자를 기본에 넣으면 첫 진입이 336KB -> 1,235KB 로 4배가 된다. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPaperFontController,
  loadCoverageTable,
  resetCoverageCache,
  tierFor,
  type PaperCoverage,
} from '@/app/fontFallback'

const cp = (s: string) => [...s].map((c) => c.codePointAt(0)!)

const table: PaperCoverage = {
  codepoints: new Set(cp('가나다 ')),
  hanja: new Set(cp('學校')),
}

function fakeDoc() {
  const load = vi.fn().mockResolvedValue([])
  return { doc: { fonts: { load } } as unknown as Document, load }
}

describe('어느 단계까지 받아야 하는가', () => {
  it('빠진 글자가 없으면 기본', () => {
    expect(tierFor([], table)).toBe('base')
  })

  it('빠진 글자가 전부 한자본 안이면 한자본까지', () => {
    expect(tierFor(['學', '校'], table)).toBe('hanja')
  })

  it('하나라도 벗어나면 전체본까지 — 조용히 한자본에서 멈추면 그 글자가 깨진다', () => {
    expect(tierFor(['學', '\u{20000}'], table)).toBe('full')
  })
})

describe('지면 폰트 컨트롤러', () => {
  beforeEach(resetCoverageCache)

  it('한글만이면 아무것도 더 받지 않는다', async () => {
    const { doc, load } = fakeDoc()
    const c = createPaperFontController(table, doc)
    expect(await c.ensureFor('가나다')).toBe(false)
    expect(load).not.toHaveBeenCalled()
    expect(c.tier()).toBe('base')
  })

  it('한자가 나오면 한자본을 받고 스택을 바꾼다', async () => {
    const { doc, load } = fakeDoc()
    const c = createPaperFontController(table, doc)
    expect(await c.ensureFor('가나다 學校')).toBe(true)
    expect(load).toHaveBeenCalled()
    expect(c.tier()).toBe('hanja')
    expect(c.stack()).toContain('Hanja')
  })

  it('한자본에도 없는 글자면 전체본까지 간다', async () => {
    const { doc } = fakeDoc()
    const c = createPaperFontController(table, doc)
    await c.ensureFor('龘')
    expect(c.tier()).toBe('full')
    expect(c.stack()).toContain('Full')
  })

  it('전체본을 받은 뒤에는 한자를 만나도 되돌아가지 않는다', async () => {
    const { doc } = fakeDoc()
    const c = createPaperFontController(table, doc)
    await c.ensureFor('龘')
    expect(await c.ensureFor('學')).toBe(false)
    expect(c.tier()).toBe('full')
  })

  it('전체본이 필요할 때 한자본을 따로 받지 않는다 — 전체본이 이미 포함한다', async () => {
    const { doc, load } = fakeDoc()
    const c = createPaperFontController(table, doc)
    await c.ensureFor('龘')
    // 400·600 두 벌만 받는다 (한자본까지 받았다면 4번이었을 것)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('같은 단계를 두 번 요구해도 한 번만 받는다', async () => {
    const { doc, load } = fakeDoc()
    const c = createPaperFontController(table, doc)
    await Promise.all([c.ensureFor('學'), c.ensureFor('校')])
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('커버리지 표 로드', () => {
  beforeEach(resetCoverageCache)

  it('빌드 산출물에서 읽는다 — 코드에 목록을 박지 않는다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ codepoints: [0xac00], hanja: [0x5b78] }),
    })
    const t = await loadCoverageTable(fetchImpl as unknown as typeof fetch)
    expect(t.codepoints.has(0xac00)).toBe(true)
    expect(t.hanja.has(0x5b78)).toBe(true)
  })

  it('두 번째 호출은 다시 받지 않는다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ codepoints: [], hanja: [] }) })
    await loadCoverageTable(fetchImpl as unknown as typeof fetch)
    await loadCoverageTable(fetchImpl as unknown as typeof fetch)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('실패하면 던진다 — 조용히 빈 표로 넘어가면 폴백이 영영 안 돈다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(loadCoverageTable(fetchImpl as unknown as typeof fetch)).rejects.toThrow()
  })

  it('hanja 항이 없는 옛 산출물도 읽는다 — 그때는 한자본을 못 쓸 뿐이다', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ codepoints: [1] }) })
    const t = await loadCoverageTable(fetchImpl as unknown as typeof fetch)
    expect(t.hanja.size).toBe(0)
  })
})
