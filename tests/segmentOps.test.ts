/** S-02 의 순수 로직 — `N` 이동 · 편집 연산 · 통계 · 확정.
 *
 *  **이 화면의 속도가 제품의 채택을 결정한다** (PP§7.1). 그 속도를 떠받치는 것이
 *  `N` 키이고, 이 파일이 그 규칙을 고정한다. */
import { describe, expect, it } from 'vitest'
import {
  initialCursor,
  needsAttention,
  nextSuspect,
  suspectCount,
} from '@/importing/nextSuspect'
import { drop, groupFrom, merge, resegment, split, toggleRole } from '@/importing/ops'
import { createStats, record, tick, toManifestStats, undoRecord, IDLE_CUTOFF_MS } from '@/importing/stats'
import { commitSegments, suspectsRemaining } from '@/importing/commit'
import { withPoints } from '@/components/sheet/QuestionRow'
import { purify, toBlocks } from '@/importing/sanitize'
import type { Segment } from '@/importing/types'

function seg(over: Partial<Segment> = {}): Segment {
  return {
    role: 'question',
    lines: ['1. 문항입니다'],
    start: 0,
    end: 10,
    numberHint: 1,
    points: 3,
    hasCrossRef: false,
    hasImage: false,
    hasMissingImage: false,
    confidence: 0.95,
    reasons: [],
    ...over,
  }
}

const sure = () => seg({ confidence: 0.95 })
const unsure = () => seg({ confidence: 0.4, reasons: ['noChoices'] })
const none = { confirmed: new Set<number>() }

describe('N — 다음 의심 지점 (zz-4 D1)', () => {
  it('현재 위치 **이후** 가장 가까운 의심 지점으로 간다', () => {
    const segs = [sure(), unsure(), sure(), unsure()]
    expect(nextSuspect(segs, 0, none).index).toBe(1)
    expect(nextSuspect(segs, 1, none).index).toBe(3)
  })

  it('★ 끝에 닿으면 처음으로 돌아오고 **그 사실을 알린다** (SS§4.4)', () => {
    const segs = [unsure(), sure(), sure()]
    const r = nextSuspect(segs, 2, none)
    expect(r.index).toBe(0)
    expect(r.wrapped).toBe(true)
  })

  it('남은 의심 지점이 없으면 없다고 말한다 — 헛돌지 않는다', () => {
    const segs = [sure(), sure()]
    expect(nextSuspect(segs, 0, none).none).toBe(true)
  })

  it('빈 목록에서도 터지지 않는다', () => {
    expect(nextSuspect([], 0, none)).toEqual({ index: 0, wrapped: false, none: true })
  })

  it('★ «확인함» 카드는 신뢰도가 낮아도 빠진다 — 그래야 남은 개수가 0에 닿는다 (zz-4 D5)', () => {
    const segs = [sure(), unsure()]
    expect(needsAttention(segs, 1, none)).toBe(true)
    expect(needsAttention(segs, 1, { confirmed: new Set([1]) })).toBe(false)
    expect(suspectCount(segs, { confirmed: new Set([1]) })).toBe(0)
  })

  it('★ 진입 커서는 1번이 아니라 **첫 의심 지점**이다 (zz-4 불변3)', () => {
    // 훑기가 아니라 교정이 이 화면의 일이다
    expect(initialCursor([sure(), sure(), unsure()])).toBe(2)
    expect(initialCursor([sure(), sure()])).toBe(0)
  })
})

