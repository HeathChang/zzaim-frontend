/** 배치 — **DOM 없이** 측정값 픽스처만으로 잰다. 순수성의 증명이다.
 *
 *  이 테스트가 zz-2 의 근거다. 종이 실측(G0)은 사람이 하지만, «규칙대로
 *  배치했는가»는 여기서 매 커밋 확인된다. */
import { describe, expect, it } from 'vitest'
import { layoutPages, type Heights } from '@/layout/layoutPages'
import { columnCapacity, deriveGeometry } from '@/layout/geometry'
import type { LayoutConfig, LayoutItem } from '@/layout/types'

const config: LayoutConfig = {
  pageSize: 'A4',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  fontScale: 100,
  startNumber: 1,
  box: 'border',
  safetyMarginMm: 0, // 배치 규칙만 보기 위해 마진을 뺀다
}

const geo = deriveGeometry(config)
const CAP_FIRST = columnCapacity(geo, true, 0)
const CAP_REST = columnCapacity(geo, false, 0)
const GAP = geo.gapPx

function q(key: string, extra: Partial<LayoutItem> = {}): LayoutItem {
  return { key, kind: 'question', numbered: true, ...extra }
}

function heights(entries: [string, number][]): Heights {
  return new Map(entries)
}

/** 전부 배치된 아이템을 순서대로 편다 */
function flat(result: ReturnType<typeof layoutPages>) {
  return result.pages.flatMap((p) => p.columns.flatMap((c) => c.items))
}

describe('기본 배치', () => {
  it('한 단에 들어가면 같은 단에 쌓인다', () => {
    const items = [q('a'), q('b')]
    const r = layoutPages(items, heights([['a', 100], ['b', 100]]), config)
    expect(r.pages).toHaveLength(1)
    expect(r.pages[0]?.columns[0]?.items.map((i) => i.key)).toEqual(['a', 'b'])
    expect(r.pages[0]?.columns[1]?.items).toEqual([])
  })

  it('간격을 높이에 더해 배치한다 — 안 더하면 마지막 한 줄이 넘친다', () => {
    const r = layoutPages([q('a')], heights([['a', 100]]), config)
    expect(r.pages[0]?.columns[0]?.items[0]?.height).toBeCloseTo(100 + GAP, 6)
  })

  it('남은 자리에 안 들어가면 다음 단으로 넘어가고 carried 로 표시된다', () => {
    const big = CAP_FIRST - GAP - 1
    const r = layoutPages([q('a'), q('b')], heights([['a', big], ['b', big]]), config)
    expect(r.pages[0]?.columns[0]?.items.map((i) => i.key)).toEqual(['a'])
    expect(r.pages[0]?.columns[1]?.items.map((i) => i.key)).toEqual(['b'])
    expect(r.pages[0]?.columns[1]?.items[0]?.carried).toBe(true)
  })

  it('단을 다 쓰면 새 쪽으로 간다', () => {
    const big = CAP_FIRST - GAP - 1
    const r = layoutPages(
      [q('a'), q('b'), q('c')],
      heights([['a', big], ['b', big], ['c', 50]]),
      config,
    )
    expect(r.pages).toHaveLength(2)
    expect(r.pages[1]?.columns[0]?.items.map((i) => i.key)).toEqual(['c'])
  })

  it('첫 쪽은 머리말만큼 용량이 작다', () => {
    const r = layoutPages([q('a')], heights([['a', 10]]), config)
    expect(r.pages[0]?.capacity).toBeCloseTo(CAP_FIRST, 6)
    const two = layoutPages(
      [q('a'), q('b'), q('c')],
      heights([
        ['a', CAP_FIRST - GAP - 1],
        ['b', CAP_FIRST - GAP - 1],
        ['c', 10],
      ]),
      config,
    )
    expect(two.pages[1]?.capacity).toBeCloseTo(CAP_REST, 6)
  })

  it('측정값이 없는 아이템은 높이 0 으로 다룬다 — 배치가 멈추지 않는다', () => {
    const r = layoutPages([q('a')], heights([]), config)
    expect(r.pages[0]?.columns[0]?.items[0]?.height).toBeCloseTo(GAP, 6)
  })
})

