/** 측정 — 숨김 DOM 에서 높이를 읽는다.
 *
 *  **워커·OffscreenCanvas 는 쓸 수 없다** (PP§6.3):
 *  - 워커에는 DOM 이 없다 -> HTML 블록의 줄바꿈·행간을 계산할 방법이 없다
 *  - `measureText` 는 단일 텍스트 런의 폭만 준다 -> 자동 줄바꿈된 문단 높이를 못 낸다
 *  - 한글 조판은 브라우저 줄바꿈 규칙에 의존한다 -> 레이아웃 엔진을 우회할 수 없다
 *
 *  그래서 화면 밖 컨테이너를 **단 폭과 똑같이** 두고 지면과 같은 서식으로 한 번 더
 *  그린 뒤 높이를 읽는다. 이 파일은 «읽는 규칙»만 담고 DOM 생성은 React 가 한다. */
import { MEASURE_EPSILON_PX, MEASURE_MAX_PASSES } from '@/layout/constants'

export interface MeasureOutcome {
  /** 실제로 바뀐 것만 담는다 — 임계 미만 차이는 무시한다 */
  changed: Map<string, number>
  /** 상한까지 흔들려 마지막 값으로 고정한 아이템 */
  pinned: string[]
}

/** 이전 값과 비교해 «반영할 것»만 고른다.
 *
 *  0.6px 임계가 없으면 서브픽셀 진동으로 **측정 -> 렌더 -> 측정** 루프가 끝나지
 *  않는다(PT:846). 그런데 임계만으로는 부족하다 — 양쪽 정렬·스크롤바 등장처럼
 *  **0.6px 이상 진동**하는 경우가 있어서, 같은 아이템이 상한만큼 연속으로 흔들리면
 *  마지막 값으로 **고정하고 경고를 남긴다** (zz-2 D2). */
export function diffHeights(
  previous: ReadonlyMap<string, number>,
  measured: ReadonlyMap<string, number>,
  passCount: ReadonlyMap<string, number>,
  epsilon: number = MEASURE_EPSILON_PX,
  maxPasses: number = MEASURE_MAX_PASSES,
): MeasureOutcome {
  const changed = new Map<string, number>()
  const pinned: string[] = []

  for (const [key, height] of measured) {
    const before = previous.get(key)
    if (before !== undefined && Math.abs(before - height) < epsilon) continue
    if ((passCount.get(key) ?? 0) >= maxPasses) {
      pinned.push(key)
      continue
    }
    changed.set(key, height)
  }
  return { changed, pinned }
}

/** 측정 대상이 사라졌으면 캐시에서도 지운다 — 안 지우면 캐시가 무한히 자란다 */
export function pruneCache(cache: Map<string, number>, liveKeys: ReadonlySet<string>): number {
  let removed = 0
  for (const key of [...cache.keys()]) {
    if (!liveKeys.has(key)) {
      cache.delete(key)
      removed += 1
    }
  }
  return removed
}
