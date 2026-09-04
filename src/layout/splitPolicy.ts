/** 지문 묶음의 분할 정책.
 *
 *  **MVP 는 `together` 만 구현한다** (zz-2 D4 · UD-39).
 *
 *  왜 `passage-first` 를 안 만드는가 — 지어낼 수 없기 때문이다.
 *  측정 모델은 «아이템당 스칼라 높이 하나»이고 배치는 순수 함수다. 스칼라
 *  높이만으로는 **지문 내부의 절단 지점을 계산할 수 없다.** 절단하려면 측정을
 *  «문단 경계별 누적 높이 배열»로 확장해야 하는데, **어디서 자를지의 규칙이
 *  기획서에도 없다**(«분할 정책에 따라 처리»로 끝난다).
 *
 *  그래서 필드는 데이터 모델에 남기되(PP§6.2) 렌더러는 `together` 로만 돌고,
 *  `passage-first` 가 들어오면 **강등하고 경고를 남긴다.** 조용히 무시하면
 *  «설정했는데 왜 안 되지»가 된다. */
import type { SplitPolicy } from '@/domain/types'

export interface PolicyDecision {
  effective: 'together'
  /** 요청한 것과 다르게 동작하는가 */
  downgraded: boolean
}

export function resolveSplitPolicy(requested: SplitPolicy | undefined): PolicyDecision {
  return {
    effective: 'together',
    downgraded: requested === 'passage-first',
  }
}