describe('편집 연산 — M/S/P/D/G (zz-4 D3·D4)', () => {
  it('M — 위 카드와 합친다. 줄과 범위가 이어진다', () => {
    const segs = [seg({ lines: ['가'], end: 5 }), seg({ lines: ['나'], start: 5, end: 9 })]
    const out = merge(segs, 1)
    expect(out).toHaveLength(1)
    expect(out[0]?.lines).toEqual(['가', '나'])
    expect(out[0]?.end).toBe(9)
  })

  it('첫 카드는 위가 없으므로 합치지 않는다 — 조용히 아무 일도 안 한다', () => {
    const segs = [seg(), seg()]
    expect(merge(segs, 0)).toHaveLength(2)
  })

  it('★ 합칠 때 그림·상호참조 표시를 잃지 않는다 — 잃으면 경고가 사라진다', () => {
    const segs = [seg({ hasMissingImage: false }), seg({ hasMissingImage: true, hasCrossRef: true })]
    const out = merge(segs, 1)
    expect(out[0]?.hasMissingImage).toBe(true)
    expect(out[0]?.hasCrossRef).toBe(true)
  })

  it('S — 문단 경계에서 쪼갠다. 첫 조각만 번호·배점을 물려받는다', () => {
    const segs = [seg({ lines: ['1. 발문', '① 가', '② 나'], numberHint: 1, points: 3 })]
    const out = split(segs, 0, [1])
    expect(out).toHaveLength(2)
    expect(out[0]?.numberHint).toBe(1)
    expect(out[1]?.numberHint).toBeNull()
    expect(out[1]?.points).toBeNull()
  })

  it('자를 수 없는 지점은 무시한다 — 0번 줄 앞이나 범위 밖', () => {
    const segs = [seg({ lines: ['가', '나'] })]
    expect(split(segs, 0, [0])).toHaveLength(1)
    expect(split(segs, 0, [9])).toHaveLength(1)
  })

  it('P — 문항과 지문을 오간다', () => {
    const segs = [seg({ role: 'question' })]
    expect(toggleRole(segs, 0)[0]?.role).toBe('passage')
    expect(toggleRole(toggleRole(segs, 0), 0)[0]?.role).toBe('question')
  })

  it('D — 문항이 아닌 조각을 지운다', () => {
    expect(drop([seg(), seg(), seg()], 1)).toHaveLength(2)
    expect(drop([seg()], 5)).toHaveLength(1)
  })

  it('★ G — 지시문 범위가 있으면 **그 개수만큼만** 묶는다', () => {
    const segs = [
      seg({ role: 'passage', range: { from: 1, to: 2 } }),
      seg({ role: 'question' }),
      seg({ role: 'question' }),
      seg({ role: 'question' }),
    ]
    expect(groupFrom(segs, 0)?.childIndexes).toEqual([1, 2])
  })

  it('범위가 없으면 다음 지문 전까지 묶는다', () => {
    const segs = [
      seg({ role: 'passage' }),
      seg({ role: 'question' }),
      seg({ role: 'passage' }),
      seg({ role: 'question' }),
    ]
    expect(groupFrom(segs, 0)?.childIndexes).toEqual([1])
  })

  it('지문이 아니거나 뒤에 문항이 없으면 묶지 않는다', () => {
    expect(groupFrom([seg({ role: 'question' })], 0)).toBeNull()
    expect(groupFrom([seg({ role: 'passage' })], 0)).toBeNull()
  })

  it('★ 재분리 — 고른 형식이 **문항 시작 규칙 자체**가 된다 (zz-4 D6)', () => {
    // 선택지 필터로만 쓰면 «문제 1» 같은 형식은 기본 규칙에 걸려 영영 안 잡힌다
    const blocks = toBlocks(purify('<p>문제 1 첫 문항</p><p>문제 2 둘째 문항</p>'))
    expect(resegment(blocks, 'custom', '문제').length).toBeGreaterThanOrEqual(2)
  })
})

describe('교정 통계 (zz-4 D7)', () => {
  it('★ 30초 넘게 손을 놓은 시간은 빼고 센다 — «10분 안에» 를 정직하게 재려면', () => {
    let s = createStats(0)
    s = tick(s, 5_000)
    expect(s.activeMs).toBe(5_000)
    s = tick(s, 5_000 + IDLE_CUTOFF_MS + 60_000)
    // 자리 비운 시간은 안 센다
    expect(s.activeMs).toBe(5_000)
  })

  it('손댄 횟수를 센다 — 경계 교정과 번호·배점 수정은 성격이 다르다', () => {
    let s = createStats(0)
    s = record(s, 'correction', 1_000)
    s = record(s, 'field', 2_000)
    expect(s.corrections).toBe(1)
    expect(s.fieldEdits).toBe(1)
  })

  it('★ «확인함» 토글은 세지 않는다 — 경계를 고친 게 아니다 (zz-4 D5)', () => {
    const s = record(createStats(0), 'confirm', 1_000)
    expect(s.corrections).toBe(0)
    expect(s.fieldEdits).toBe(0)
  })

  it('되돌리면 센 것도 되돌린다 — 안 그러면 정확도가 실제보다 나쁘게 나온다', () => {
    let s = createStats(0)
    s = record(s, 'correction', 1_000)
    s = undoRecord(s, 'correction', 2_000)
    expect(s.corrections).toBe(0)
  })

  it('센 값이 음수로 내려가지 않는다', () => {
    const s = undoRecord(createStats(0), 'correction', 1_000)
    expect(s.corrections).toBe(0)
  })

  it('manifest 에 담을 모양으로 만든다 — 초 단위', () => {
    const s = { ...createStats(0), corrections: 2, fieldEdits: 1, activeMs: 90_000 }
    expect(toManifestStats(s, 24)).toEqual({
      corrections: 2,
      fieldEdits: 1,
      seconds: 90,
      questionCount: 24,
    })
  })
})

