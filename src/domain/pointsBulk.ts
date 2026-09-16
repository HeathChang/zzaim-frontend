/** 배점 일괄 (zz-8 D4 · HO§배점일괄).
 *
 *  ★ **어느 규칙이든 결과 총점이 목표와 정확히 맞아야 한다.** «거의 맞음»은
 *  이 기능의 존재 이유를 없앤다 — 교사가 다시 손으로 세어야 하기 때문이다.
 *
 *  ⚠ 세 규칙 모두 **반복 상한 가드**를 둔다. 나머지를 1점씩 옮기는 방식이라
 *  조건을 잘못 쓰면 영영 돌 수 있다. */

export type BulkRule = 'even' | 'byDifficulty' | 'toTarget'

export interface BulkQuestion {
  id: string
  /** 현재 배점. 없으면 0 으로 본다 */
  points: number | null
  /** `난이도:상` 같은 태그가 들어 있다 */
  tags: readonly string[]
}

export type Difficulty = '상' | '중' | '하'

/** 난이도별 가중 — 상4 : 중3 : 하2 (HO§배점일괄) */
const WEIGHT: Record<Difficulty, number> = { 상: 4, 중: 3, 하: 2 }

const DIFFICULTY_PREFIX = '난이도:'

export function difficultyOf(q: BulkQuestion): Difficulty | null {
  for (const tag of q.tags) {
    if (!tag.startsWith(DIFFICULTY_PREFIX)) continue
    const value = tag.slice(DIFFICULTY_PREFIX.length).trim()
    if (value === '상' || value === '중' || value === '하') return value
  }
  return null
}

/** ★ 난이도가 없는 문항. **하나라도 있으면 «난이도별» 을 못 쓴다** (PD-04).
 *
 *  균등으로 조용히 돌아가지 않는다 — 교사가 의도한 배분이 아닌 결과가 나오고,
 *  그걸 알아채는 방법이 없다. */
export function missingDifficulty(questions: readonly BulkQuestion[]): string[] {
  return questions.filter((q) => difficultyOf(q) === null).map((q) => q.id)
}

/** 가중치대로 목표를 나눈다. **최소 1점**이고 나머지는 가중치가 큰 쪽부터 준다 */
function distribute(
  weights: readonly number[],
  target: number,
  minEach = 1,
): number[] {
  const n = weights.length
  if (n === 0) return []
  // 목표가 문항 수보다 작으면 최소 1점을 다 줄 수 없다. 줄 수 있는 만큼만 준다
  if (target <= n * minEach) {
    const base = Array.from({ length: n }, () => minEach)
    let excess = n * minEach - target
    // ⚠ 반복 상한 — 조건이 틀려도 영영 돌지 않게 한다
    for (let guard = 0; excess > 0 && guard < n * 1000; guard += 1) {
      const i = guard % n
      if ((base[i] ?? 0) > 0) {
        base[i] = (base[i] ?? 0) - 1
        excess -= 1
      } else if (base.every((v) => v === 0)) break
    }
    return base
  }

  const total = weights.reduce((a, b) => a + b, 0)
  const pool = target - n * minEach
  const raw = weights.map((w) => (total > 0 ? (pool * w) / total : pool / n))
  const floored = raw.map((v) => Math.floor(v) + minEach)
  let remainder = target - floored.reduce((a, b) => a + b, 0)

  // 나머지는 «버려진 소수»가 큰 순서로 준다 — 그래야 비율에 가장 가깝다
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)

  for (let guard = 0; remainder > 0 && guard < n * 1000; guard += 1) {
    const idx = order[guard % n]?.i ?? 0
    floored[idx] = (floored[idx] ?? 0) + 1
    remainder -= 1
  }
  return floored
}

export interface BulkResult {
  /** 문항 id → 새 배점 */
  points: Record<string, number>
  /** 실제 합계. **목표와 같아야 한다** */
  total: number
}

function toResult(questions: readonly BulkQuestion[], values: readonly number[]): BulkResult {
  const points: Record<string, number> = {}
  questions.forEach((q, i) => {
    points[q.id] = values[i] ?? 0
  })
  return { points, total: values.reduce((a, b) => a + b, 0) }
}

/** 균등 — 목표 ÷ 문항 수, 나머지를 앞에서부터 1점씩 */
export function evenPoints(questions: readonly BulkQuestion[], target: number): BulkResult {
  return toResult(questions, distribute(questions.map(() => 1), target))
}

/** 난이도별 — 상4 : 중3 : 하2.
 *  **호출 전에 `missingDifficulty` 로 막는다.** 여기서는 없으면 «중» 으로 보지만,
 *  그 경로로 오면 안 된다 (PD-04) */
export function byDifficultyPoints(
  questions: readonly BulkQuestion[],
  target: number,
): BulkResult {
  const weights = questions.map((q) => WEIGHT[difficultyOf(q) ?? '중'])
  return toResult(questions, distribute(weights, target))
}

/** 목표에 맞춤 — 현재 배점을 유지하고 **차이만큼만** 1점씩 옮긴다.
 *  모자라면 낮은 문항부터 올리고, 남으면 높은 문항부터 내린다. 최소 1점. */
export function toTargetPoints(questions: readonly BulkQuestion[], target: number): BulkResult {
  const n = questions.length
  if (n === 0) return { points: {}, total: 0 }
  const values = questions.map((q) => Math.max(1, q.points ?? 1))
  let diff = target - values.reduce((a, b) => a + b, 0)

  // ⚠ 반복 상한 — 내릴 곳이 없는데 계속 돌면 영영 끝나지 않는다
  const limit = Math.abs(diff) + n * 1000
  for (let guard = 0; diff !== 0 && guard < limit; guard += 1) {
    const order = values
      .map((v, i) => ({ i, v }))
      .sort((a, b) => (diff > 0 ? a.v - b.v || a.i - b.i : b.v - a.v || a.i - b.i))
    const pick = order.find((x) => (diff > 0 ? true : x.v > 1))
    // 전부 1점인데 더 내려야 한다 — 여기서 멈춘다. 총점이 목표에 못 미친다
    if (!pick) break
    values[pick.i] = (values[pick.i] ?? 0) + (diff > 0 ? 1 : -1)
    diff += diff > 0 ? -1 : 1
  }
  return toResult(questions, values)
}

export function applyBulk(
  rule: BulkRule,
  questions: readonly BulkQuestion[],
  target: number,
): BulkResult {
  if (rule === 'even') return evenPoints(questions, target)
  if (rule === 'byDifficulty') return byDifficultyPoints(questions, target)
  return toTargetPoints(questions, target)
}
