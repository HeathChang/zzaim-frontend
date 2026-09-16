/** zz-8 D4 — 배점 일괄.
 *
 *  ★ **총점이 정확히 맞는 것이 전부다.** «거의 맞음»이면 교사가 다시 손으로 세야 하고,
 *  그러면 이 기능이 없는 것과 같다. 그래서 문항 1~100 × 목표 10~200 을 **전수로** 돌린다. */
import { describe, expect, it } from 'vitest'
import {
  applyBulk,
  byDifficultyPoints,
  difficultyOf,
  evenPoints,
  missingDifficulty,
  toTargetPoints,
  type BulkQuestion,
  type BulkRule,
} from '@/domain/pointsBulk'

const q = (id: string, points: number | null = null, tags: string[] = []): BulkQuestion => ({
  id,
  points,
  tags,
})

const many = (n: number, points: number | null = null, tags: string[] = []): BulkQuestion[] =>
  Array.from({ length: n }, (_, i) => q(`q${i}`, points, tags))

describe('난이도 태그', () => {
  it('`난이도:상` 을 읽는다', () => {
    expect(difficultyOf(q('a', null, ['난이도:상']))).toBe('상')
    expect(difficultyOf(q('a', null, ['단원:1', '난이도:하']))).toBe('하')
  })

  it('없거나 알 수 없는 값이면 null 이다 — 지어내지 않는다', () => {
    expect(difficultyOf(q('a'))).toBeNull()
    expect(difficultyOf(q('a', null, ['난이도:어려움']))).toBeNull()
  })

  it('★ 난이도 없는 문항을 모두 집어낸다 — 조용한 폴백을 막는 유일한 장치다 (PD-04)', () => {
    const list = [q('a', null, ['난이도:상']), q('b'), q('c')]
    expect(missingDifficulty(list)).toEqual(['b', 'c'])
    expect(missingDifficulty([q('a', null, ['난이도:중'])])).toEqual([])
  })
})

describe('★ 총점 정확도 — 전수', () => {
  const rules: BulkRule[] = ['even', 'byDifficulty', 'toTarget']

  it('문항 1~100 × 목표 10~200 에서 세 규칙 모두 목표를 정확히 맞춘다', () => {
    const failures: string[] = []
    let checked = 0
    for (let n = 1; n <= 100; n += 1) {
      const list = many(n, 3, ['난이도:중'])
      for (let target = 10; target <= 200; target += 1) {
        // 문항 수보다 목표가 작으면 «최소 1점»과 총점을 동시에 지킬 수 없다.
        // 그 경우는 아래에서 따로 본다
        if (target < n) continue
        for (const rule of rules) {
          const r = applyBulk(rule, list, target)
          checked += 1
          if (r.total !== target) failures.push(`${rule} n=${n} target=${target} → ${r.total}`)
        }
      }
    }
    expect(checked).toBeGreaterThan(10000)
    expect(failures.slice(0, 5)).toEqual([])
  })

  it('난이도가 섞여 있어도 총점이 맞는다', () => {
    const mix = ['난이도:상', '난이도:중', '난이도:하']
    const failures: string[] = []
    for (let n = 3; n <= 60; n += 1) {
      const list = Array.from({ length: n }, (_, i) => q(`q${i}`, null, [mix[i % 3]!]))
      for (const target of [50, 100, 137, 200]) {
        const r = byDifficultyPoints(list, target)
        if (r.total !== target) failures.push(`n=${n} t=${target} → ${r.total}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('배점은 언제나 1점 이상이다 — 0점짜리 문항은 시험지에 둘 수 없다', () => {
    for (let n = 1; n <= 40; n += 1) {
      const r = evenPoints(many(n), Math.max(n, 100))
      expect(Math.min(...Object.values(r.points))).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('균등', () => {
  it('나머지를 앞에서부터 1점씩 준다', () => {
    const r = evenPoints(many(3), 100)
    expect(Object.values(r.points)).toEqual([34, 33, 33])
    expect(r.total).toBe(100)
  })

  it('딱 나누어떨어지면 모두 같다', () => {
    expect(Object.values(evenPoints(many(4), 100).points)).toEqual([25, 25, 25, 25])
  })
})

describe('난이도별', () => {
  it('상4 : 중3 : 하2 로 나눈다', () => {
    const list = [
      q('a', null, ['난이도:상']),
      q('b', null, ['난이도:중']),
      q('c', null, ['난이도:하']),
    ]
    const r = byDifficultyPoints(list, 90)
    expect(r.total).toBe(90)
    expect(r.points['a']).toBeGreaterThan(r.points['b']!)
    expect(r.points['b']).toBeGreaterThan(r.points['c']!)
  })
})

describe('목표에 맞춤', () => {
  it('현재 배점을 최대한 유지하고 차이만 옮긴다', () => {
    const list = [q('a', 5), q('b', 5), q('c', 5)]
    const r = toTargetPoints(list, 16)
    expect(r.total).toBe(16)
    // 한 문항만 1점 올라간다
    expect(Object.values(r.points).sort()).toEqual([5, 5, 6])
  })

  it('모자라면 낮은 문항부터 올린다', () => {
    const r = toTargetPoints([q('a', 2), q('b', 10)], 14)
    expect(r.points['a']).toBe(4)
    expect(r.points['b']).toBe(10)
  })

  it('남으면 높은 문항부터 내린다', () => {
    const r = toTargetPoints([q('a', 2), q('b', 10)], 8)
    expect(r.points['b']).toBe(6)
    expect(r.points['a']).toBe(2)
  })

  it('★ 전부 1점인데 더 내려야 하면 멈춘다 — 무한 루프가 없다', () => {
    const r = toTargetPoints(many(10, 1), 3)
    // 최소 1점 규칙이 이긴다. 총점이 목표에 못 미치는 채로 **끝난다**
    expect(r.total).toBe(10)
  })
})

describe('가장자리', () => {
  it('문항이 없으면 빈 결과다 — 나눗셈이 터지지 않는다', () => {
    expect(applyBulk('even', [], 100)).toEqual({ points: {}, total: 0 })
    expect(applyBulk('toTarget', [], 100)).toEqual({ points: {}, total: 0 })
  })

  it('목표가 문항 수보다 작아도 끝난다', () => {
    const r = evenPoints(many(10), 3)
    expect(r.total).toBeLessThanOrEqual(10)
    expect(Object.keys(r.points)).toHaveLength(10)
  })
})
