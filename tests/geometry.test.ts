/** 파생 기하 — HO§파생값의 공식이 그대로 구현됐는가.
 *  여기가 틀리면 «인쇄하면 화면 그대로»가 첫 줄부터 무너진다. */
import { describe, expect, it } from 'vitest'
import { clampConfig, columnCapacity, deriveGeometry } from '@/layout/geometry'
import { HEADER_H_MM, MM, RANGE } from '@/layout/constants'
import type { LayoutConfig } from '@/layout/types'

const base: LayoutConfig = {
  pageSize: 'A4',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  fontScale: 100,
  startNumber: 1,
  box: 'border',
}

describe('파생 기하 (HO§파생값)', () => {
  it('A4 2단 기본값의 단 폭 = (210-20-15-8)/2', () => {
    const g = deriveGeometry(base)
    expect(g.colWmm).toBeCloseTo((210 - 20 - 15 - 8) / 2, 6)
    expect(g.colWmm).toBeCloseTo(83.5, 6)
  })

  it('단 높이 = 297-20-20', () => {
    expect(deriveGeometry(base).colHmm).toBeCloseTo(257, 6)
  })

  it('1단이면 단 사이 간격을 빼지 않는다', () => {
    const g = deriveGeometry({ ...base, columns: 1 })
    expect(g.colWmm).toBeCloseTo(210 - 20 - 15, 6)
  })

  it('B4 는 257x364', () => {
    const g = deriveGeometry({ ...base, pageSize: 'B4' })
    expect(g.pageWmm).toBe(257)
    expect(g.pageHmm).toBe(364)
  })

  it('본문 크기와 간격은 fontScale 을 따른다', () => {
    const g = deriveGeometry({ ...base, fontScale: 115 })
    expect(g.fontPx).toBeCloseTo((13.6 * 115) / 100, 6)
    expect(g.gapPx).toBeCloseTo((4.4 * 115) / 100, 6)
  })
})

describe('범위 제한 — 안 걸면 조판이 무너진다', () => {
  it('여백을 극단으로 줘도 단 폭이 20mm 아래로 안 내려간다', () => {
    const g = deriveGeometry({
      ...base,
      margin: { top: 45, bottom: 45, inner: 60, outer: 60 },
      gutter: 20,
    })
    expect(g.colWmm).toBeGreaterThanOrEqual(20)
    expect(g.colHmm).toBeGreaterThanOrEqual(40)
  })

  it('범위 밖 입력은 잘라 넣는다', () => {
    const c = clampConfig({
      ...base,
      gutter: 999,
      fontScale: 5,
      margin: { top: -10, bottom: 999, inner: 0, outer: 999 },
    })
    expect(c.gutter).toBe(RANGE.gutter.max)
    expect(c.fontScale).toBe(RANGE.fontScale.min)
    expect(c.margin.top).toBe(RANGE.marginBlock.min)
    expect(c.margin.bottom).toBe(RANGE.marginBlock.max)
    expect(c.margin.outer).toBe(RANGE.marginInline.max)
  })
})

describe('단 용량', () => {
  it('첫 쪽은 머리말 20mm 를 뺀다', () => {
    const g = deriveGeometry(base)
    const first = columnCapacity(g, true, 0)
    const rest = columnCapacity(g, false, 0)
    expect(rest - first).toBeCloseTo(HEADER_H_MM * MM, 6)
  })

  it('안전 마진을 뺀다 — 딱 맞춘 단은 인쇄에서 한 줄이 넘친다', () => {
    const g = deriveGeometry(base)
    expect(columnCapacity(g, false, 0) - columnCapacity(g, false, 2)).toBeCloseTo(2 * MM, 6)
  })

  it('안전 마진은 바꿔 끼울 수 있다 — 2mm 에는 실측 근거가 없다 (UD-12)', () => {
    const g = deriveGeometry(base)
    expect(columnCapacity(g, false, 5)).toBeLessThan(columnCapacity(g, false, 2))
  })

  it('용량이 음수로 내려가지 않는다', () => {
    const g = deriveGeometry(base)
    expect(columnCapacity(g, true, 9999)).toBe(0)
  })
})
