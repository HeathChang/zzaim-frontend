/** 번호 연속성 — **가장 강한 신호다** (zz-3 D5 · PP§7.1).
 *
 *  «개별 패턴 매칭보다, 추출된 번호 수열이 1·2·3… 으로 이어지는지를 본다.
 *   건너뛰면 그 구간의 신뢰도를 떨어뜨려 사람에게 넘긴다.»
 *
 *  신뢰도 산정에서 떼어 놓은 이유: 이 판정은 **세그먼트 하나가 아니라 수열 전체**를
 *  본다. 섞어 두면 «이 문항이 왜 의심스러운가»와 «수열이 어디서 끊겼는가»가
 *  한 함수 안에서 엉킨다. */

export interface Gap {
  /** 수열에서의 위치 (문항 순번) */
  index: number
  expected: number
  actual: number
}

/** 번호가 끊긴 지점들. `null`(번호 없는 문항)은 **건너뛴다** —
 *  번호가 없는 것과 번호가 틀린 것은 다른 문제다. */
export function findGaps(numbers: readonly (number | null)[]): Gap[] {
  const gaps: Gap[] = []
  let previous: number | null = null

  numbers.forEach((n, index) => {
    if (n === null) return
    if (previous !== null && n !== previous + 1) {
      gaps.push({ index, expected: previous + 1, actual: n })
    }
    previous = n
  })
  return gaps
}

/** 이 문항이 끊긴 지점인가 */
export function isGapAt(numbers: readonly (number | null)[], index: number): boolean {
  return findGaps(numbers).some((g) => g.index === index)
}