describe('확정 (zz-4 D8)', () => {
  it('역할에 따라 Question / Passage 로 나뉜다', () => {
    const out = commitSegments({
      segments: [seg({ role: 'passage', lines: ['[1~2] 다음 글을'] }), sure(), sure()],
      now: 1,
    })
    expect(out.passages).toHaveLength(1)
    expect(out.questions).toHaveLength(2)
  })

  it('★ 묶은 문항에 passageId 가 채워진다 — 없으면 보관함에서 미아가 된다', () => {
    const out = commitSegments({
      segments: [seg({ role: 'passage' }), sure(), sure()],
      groupings: [{ passageIndex: 0, childIndexes: [1, 2] }],
      now: 1,
    })
    expect(out.questions.every((q) => q.passageId === out.passages[0]?.id)).toBe(true)
  })

  it('묶지 않은 문항의 passageId 는 null 이다', () => {
    const out = commitSegments({ segments: [sure()], now: 1 })
    expect(out.questions[0]?.passageId).toBeNull()
  })

  it('확정하면 본문에서 번호·배점이 사라진다', () => {
    const out = commitSegments({
      segments: [seg({ lines: ['12. 다음 중 옳은 것은? [3점]'], numberHint: 12, points: 3 })],
      now: 1,
    })
    expect(out.questions[0]?.body).toEqual({
      kind: 'html',
      html: '<p>다음 중 옳은 것은?</p>',
    })
    expect(out.questions[0]?.points).toBe(3)
    expect(out.questions[0]?.numberHint).toBe(12)
  })

  it('의심 지점이 남았는지 센다 — 막지는 않고 묻는다 (D-06)', () => {
    expect(suspectsRemaining([unsure(), sure()], new Set())).toBe(1)
    expect(suspectsRemaining([unsure(), sure()], new Set([0]))).toBe(0)
  })
})

describe('★ 확정이 **원본 순서**를 지킨다 — 뒤바뀌면 시험지가 틀린다', () => {
  it('문항 · 지문 · 문항 순서가 그대로 나온다', () => {
    const out = commitSegments({
      segments: [sure(), seg({ role: 'passage' }), sure(), sure()],
      groupings: [{ passageIndex: 1, childIndexes: [2] }],
      now: 1,
    })
    expect(out.items.map((i) => i.kind)).toEqual(['question', 'passageGroup', 'question'])
  })

  it('묶음에 든 문항은 지문 자리에서 나가고 따로 놓이지 않는다', () => {
    const out = commitSegments({
      segments: [seg({ role: 'passage' }), sure(), sure()],
      groupings: [{ passageIndex: 0, childIndexes: [1, 2] }],
      now: 1,
    })
    expect(out.items).toHaveLength(1)
    expect(out.items[0]).toMatchObject({ kind: 'passageGroup' })
    if (out.items[0]?.kind === 'passageGroup') {
      expect(out.items[0].children).toHaveLength(2)
    }
  })

  it('묶지 않은 지문도 자리를 지킨다', () => {
    const out = commitSegments({ segments: [sure(), seg({ role: 'passage' })], now: 1 })
    expect(out.items.map((i) => i.kind)).toEqual(['question', 'passageGroup'])
  })
})

describe('★ 지면에 같은 것이 두 번 찍히지 않는다', () => {
  it('지문 본문에 지시문이 남지 않는다 — 남으면 두 번 나온다', () => {
    const out = commitSegments({
      segments: [
        seg({
          role: 'passage',
          lines: ['[1~3] 다음 글을 읽고 물음에 답하시오.', '지문 본문입니다'],
        }),
      ],
      now: 1,
    })
    expect(out.passages[0]?.instruction).toContain('다음 글을 읽고')
    const html = out.passages[0]?.body.kind === 'html' ? out.passages[0].body.html : ''
    expect(html).toContain('지문 본문입니다')
    expect(html).not.toContain('다음 글을 읽고')
  })
})

describe('★ 배점은 발문 끝에 붙는다 — 선택지 뒤로 밀리면 안 된다', () => {
  it('선택지 직전 문단 끝에 들어간다', () => {
    const out = withPoints('<p>다음 중 옳은 것은?</p><p>① 하나</p>', '[3점]')
    expect(out).toBe('<p>다음 중 옳은 것은? [3점]</p><p>① 하나</p>')
  })

  it('★ 발문이 줄바꿈돼 있으면 **마지막 발문 문단**에 붙는다', () => {
    const out = withPoints(
      '<p>다음 중 음운의 축</p><p>약이 일어난 것은?</p><p>① 하나</p>',
      '[3점]',
    )
    expect(out).toBe('<p>다음 중 음운의 축</p><p>약이 일어난 것은? [3점]</p><p>① 하나</p>')
  })

  it('선택지가 없으면 마지막 문단에 붙는다 — 서술형', () => {
    expect(withPoints('<p>이유를 서술하시오.</p>', '[5점]')).toBe(
      '<p>이유를 서술하시오. [5점]</p>',
    )
  })

  it('문단이 없으면 뒤에 붙인다 — 그래도 사라지지는 않는다', () => {
    expect(withPoints('발문만 있음', '[3점]')).toBe('발문만 있음 [3점]')
  })
})
