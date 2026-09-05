/** 신뢰도 — **보여 주기 위한 숫자가 아니라 어디를 볼지 정하는 장치다** (SS§4.5).
 *
 *  그래서 점수와 함께 **근거 문구**를 낸다. 숫자만 보여 주면 사용자가 판단할 근거가 없다.
 *  판정 조건(40자·평균 3배 등)의 출처는 SS§4.5 하나다 — 지어낸 값이 없다. */
import { CIR_RE, PTS_RE, XREF_RE } from '@/importing/patterns'
import { isGapAt } from '@/importing/continuity'
import type { Segment } from '@/importing/types'

/** 의심 지점의 경계. 이 아래면 «확인 필요»로 센다 (SS§4.5) */
export const SUSPECT_THRESHOLD = 0.85

/** 근거는 **코드로** 낸다. 사람이 읽는 문구는 `strings.ts` 가 소유한다 —
 *  이 파일은 도메인 로직이고, 문구는 화면의 것이다 (zz-0 D11). */
export type ReasonCode =
  | 'noChoices'
  | 'numberGap'
  | 'noPoints'
  | 'tooShort'
  | 'tooLong'
  | 'crossRef'

export const REASON = {
  noChoices: 'noChoices',
  numberGap: 'numberGap',
  noPoints: 'noPoints',
  tooShort: 'tooShort',
  tooLong: 'tooLong',
  crossRef: 'crossRef',
} as const satisfies Record<ReasonCode, ReasonCode>

/** 감점 폭. 합이 아니라 **각각의 근거**가 사용자에게 보인다 */
const PENALTY = {
  noChoices: 0.3,
  numberGap: 0.25,
  noPoints: 0.12,
  tooShort: 0.2,
  tooLong: 0.2,
  crossRef: 0.1,
}

/** 지문은 문항과 판정 기준이 다르다 — 선택지도 배점도 없는 것이 정상이다 */
const PASSAGE_CONFIDENCE = 0.88

export interface Score {
  confidence: number
  reasons: ReasonCode[]
}

export function scoreSegment(target: Segment, all: readonly Segment[]): Score {
  if (target.role === 'passage') return { confidence: PASSAGE_CONFIDENCE, reasons: [] }

  const body = target.lines.join(' ')
  const reasons: ReasonCode[] = []
  let score = 1

  const choiceCount = target.lines.filter((l) => CIR_RE.test(l)).length
  if (choiceCount < 3) {
    reasons.push(REASON.noChoices)
    score -= PENALTY.noChoices
  }

  // ★ **번호 연속성이 가장 강한 신호다** (PP§7.1). 개별 패턴 매칭보다,
  // 추출된 번호가 1·2·3… 으로 이어지는지를 본다. 판정은 `continuity.ts` 가 한다 —
  // 수열 전체를 봐야 하는 일이라 여기 섞으면 엉킨다
  if (target.numberHint !== null) {
    const questions = all.filter((s) => s.role === 'question')
    const index = questions.indexOf(target)
    if (isGapAt(questions.map((q) => q.numberHint), index)) {
      reasons.push(REASON.numberGap)
      score -= PENALTY.numberGap
    }
  }

  // 다른 문항에는 배점이 있는데 여기만 없다 = 경계가 잘못됐을 수 있다.
  // **아무도 배점을 안 쓴 시험지**에서는 감점하지 않는다
  const someoneHasPoints = all.some((s) => PTS_RE.test(s.lines.join(' ')))
  if (!PTS_RE.test(body) && someoneHasPoints) {
    reasons.push(REASON.noPoints)
    score -= PENALTY.noPoints
  }

  if (body.length < 40 && !target.hasImage) {
    reasons.push(REASON.tooShort)
    score -= PENALTY.tooShort
  }

  const average = all.reduce((sum, s) => sum + s.lines.join(' ').length, 0) / Math.max(1, all.length)
  if (body.length > average * 3) {
    // 두 문항이 붙었을 가능성
    reasons.push(REASON.tooLong)
    score -= PENALTY.tooLong
  }

  if (XREF_RE.test(body)) {
    reasons.push(REASON.crossRef)
    score -= PENALTY.crossRef
  }

  return { confidence: Math.max(0.05, Math.min(1, score)), reasons }
}

export function isSuspect(segment: Segment): boolean {
  return segment.confidence < SUSPECT_THRESHOLD
}
