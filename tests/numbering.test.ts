/** 채번 — **배치 순서에서 나온다. 원본 번호가 아니다** (HO§문항번호).
 *  이게 이 제품의 핵심 약속이다: 순서를 바꿔도 시험지가 틀리지 않는다. */
import { describe, expect, it } from 'vitest'
import { layoutPages, type Heights } from '@/layout/layoutPages'
import { formatRange } from '@/layout/numbering'
import type { LayoutConfig, LayoutItem } from '@/layout/types'

const config: LayoutConfig = {
  pageSize: 'A4',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  fontScale: 100,
  startNumber: 1,
  box: 'border',
  safetyMarginMm: 0,
}

const q = (key: string, extra: Partial<LayoutItem> = {}): LayoutItem => ({
  key,
  kind: 'question',
  numbered: true,
  ...extra,
})

const hs = (items: LayoutItem[]): Heights => new Map(items.map((i) => [i.key, 30]))

function numbers(items: LayoutItem[], cfg: LayoutConfig = config) {
  const r = layoutPages(items, hs(items), cfg)
  return r.pages
    .flatMap((p) => p.columns.flatMap((c) => c.items))
    .map((i) => [i.key, i.number] as const)
}

describe('채번', () => {
  it('배치 순서대로 1 부터 매긴다', () => {
    expect(numbers([q('a'), q('b'), q('c')])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
  })

  it('순서를 바꾸면 번호가 따라온다 — 이게 제품의 핵심이다', () => {
    expect(numbers([q('c'), q('a'), q('b')])).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
    ])
  })

  it('startNumber 부터 시작한다', () => {
    expect(numbers([q('a'), q('b')], { ...config, startNumber: 11 })).toEqual([
      ['a', 11],
      ['b', 12],
    ])
  })

  it('채번 대상이 아닌 것은 번호를 갖지 않고 **번호를 소비하지도 않는다**', () => {
    const items = [
      q('a'),
      { key: 'sp', kind: 'spacer' } as LayoutItem,
      { key: 'div', kind: 'divider' } as LayoutItem,
      q('b'),
    ]
    expect(numbers(items)).toEqual([
      ['a', 1],
      ['sp', null],
      ['div', null],
      ['b', 2],
    ])
  })

  it('번호가 픽셀에 박힌 이미지 문항은 건너뛴다 (numberBaked)', () => {
    expect(numbers([q('a'), q('img', { numbered: false }), q('b')])).toEqual([
      ['a', 1],
      ['img', null],
      ['b', 2],
    ])
  })
})

describe('지문 묶음의 범위 — 지시문의 [1~3] 을 다시 만든다', () => {
  const group = (key: string, childCount: number): LayoutItem => ({
    key,
    kind: 'group',
    numbered: true,
    childCount,
  })

  it('데리고 있는 문항 수만큼 번호를 소비한다', () => {
    const items = [q('a'), group('g', 3), q('z')]
    const r = layoutPages(items, hs(items), config)
    const placed = r.pages.flatMap((p) => p.columns.flatMap((c) => c.items))
    expect(placed[1]?.numberRange).toEqual({ from: 2, to: 4 })
    expect(placed[2]?.number).toBe(5)
  })

  it('묶음이 앞으로 가면 범위도 따라 바뀐다', () => {
    const items = [group('g', 3), q('a')]
    const r = layoutPages(items, hs(items), config)
    const placed = r.pages.flatMap((p) => p.columns.flatMap((c) => c.items))
    expect(placed[0]?.numberRange).toEqual({ from: 1, to: 3 })
    expect(placed[1]?.number).toBe(4)
  })

  it('종속 문항이 없는 묶음은 번호를 소비하지 않는다', () => {
    const items = [group('g', 0), q('a')]
    const r = layoutPages(items, hs(items), config)
    const placed = r.pages.flatMap((p) => p.columns.flatMap((c) => c.items))
    expect(placed[0]?.number).toBeNull()
    expect(placed[1]?.number).toBe(1)
  })

  it('범위 표기 — 하나면 [1], 여럿이면 [1~3]', () => {
    expect(formatRange({ from: 1, to: 3 })).toBe('[1~3]')
    expect(formatRange({ from: 5, to: 5 })).toBe('[5]')
  })
})
