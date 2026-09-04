/** 성능 — «문항 100개에서 드롭 후 재배치 16ms 이내» (PP§10).
 *
 *  16ms 는 한 프레임이다. 배치는 산술 루프라 100개 규모에서 여유가 커야 한다.
 *  실제 병목은 측정이고, 그래서 측정을 드래그 밖으로 뺐다 (PP§6.3).
 *
 *  ⚠ 이 테스트는 **회귀 감지용**이다. 기계·부하에 따라 절대 시간이 흔들리므로
 *  넉넉한 상한을 두되, 알고리즘이 제곱으로 나빠지면 반드시 걸리게 한다. */
import { describe, expect, it } from 'vitest'
import { layoutPages } from '@/layout/layoutPages'
import type { LayoutConfig, LayoutItem } from '@/layout/types'

const config: LayoutConfig = {
  pageSize: 'A4',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  fontScale: 100,
  startNumber: 1,
  box: 'border',
}

function makeItems(n: number) {
  const items: LayoutItem[] = Array.from({ length: n }, (_, i) => ({
    key: `q${i}`,
    kind: 'question' as const,
    numbered: true,
  }))
  // 높이를 들쭉날쭉하게 — 전부 같으면 이월 경로가 안 돌아 측정이 낙관적이 된다
  const heights = new Map(items.map((it, i) => [it.key, 60 + ((i * 37) % 180)]))
  return { items, heights }
}

/** **평균이 아니라 최소값**을 쓴다.
 *
 *  벽시계는 다른 프로세스에 밀리면 위로만 튄다 — 평균을 쓰면 CI 부하에서
 *  무작위로 실패한다(실제로 한 번 겪었다). 최소값은 «이 코드가 낼 수 있는
 *  속도»에 가깝고 스케줄링 잡음에 훨씬 덜 흔들린다. */
function timeOf(n: number): number {
  const { items, heights } = makeItems(n)
  for (let i = 0; i < 3; i += 1) layoutPages(items, heights, config) // 워밍업 (JIT)
  let best = Infinity
  for (let round = 0; round < 15; round += 1) {
    const t0 = performance.now()
    layoutPages(items, heights, config)
    best = Math.min(best, performance.now() - t0)
  }
  return best
}

describe('배치 성능', () => {
  it('문항 100개 재배치가 16ms 안에 끝난다 (PP§10)', () => {
    const ms = timeOf(100)
    expect(ms).toBeLessThan(16)
  })

  it('선형에 가깝게 늘어난다 — 제곱으로 나빠지면 여기서 걸린다', () => {
    const small = Math.max(timeOf(100), 0.01)
    const large = timeOf(400)
    // 4배 입력에 4배 시간이 정상. 제곱이면 16배다 — 그 사이에 선을 긋는다
    expect(large / small).toBeLessThan(12)
  })

  it('1000개도 배치된다 — 문항이 쌓이는 제품이다', () => {
    const { items, heights } = makeItems(1000)
    const r = layoutPages(items, heights, config)
    const placed = r.pages.flatMap((p) => p.columns.flatMap((c) => c.items))
    expect(placed).toHaveLength(1000)
  })
})