describe('단을 넘는 문항 — 분할하지 않고 경고한다 (UD-13)', () => {
  it('빈 단에 넣고 overflow 로 표시한다', () => {
    const r = layoutPages([q('a')], heights([['a', CAP_FIRST * 2]]), config)
    expect(r.pages[0]?.columns[0]?.items[0]?.overflow).toBe(true)
    expect(r.overflowKeys).toEqual(['a'])
  })

  it('넘친 아이템 뒤는 반드시 단을 바꾼다 — 이어 붙이면 시트 밖으로 나간다', () => {
    const r = layoutPages(
      [q('a'), q('b')],
      heights([['a', CAP_FIRST * 2], ['b', 50]]),
      config,
    )
    expect(r.pages[0]?.columns[0]?.items.map((i) => i.key)).toEqual(['a'])
    expect(r.pages[0]?.columns[1]?.items.map((i) => i.key)).toEqual(['b'])
  })

  it('이미 쓴 단이 있으면 다음 단으로 옮겨 넣고 carried 도 표시한다', () => {
    const r = layoutPages(
      [q('a'), q('b')],
      heights([['a', 50], ['b', CAP_FIRST * 2]]),
      config,
    )
    const b = flat(r).find((i) => i.key === 'b')
    expect(b?.overflow).toBe(true)
    expect(b?.carried).toBe(true)
  })

  it('무한 이월에 빠지지 않는다 — 전부 단보다 큰 아이템 20개', () => {
    const items = Array.from({ length: 20 }, (_, i) => q(`k${i}`))
    const hs = heights(items.map((i) => [i.key, CAP_REST * 2] as [string, number]))
    const r = layoutPages(items, hs, config)
    expect(flat(r)).toHaveLength(20)
    expect(r.overflowKeys).toHaveLength(20)
  })
})

describe('keepWithNext — 다음과 같은 단에 (PP§6.3)', () => {
  it('묶인 둘은 같은 단에 함께 이월된다', () => {
    const half = CAP_FIRST / 2
    const r = layoutPages(
      [q('a'), q('b', { keepWithNext: true }), q('c')],
      heights([['a', half - GAP], ['b', half / 2], ['c', half / 2]]),
      config,
    )
    const col0 = r.pages[0]?.columns[0]?.items.map((i) => i.key) ?? []
    const col1 = r.pages[0]?.columns[1]?.items.map((i) => i.key) ?? []
    expect(col0).toEqual(['a'])
    expect(col1).toEqual(['b', 'c'])
  })

  it('체인이 단 전체보다 크면 묶음을 푼다 — 안 풀면 영원히 이월된다', () => {
    const r = layoutPages(
      [q('a', { keepWithNext: true }), q('b')],
      heights([['a', CAP_FIRST * 0.7], ['b', CAP_FIRST * 0.7]]),
      config,
    )
    // 각각은 단에 들어가므로 overflow 가 아니어야 한다
    expect(r.overflowKeys).toEqual([])
    expect(flat(r).map((i) => i.key)).toEqual(['a', 'b'])
    expect(r.pages[0]?.columns[0]?.items).toHaveLength(1)
  })

  it('세 개 이상 이어진 체인도 함께 움직인다', () => {
    const r = layoutPages(
      [
        q('x'),
        q('a', { keepWithNext: true }),
        q('b', { keepWithNext: true }),
        q('c'),
      ],
      // x 가 단의 9할을 쓰므로 체인 셋(=약 133px)이 남은 자리에 안 들어간다
      heights([['x', CAP_FIRST * 0.9], ['a', 40], ['b', 40], ['c', 40]]),
      config,
    )
    expect(r.pages[0]?.columns[1]?.items.map((i) => i.key)).toEqual(['a', 'b', 'c'])
  })
})

describe('지문 묶음 — together 고정 (zz-2 D4)', () => {
  it('통째로 이월된다', () => {
    const group: LayoutItem = {
      key: 'g1',
      kind: 'group',
      numbered: true,
      childCount: 3,
      splitPolicy: 'together',
    }
    const r = layoutPages(
      [q('a'), group],
      heights([['a', CAP_FIRST * 0.6], ['g1', CAP_FIRST * 0.6]]),
      config,
    )
    expect(r.pages[0]?.columns[1]?.items.map((i) => i.key)).toEqual(['g1'])
  })
})

describe('양면', () => {
  it('쪽수가 홀수면 뒷면이 백지다', () => {
    expect(layoutPages([q('a')], heights([['a', 10]]), config).blankBack).toBe(true)
  })

  it('짝수면 아니다', () => {
    const big = CAP_FIRST - GAP - 1
    const r = layoutPages(
      [q('a'), q('b'), q('c')],
      heights([['a', big], ['b', big], ['c', 10]]),
      config,
    )
    expect(r.pages).toHaveLength(2)
    expect(r.blankBack).toBe(false)
  })
})
