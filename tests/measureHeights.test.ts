/** 측정 임계와 진동 방지.
 *  0.6px 임계가 없으면 서브픽셀 진동으로 측정->렌더->측정 루프가 끝나지 않는다. */
import { describe, expect, it } from 'vitest'
import { diffHeights, pruneCache } from '@/layout/measure/measureHeights'

const m = (o: Record<string, number>) => new Map(Object.entries(o))

describe('측정 반영 여부', () => {
  it('처음 재는 것은 전부 반영한다', () => {
    const { changed } = diffHeights(m({}), m({ a: 100 }), m({}))
    expect(changed.get('a')).toBe(100)
  })

  it('0.6px 미만 차이는 무시한다 — 무한 루프 방지', () => {
    const { changed } = diffHeights(m({ a: 100 }), m({ a: 100.5 }), m({}))
    expect(changed.size).toBe(0)
  })

  it('0.6px 이상 차이는 반영한다', () => {
    const { changed } = diffHeights(m({ a: 100 }), m({ a: 100.7 }), m({}))
    expect(changed.get('a')).toBe(100.7)
  })

  it('줄어드는 방향도 같은 임계를 쓴다', () => {
    expect(diffHeights(m({ a: 100 }), m({ a: 99.5 }), m({})).changed.size).toBe(0)
    expect(diffHeights(m({ a: 100 }), m({ a: 99.3 }), m({})).changed.get('a')).toBe(99.3)
  })
})

describe('진동 상한 — 0.6px 이상으로 흔들리는 경우', () => {
  it('상한에 닿으면 반영을 멈추고 고정 목록에 넣는다', () => {
    const { changed, pinned } = diffHeights(m({ a: 100 }), m({ a: 200 }), m({ a: 3 }))
    expect(changed.size).toBe(0)
    expect(pinned).toEqual(['a'])
  })

  it('상한 아래면 아직 반영한다', () => {
    const { changed, pinned } = diffHeights(m({ a: 100 }), m({ a: 200 }), m({ a: 2 }))
    expect(changed.get('a')).toBe(200)
    expect(pinned).toEqual([])
  })

  it('흔들리는 아이템만 고정한다 — 옆 아이템까지 멈추면 안 된다', () => {
    const { changed, pinned } = diffHeights(
      m({ a: 100, b: 50 }),
      m({ a: 200, b: 80 }),
      m({ a: 3 }),
    )
    expect(pinned).toEqual(['a'])
    expect(changed.get('b')).toBe(80)
  })
})

describe('캐시 정리', () => {
  it('사라진 아이템의 측정값을 지운다 — 안 지우면 캐시가 무한히 자란다', () => {
    const cache = new Map([
      ['a', 1],
      ['b', 2],
    ])
    expect(pruneCache(cache, new Set(['a']))).toBe(1)
    expect([...cache.keys()]).toEqual(['a'])
  })
})
