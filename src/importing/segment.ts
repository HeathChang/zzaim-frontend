/** 경계 휴리스틱 — 덩이들을 문항·지문으로 자른다 (zz-3 D4·D5).
 *
 *  **자동 분리는 100% 맞지 않는다.** 그것이 이 제품의 전제다(PP§7.1). 그래서 여기서
 *  정확도를 끝까지 밀어붙이지 않고, **틀린 곳을 사람이 빠르게 고치는 화면**(zz-4)에
 *  투자한다. 이 파일의 일은 «어디를 봐야 하는지»를 좁혀 주는 것까지다. */
import { CIR_RE, NUM_RE, PTS_RE, RANGE_RE, STEM_END, XREF_RE } from '@/importing/patterns'
import { scoreSegment } from '@/importing/confidence'
import type { Block, Segment } from '@/importing/types'

/** `1)~5)` 로 오는 선택지를 표시한다.
 *
 *  ⚠ **이것이 없으면 대량 거짓 분할이 난다.** 선택지가 문항 번호와 형식이 같아서,
 *  12문항짜리 시험지가 72개로 쪼개진 적이 있다(코퍼스 14번).
 *
 *  규칙: **발문처럼 끝나는 줄 바로 뒤에** 1부터 시작하는 연속 번호가 3개 이상이면 선택지.
 *  «1부터 시작하는 연속»만 보는 이유 — 전체 연속 구간을 잡으면 **다음 문항 번호까지
 *  삼킨다.** 실제로 그렇게 만들었다가 정확도가 떨어졌다. */
export function markNumericChoices(blocks: Block[]): Block[] {
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i]
    if (!b || !STEM_END.test(b.text)) continue

    const run: { index: number; value: number }[] = []
    for (let j = i + 1; j < blocks.length; j += 1) {
      const next = blocks[j]
      const m = next ? NUM_RE.exec(next.text) : null
      if (!m?.[1]) break
      run.push({ index: j, value: Number(m[1]) })
    }

    // 1, 2, 3… 으로 이어지는 **앞부분만** 잘라 쓴다
    const prefix: number[] = []
    for (let k = 0; k < run.length; k += 1) {
      const item = run[k]
      if (!item || item.value !== k + 1) break
      prefix.push(item.index)
    }
    if (prefix.length >= 3) {
      for (const j of prefix) {
        const target = blocks[j]
        if (target) target.isChoice = true
      }
    }
  }
  return blocks
}

interface Draft {
  role: Segment['role']
  lines: string[]
  start: number
  end: number
  numberHint: number | null
  range?: { from: number; to: number }
  hasImage: boolean
  hasMissingImage: boolean
}

export interface SegmentOptions {
  /** 문항 시작을 판정할 패턴.
   *
   *  주지 않으면 기본 규칙(`1.` `2)`)을 쓴다. **재분리(zz-4 D6)에서만** 준다 —
   *  자동 분리가 무너졌을 때 사용자가 «내 시험지는 이 형식이다»를 알려 주면
   *  그 패턴 하나로 다시 나눈다. 기본 규칙은 «문제 1» 같은 형식을 못 잡는다. */
  questionStart?: RegExp
}

export function segment(input: readonly Block[], options: SegmentOptions = {}): Segment[] {
  const blocks = markNumericChoices([...input])
  const drafts: Draft[] = []
  let current: Draft | null = null

  const flush = (): void => {
    if (current) drafts.push(current)
    current = null
  }
  const open = (b: Block, role: Segment['role'], extra: Partial<Draft> = {}): Draft => ({
    role,
    lines: [b.text],
    start: b.start,
    end: b.end,
    numberHint: null,
    hasImage: b.hasImage,
    hasMissingImage: b.hasImage && b.imageStatus !== 'usable',
    ...extra,
  })

  for (const b of blocks) {
    const rangeMatch = RANGE_RE.exec(b.text)
    if (rangeMatch?.[1] && rangeMatch[2]) {
      // 묶음 지시문 → 지문 시작
      flush()
      current = open(b, 'passage', {
        range: { from: Number(rangeMatch[1]), to: Number(rangeMatch[2]) },
      })
      continue
    }

    // 재분리에서는 사용자가 고른 패턴이 **문항 시작의 유일한 근거**다
    if (options.questionStart) {
      if (options.questionStart.test(b.text)) {
        flush()
        const n = /(\d{1,2})/.exec(b.text)
        current = open(b, 'question', { numberHint: n?.[1] ? Number(n[1]) : null })
        continue
      }
    } else {
      const numMatch = NUM_RE.exec(b.text)
      if (numMatch?.[1] && !CIR_RE.test(b.text) && !b.isChoice) {
        flush()
        current = open(b, 'question', { numberHint: Number(numMatch[1]) })
        continue
      }
    }

    if (current === null) {
      // 머리말 같은 선행 잡음. 나중에 길이로 걸러낸다
      current = open(b, 'unknown')
      continue
    }

    // 번호 없는 문항 — 배점 표기와 발문 어미로 시작을 잡는다(서술형).
    // ⚠ 조건을 좁게 건 이유: 넓게 걸었다가 **줄바꿈된 발문을 쪼개** 정확도가
    // 76% → 71.9% 로 떨어진 적이 있다. 코퍼스가 그것을 잡았다.
    const currentBody = current.lines.join(' ')
    const startsNumberless =
      PTS_RE.test(b.text) &&
      STEM_END.test(b.text) &&
      !NUM_RE.test(b.text) &&
      (current.role === 'unknown' || (current.role === 'question' && PTS_RE.test(currentBody)))
    if (startsNumberless) {
      flush()
      current = open(b, 'question')
      continue
    }

    current.lines.push(b.text)
    current.end = b.end
    if (b.hasImage) {
      current.hasImage = true
      if (b.imageStatus !== 'usable') current.hasMissingImage = true
    }
    // 표는 지문 박스이거나 자료 제시다
    if (b.tag === 'td' && current.role === 'unknown') current.role = 'passage'
  }
  flush()

  // 짧은 «알 수 없음»은 머리말·안내문이다. 문항으로 세지 않는다
  const kept = drafts.filter((d) => d.role !== 'unknown' || d.lines.join(' ').length > 40)

  return kept.map((d) => {
    const body = d.lines.join(' ')
    const pts = PTS_RE.exec(body)
    const base: Segment = {
      role: d.role,
      lines: d.lines,
      start: d.start,
      end: d.end,
      numberHint: d.numberHint,
      points: pts?.[1] ? Number(pts[1]) : null,
      // 상호참조는 문항에서만 의미가 있다 — 지문의 «3번»은 지시문이다
      hasCrossRef: d.role === 'question' && XREF_RE.test(body),
      ...(d.range ? { range: d.range } : {}),
      hasImage: d.hasImage,
      hasMissingImage: d.hasMissingImage,
      confidence: 1,
      reasons: [],
    }
    return base
  })
}

/** 세그먼트에 신뢰도를 매긴다. 서로를 봐야 하므로 **전체가 정해진 뒤** 한 번에 */
export function withConfidence(segments: Segment[]): Segment[] {
  return segments.map((s) => {
    const { confidence, reasons } = scoreSegment(s, segments)
    return { ...s, confidence, reasons }
  })
}

export function segmentAll(blocks: readonly Block[], options: SegmentOptions = {}): Segment[] {
  return withConfidence(segment(blocks, options))
}
