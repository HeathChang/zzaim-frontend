/** zz-8 D2 — 범위 가드 2층.
 *
 *  ★ 이 테스트의 핵심은 «막는다»가 아니라 **«도달할 수 없다»** 다.
 *  슬라이더로 갈 수 있는 모든 조합을 실제로 전수로 돌려 본다. */
import { describe, expect, it, vi } from 'vitest'
import {
  UI_MIN_COL_W_MM,
  columnWidthMm,
  rangeFor,
  
  warnIfEngineClamped,
  type GuardInput,
} from '@/layout/guards'
import { RANGE, MIN_COL_W_MM } from '@/layout/constants'
import type { Orientation, PageSize } from '@/domain/types'
import { effectivePage } from '@/layout/pageSize'

const base: GuardInput = {
  pageSize: 'A4',
  orientation: 'portrait',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
}

describe('지면 치수', () => {
  it('가로로 돌리면 폭과 높이가 바뀐다 (D1)', () => {
    expect(effectivePage('A4', 'portrait')).toEqual({ w: 210, h: 297 })
    expect(effectivePage('A4', 'landscape')).toEqual({ w: 297, h: 210 })
    expect(effectivePage('B4', 'landscape')).toEqual({ w: 364, h: 257 })
  })
})

describe('단 폭', () => {
  it('기본값은 여유가 있다', () => {
    // (210 - 20 - 15 - 8) / 2 = 83.5
    expect(columnWidthMm(base)).toBeCloseTo(83.5)
  })

  it('★ 정적 범위를 그대로 쓰면 가드 아래로 떨어진다 — 그래서 동적 상한이 필요하다', () => {
    const worst: GuardInput = {
      ...base,
      gutter: RANGE.gutter.max,
      margin: { ...base.margin, inner: RANGE.marginInline.max, outer: RANGE.marginInline.max },
    }
    // (210 - 60 - 60 - 20) / 2 = 35mm
    expect(columnWidthMm(worst)).toBeCloseTo(35)
    expect(columnWidthMm(worst)).toBeLessThan(UI_MIN_COL_W_MM)
  })
})

describe('★ 동적 상한 — 슬라이더로 도달 가능한 모든 조합에서 40mm 를 지킨다', () => {
  const papers: PageSize[] = ['A4', 'B4']
  const orientations: Orientation[] = ['portrait', 'landscape']

  it('A4/B4 × 세로/가로 × 1단/2단 전수', () => {
    const failures: string[] = []
    let checked = 0

    for (const pageSize of papers) {
      for (const orientation of orientations) {
        for (const columns of [1, 2] as const) {
          for (let inner = RANGE.marginInline.min; inner <= RANGE.marginInline.max; inner += 1) {
            for (let outer = RANGE.marginInline.min; outer <= RANGE.marginInline.max; outer += 1) {
              for (let gutter = RANGE.gutter.min; gutter <= RANGE.gutter.max; gutter += 1) {
                const v: GuardInput = {
                  pageSize,
                  orientation,
                  columns,
                  gutter,
                  margin: { top: 20, bottom: 20, inner, outer },
                }
                // 가드가 실제로 허용하는 값만 본다 — 상한을 넘는 조합은 고를 수 없다
                if (inner > rangeFor('inner', v).max) continue
                if (outer > rangeFor('outer', v).max) continue
                if (gutter > rangeFor('gutter', v).max) continue
                checked += 1
                if (columnWidthMm(v) < UI_MIN_COL_W_MM) {
                  failures.push(`${pageSize}/${orientation}/${columns}단 ${inner}/${outer}/${gutter}`)
                }
              }
            }
          }
        }
      }
    }

    expect(checked).toBeGreaterThan(1000)
    expect(failures.slice(0, 5)).toEqual([])
  })

  it('상한은 다른 값에 따라 움직인다 — 여백을 키우면 단 사이가 줄어든다', () => {
    const narrow = rangeFor('gutter', { ...base, margin: { ...base.margin, inner: 60, outer: 60 } })
    const wide = rangeFor('gutter', base)
    expect(narrow.max).toBeLessThan(wide.max)
    // 딱 그 상한에서 단 폭이 정확히 40mm — 한 칸도 더 못 준다
    expect(
      columnWidthMm({ ...base, gutter: narrow.max, margin: { ...base.margin, inner: 60, outer: 60 } }),
    ).toBe(UI_MIN_COL_W_MM)
  })

  it('단이 1개면 단 사이 간격에 제한이 없다 — 나눌 것이 없다', () => {
    expect(rangeFor('gutter', { ...base, columns: 1 }).max).toBe(RANGE.gutter.max)
  })

  it('위·아래 여백은 정적 범위 그대로다 — 단 폭에 영향이 없다', () => {
    expect(rangeFor('top', base)).toEqual({ ...RANGE.marginBlock, step: 1 })
  })

  it('더 올릴 수 없으면 상한이 하한까지 내려온다 — 그래도 범위가 뒤집히지 않는다', () => {
    const tight = rangeFor('inner', {
      ...base,
      pageSize: 'A4',
      columns: 2,
      gutter: 20,
      margin: { ...base.margin, outer: 60 },
    })
    expect(tight.max).toBeGreaterThanOrEqual(tight.min)
  })
})

describe('엔진 클램프는 새는지 알리는 용도다', () => {
  it('정상 값에서는 조용하다', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(warnIfEngineClamped(base, true)).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('★ 하한에 닿으면 개발 빌드에서 «UI 가드가 샌다» 고 알린다', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const leak: GuardInput = {
      ...base,
      margin: { ...base.margin, inner: 90, outer: 90 },
    }
    expect(columnWidthMm(leak)).toBeLessThanOrEqual(MIN_COL_W_MM)
    expect(warnIfEngineClamped(leak, true)).toBe(true)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('배포 빌드에서는 알리지 않는다 — 사용자가 볼 이유가 없는 내부 모순이다', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    warnIfEngineClamped({ ...base, margin: { ...base.margin, inner: 90, outer: 90 } }, false)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('UI 하한이 엔진 하한보다 넉넉하다 — 그래야 층이 성립한다', () => {
    expect(UI_MIN_COL_W_MM).toBeGreaterThan(MIN_COL_W_MM)
  })
})
