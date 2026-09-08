/** 확정 — 세그먼트를 도메인 객체로 바꾼다 (zz-4 D8 · PP§6.2).
 *
 *  **여기가 되돌릴 수 없는 경계다.** 확정 전 되돌리기 대상은 세그먼트이고,
 *  확정 후에는 `Question` 이다 — **되돌릴 대상 자체가 바뀐다.**
 *  그래서 확정 시 되돌리기 스택을 비우고 그 사실을 알린다 (zz-0 D3). */
import type { PaperItem, Passage, Question } from '@/domain/types'
import type { Segment } from '@/importing/types'
import { commit as commitSegment } from '@/importing/extract'
import type { Grouping } from '@/importing/ops'

export interface CommitInput {
  segments: readonly Segment[]
  /** `G` 로 만든 묶음들 */
  groupings?: readonly Grouping[]
  now: number
  /** 테스트가 id 를 잡을 수 있게 주입한다 */
  makeId?: (prefix: string, index: number) => string
}

export interface CommitOutput {
  questions: Question[]
  passages: Passage[]
  /** **원본 순서**로 놓을 시험지 아이템.
   *
   *  ⚠ 이걸 안 주면 호출자가 «지문 먼저, 문항 나중»처럼 제 나름대로 배열하게 되고
   *  **교사가 붙여넣은 시험지의 순서가 뒤바뀐다.** 순서는 확정 시점의 세그먼트
   *  순서가 정본이다. */
  items: PaperItem[]
}

const defaultId = (prefix: string, index: number): string => `${prefix}-${index + 1}`

export function commitSegments({
  segments,
  groupings = [],
  now,
  makeId = defaultId,
}: CommitInput): CommitOutput {
  const passages: Passage[] = []
  const questions: Question[] = []
  /** 세그먼트 인덱스 → 만들어진 지문 id */
  const passageIdByIndex = new Map<number, string>()

  segments.forEach((s, index) => {
    if (s.role !== 'passage') return
    const id = makeId('p', passages.length)
    passageIdByIndex.set(index, id)
    // ⚠ 지시문은 **본문에서 뺀다.** 따로 저장하는데 본문에도 남기면
    // 지면에 «[1~3] 다음 글을 읽고…»가 두 번 찍힌다
    const out = commitSegment({ ...s, lines: s.lines.slice(1) })
    passages.push({
      id,
      body: { kind: 'html', html: out.html },
      // 지시문은 지문의 것이다. 범위 표기는 **저장하지 않는다** —
      // 배치 순서에서 매번 다시 만든다 (HO§문항번호)
      instruction: s.lines[0] ?? '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    })
  })

  /** 문항 인덱스 → 소속 지문 id */
  const parentOf = new Map<number, string>()
  for (const g of groupings) {
    const passageId = passageIdByIndex.get(g.passageIndex)
    if (!passageId) continue
    for (const child of g.childIndexes) parentOf.set(child, passageId)
  }

  segments.forEach((s, index) => {
    if (s.role !== 'question') return
    const out = commitSegment(s)
    questions.push({
      id: makeId('q', questions.length),
      body: { kind: 'html', html: out.html },
      points: out.points,
      numberHint: out.numberHint,
      // 그림을 가져오지 못한 문항은 자동 채번을 끄지 않는다 —
      // 번호가 픽셀에 박힌 경우(`numberBaked`)는 크롭 경로(v1)에서 정해진다
      numberBaked: false,
      hasCrossRef: out.hasCrossRef,
      passageId: parentOf.get(index) ?? null,
      tags: [],
      note: '',
      createdAt: now,
      updatedAt: now,
    })
  })

  // ── 시험지 배열은 **세그먼트 순서 그대로** 만든다
  const questionIdByIndex = new Map<number, string>()
  let qi = 0
  segments.forEach((s, index) => {
    if (s.role !== 'question') return
    const id = questions[qi]?.id
    if (id) questionIdByIndex.set(index, id)
    qi += 1
  })

  const childIndexes = new Set(groupings.flatMap((g) => g.childIndexes))
  const items: PaperItem[] = []
  segments.forEach((s, index) => {
    if (s.role === 'passage') {
      const passageId = passageIdByIndex.get(index)
      const grouping = groupings.find((g) => g.passageIndex === index)
      if (!passageId) return
      items.push({
        kind: 'passageGroup',
        passageId,
        children: (grouping?.childIndexes ?? []).flatMap((c) => {
          const questionId = questionIdByIndex.get(c)
          return questionId ? [{ questionId }] : []
        }),
        splitPolicy: 'together',
      })
      return
    }
    if (s.role !== 'question') return
    // 묶음에 든 문항은 지문 자리에서 이미 나갔다
    if (childIndexes.has(index)) return
    const questionId = questionIdByIndex.get(index)
    if (questionId) items.push({ kind: 'question', questionId })
  })

  return { questions, passages, items }
}

/** 확정해도 되는가 — 의심 지점이 남아 있으면 **묻는다** (D-06).
 *  막지는 않는다. 교사가 «이대로 담겠다»고 하면 그게 맞을 수 있다. */
export function suspectsRemaining(segments: readonly Segment[], confirmed: ReadonlySet<number>): number {
  return segments.reduce(
    (n, s, i) => (!confirmed.has(i) && s.confidence < 0.85 ? n + 1 : n),
    0,
  )
}
