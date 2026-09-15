/** 조판 결과(`Page[]`) → 문단 배열 (zz-9 D3).
 *
 *  ★ **배치를 다시 계산하지 않는다.** 화면이 이미 measure→layout 을 돌았고,
 *  그 결과를 그대로 받는다. 여기서 다시 배치하면 «쪽 수가 화면과 같다»는 약속이
 *  깨진다 — 측정은 DOM 이 있어야 하는데 내보내기 시점에 같은 DOM 이 있다는 보장이 없다.
 *
 *  번호도 다시 매기지 않는다. `PlacedItem.number` 가 화면에 찍힌 그 번호다. */
import type { LayoutResult } from '@/layout/types'
import type { ParagraphInput } from '@/export/hwpx/asText'
import { PARA_END, PARA_KEEP } from '@/export/hwpx/header'
import { mmToHwp } from '@/export/hwpx/units'
import { strings } from '@/app/strings'
import { CHOICE_START } from '@/components/sheet/QuestionRow'

/** 내보낼 아이템 하나. **조판 엔진은 본문을 모르므로**(PP§6.1) 여기서 이어 준다 */
export interface ExportItem {
  key: string
  kind: 'question' | 'group' | 'spacer' | 'divider' | 'notice'
  /** 본문 (HTML). 지문 묶음이면 지문 본문 */
  html?: string
  /** 지문 묶음의 지시문 — 범위(`[1~3]`)는 배치 결과에서 온다 */
  instruction?: string
  /** 배점. 없으면 표시하지 않는다 */
  points?: number | null
}

export interface FromPagesInput {
  layout: LayoutResult
  items: readonly ExportItem[]
  /** 시험지 머리말 — 첫 쪽 맨 위에 한 번 */
  headerLines?: readonly string[]
}

/** HTML → 줄 배열.
 *
 *  ⚠ **문항은 불투명 블록이다**(PP§6.1). 구조를 해석하려 들지 않는다 —
 *  블록 경계에서만 줄을 나누고 나머지 태그는 지운다. 선택지를 «선택지»로
 *  이해하려는 순간 4지선다·서술형에서 깨진다. */
export function htmlToLines(html: string): string[] {
  return html
    .replace(/<(br|BR)\s*\/?>/g, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|td|th)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // ⚠ `&amp;` 를 **맨 마지막에** 푼다. 먼저 풀면 `&amp;lt;` 가 `<` 가 된다
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
}

/** 번호와 배점을 **텍스트로** 박는다. 한글에는 우리 채번이 없으므로 글자여야 한다 (D3).
 *
 *  ⚠ 배점을 **첫 줄 끝**에 붙이면 안 된다. 발문이 여러 줄로 나뉘어 오는 경우가 흔해서
 *  «윗글의 서술 방식으로 [3점] 가장 적절한 것은?» 처럼 **문장 한가운데** 끼어든다
 *  (실제로 그렇게 나왔다). 지면과 같은 규칙 — **선택지 직전 줄**에 붙인다.
 *  규칙과 정규식을 지면(`QuestionRow`)과 공유해 둘이 갈라지지 않게 한다. */
function placePoints(lines: string[], points: number | null | undefined): string[] {
  if (points == null || points <= 0) return lines
  const label = strings.paper.points(points)
  if (lines.length === 0) return [label]
  const firstChoice = lines.findIndex((line) => CHOICE_START.test(line))
  const target = firstChoice === -1 ? lines.length - 1 : firstChoice - 1
  // 선택지가 첫 줄이다 — 붙일 발문이 없으니 맨 앞에 둔다
  if (target < 0) return [label, ...lines]
  return lines.map((line, i) => (i === target ? `${line} ${label}` : line))
}

/** 아이템 하나가 만드는 문단들. 경계 처리와 분리해 둔다 —
 *  섞여 있으면 «어느 문단이 경계를 먹는가»가 안 보인다 */
function itemParagraphs(
  item: ExportItem,
  placed: { number: number | null; numberRange?: { from: number; to: number } },
  colWidthHwp: number,
): ParagraphInput[] {
  if (item.kind === 'spacer' || item.kind === 'divider') {
    // 여백·구분선은 빈 줄 하나로 — 한글에서 자리를 만드는 가장 안전한 방법
    return [{ text: '' }]
  }

  if (item.kind === 'group') {
    const out: ParagraphInput[] = []
    const range = placed.numberRange
    const label = range
      ? range.from === range.to
        ? `[${range.from}]`
        : `[${range.from}~${range.to}]`
      : ''
    // 지시문은 **지문과 떨어지면 안 된다** — 다음과 붙여 둔다
    if (item.instruction) {
      out.push({ text: `${label} ${item.instruction}`.trim(), paraPrId: PARA_KEEP })
    }
    // 지문은 **상자로** 넘긴다 — 시험지에서 지문과 발문의 구분이 사라지면 안 된다
    const body = htmlToLines(item.html ?? '').join(' ')
    if (body) {
      out.push({ text: body, paraPrId: PARA_END, boxed: { widthHwp: colWidthHwp } })
    }
    return out
  }

  const lines = placePoints(htmlToLines(item.html ?? ''), item.points)
  const prefix = placed.number != null ? `${placed.number}. ` : ''
  if (lines.length === 0) return [{ text: prefix.trim(), paraPrId: PARA_END }]
  // ★ 마지막 줄만 «끊어도 됨». 나머지는 다음 줄과 붙어 다닌다 —
  // 그래야 한글이 단 안에서 문항을 쪼개지 않는다 (D2)
  return lines.map((line, i) => ({
    text: i === 0 ? `${prefix}${line}` : line,
    paraPrId: i === lines.length - 1 ? PARA_END : PARA_KEEP,
  }))
}

export function fromPages(input: FromPagesInput): ParagraphInput[] {
  const byKey = new Map(input.items.map((i) => [i.key, i]))
  const out: ParagraphInput[] = []
  const colWidthHwp = mmToHwp(input.layout.geometry.colWmm)

  for (const line of input.headerLines ?? []) {
    out.push({ text: line })
  }

  input.layout.pages.forEach((page, pageIndex) => {
    // ★ 경계는 **쪽 단위로** 들고 있는다.
    //
    // 처음엔 «첫 단에서 쪽을 넘긴다»고 썼는데, **첫 단이 비어 있으면 쪽 경계가
    // 통째로 사라진다.** 그러면 뒷 쪽 내용이 앞 쪽으로 딸려 올라간다 —
    // 이 방식이 보장한다고 약속한 것이 바로 그 경계다 (D2).
    let pendingPage = pageIndex > 0

    page.columns.forEach((column, colIndex) => {
      let pendingColumn = colIndex > 0

      for (const placed of column.items) {
        const item = byKey.get(placed.key)
        if (!item) continue

        const paragraphs = itemParagraphs(item, placed, colWidthHwp)
        if (paragraphs.length === 0) continue

        paragraphs.forEach((p, i) => {
          if (i > 0) {
            out.push(p)
            return
          }
          // 쪽 넘김이 단 넘김을 이긴다 — 새 쪽은 언제나 첫 단에서 시작한다
          if (pendingPage) out.push({ ...p, pageBreak: true })
          else if (pendingColumn) out.push({ ...p, columnBreak: true })
          else out.push(p)
        })
        pendingPage = false
        pendingColumn = false
      }
    })
  })

  return out
}
