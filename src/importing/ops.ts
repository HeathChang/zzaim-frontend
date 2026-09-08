/** 경계 편집 연산 — 합치기·쪼개기·역할 전환·묶음·삭제.
 *
 *  **순수 함수다.** 세그먼트 배열을 받아 새 배열을 준다. 그래야 되돌리기가
 *  간단해지고(이전 배열로 되돌리면 끝), 교정 통계가 정확해진다.
 *
 *  ⚠ **«손댄 곳»으로 세는 것과 아닌 것을 구분한다** (zz-4 D7).
 *  경계를 고친 것만 센다 — «확인함»(`Space`)은 경계를 고친 게 아니다. */
import { segmentAll } from '@/importing/segment'
import type { Block, Segment } from '@/importing/types'
import { scoreSegment } from '@/importing/confidence'

/** 편집 뒤에는 신뢰도를 다시 매긴다 — 이웃이 바뀌면 판정도 바뀐다 */
function rescore(segments: Segment[]): Segment[] {
  return segments.map((s) => {
    const { confidence, reasons } = scoreSegment(s, segments)
    return { ...s, confidence, reasons }
  })
}

/** `M` — 위 카드와 합친다. 번호·배점은 **위 것을 따른다** (SS§4.4) */
export function merge(segments: readonly Segment[], index: number): Segment[] {
  if (index <= 0 || index >= segments.length) return [...segments]
  const above = segments[index - 1]
  const target = segments[index]
  if (!above || !target) return [...segments]

  const merged: Segment = {
    ...above,
    lines: [...above.lines, ...target.lines],
    end: target.end,
    hasImage: above.hasImage || target.hasImage,
    hasMissingImage: above.hasMissingImage || target.hasMissingImage,
    hasCrossRef: above.hasCrossRef || target.hasCrossRef,
    // 배점은 위 것이 없을 때만 아래 것을 쓴다
    points: above.points ?? target.points,
  }
  return rescore([...segments.slice(0, index - 1), merged, ...segments.slice(index + 1)])
}

/** `S` — 문단 경계에서 쪼갠다. **문장 중간 분할은 지원하지 않는다** (zz-4 D4).
 *  @param lineIndexes 자를 지점들 (해당 줄 **앞에서** 자른다) */
export function split(
  segments: readonly Segment[],
  index: number,
  lineIndexes: readonly number[],
): Segment[] {
  const target = segments[index]
  if (!target) return [...segments]

  const cuts = [...new Set(lineIndexes)]
    .filter((i) => i > 0 && i < target.lines.length)
    .sort((a, b) => a - b)
  if (cuts.length === 0) return [...segments]

  const pieces: Segment[] = []
  const bounds = [0, ...cuts, target.lines.length]
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const from = bounds[i] as number
    const to = bounds[i + 1] as number
    const lines = target.lines.slice(from, to)
    if (lines.length === 0) continue
    pieces.push({
      ...target,
      lines,
      // 첫 조각만 원래 번호를 물려받는다 — 나머지는 번호를 모른다
      numberHint: i === 0 ? target.numberHint : null,
      points: i === 0 ? target.points : null,
      confidence: 1,
      reasons: [],
    })
  }
  return rescore([...segments.slice(0, index), ...pieces, ...segments.slice(index + 1)])
}

/** `P` — 문항 ↔ 지문 전환 */
export function toggleRole(segments: readonly Segment[], index: number): Segment[] {
  const target = segments[index]
  if (!target) return [...segments]
  const role: Segment['role'] = target.role === 'passage' ? 'question' : 'passage'
  return rescore([
    ...segments.slice(0, index),
    { ...target, role },
    ...segments.slice(index + 1),
  ])
}

/** `D` — 머리말·안내문 등 문항이 아닌 조각을 지운다. 되돌릴 수 있다 */
export function drop(segments: readonly Segment[], index: number): Segment[] {
  if (index < 0 || index >= segments.length) return [...segments]
  return rescore([...segments.slice(0, index), ...segments.slice(index + 1)])
}

/** `G` — 지문에 이어지는 문항들을 묶는다.
 *  **`passageId` 가 없으면 보관함에서 지문 없는 문항이 미아가 된다** (PP§6.2 · zz-4 D8) */
export interface Grouping {
  /** 지문의 인덱스 */
  passageIndex: number
  /** 종속 문항들의 인덱스 */
  childIndexes: number[]
}

/** 지문 뒤로 이어지는 문항들을 자동으로 묶는다.
 *  지시문 범위(`[1~3]`)가 있으면 그 개수만큼, 없으면 다음 지문 전까지. */
export function groupFrom(segments: readonly Segment[], passageIndex: number): Grouping | null {
  const passage = segments[passageIndex]
  if (!passage || passage.role !== 'passage') return null

  const wanted = passage.range ? passage.range.to - passage.range.from + 1 : Infinity
  const children: number[] = []
  for (let i = passageIndex + 1; i < segments.length && children.length < wanted; i += 1) {
    const s = segments[i]
    if (!s) break
    if (s.role === 'passage') break
    if (s.role === 'question') children.push(i)
  }
  return children.length > 0 ? { passageIndex, childIndexes: children } : null
}

/** 재분리 — 분리가 무너졌을 때 **한 번의 선택으로 되살린다** (zz-4 D6).
 *  사용자가 고른 번호 형식만으로 다시 나눈다. */
export type NumberFormat = 'dot' | 'paren' | 'circled' | 'word' | 'custom'

export function resegment(
  blocks: readonly Block[],
  format: NumberFormat,
  custom?: string,
): Segment[] {
  const pattern = formatPattern(format, custom)
  if (!pattern) return segmentAll(blocks)
  // 고른 패턴을 **문항 시작 규칙 자체**로 넘긴다.
  // 선택지 필터로만 쓰면 «문제 1» 같은 형식은 기본 규칙(`1.`)에 걸려 영영 안 잡힌다
  return segmentAll(blocks, { questionStart: pattern })
}

function formatPattern(format: NumberFormat, custom?: string): RegExp | null {
  switch (format) {
    case 'dot':
      return /^\s*\d{1,2}\s*\./
    case 'paren':
      return /^\s*\d{1,2}\s*\)/
    case 'circled':
      return /^\s*[①②③④⑤⑥⑦⑧⑨⑩]/
    case 'word':
      return /^\s*문제\s*\d{1,2}/
    case 'custom':
      if (!custom) return null
      try {
        // 사용자가 준 것은 **패턴이 아니라 예시**다. 숫자를 자리표시자로 바꾼다
        const escaped = custom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return new RegExp(`^\\s*${escaped.replace(/\d+/g, '\\d{1,2}')}`)
      } catch {
        return null
      }
  }
}
