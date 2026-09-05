/** 클립보드 수신 (zz-3 D10 · SS§2.6).
 *
 *  «서식 없는 텍스트만 있는 경우가 실제로 잦다» — 메모장 경유, 일부 뷰어.
 *  그때 **표와 그림이 사라진다는 사실을 알리고** 진행 여부를 묻는다.
 *  아무것도 없으면 복사 방법을 안내한다 — **빈손으로 돌려보내지 않는다.** */
import { purify, plainTextToBlocks, toBlocks, blocksToRaw } from '@/importing/sanitize'
import { segmentAll } from '@/importing/segment'
import type { ImportResult } from '@/importing/types'

export type ClipboardKind = 'html' | 'plain' | 'empty'

export function classifyClipboard(payload: { html: string | null; text: string }): ClipboardKind {
  if (payload.html && payload.html.trim().length > 0) return 'html'
  if (payload.text.trim().length > 0) return 'plain'
  return 'empty'
}

export interface ImportOptions {
  doc?: Document
}

/** 붙여넣은 것을 세그먼트까지 만든다.
 *
 *  ⚠ **`raw` 는 이 시점에 확정되고 이후 불변이다** (zz-3 D9). 세그먼트의
 *  오프셋이 이것을 가리키므로, 여기서 만든 문자열을 나중에 고치면 안 된다. */
export function importFromClipboard(
  payload: { html: string | null; text: string },
  options: ImportOptions = {},
): ImportResult {
  const kind = classifyClipboard(payload)
  if (kind === 'empty') {
    return { raw: '', blocks: [], segments: [], plainTextOnly: false }
  }

  const blocks =
    kind === 'html'
      ? toBlocks(purify(payload.html ?? ''), options.doc ?? document)
      : plainTextToBlocks(payload.text)

  return {
    raw: blocksToRaw(blocks),
    blocks,
    segments: segmentAll(blocks),
    plainTextOnly: kind === 'plain',
  }
}

/** 문항을 하나도 못 찾았을 때 — **통째로 한 문항으로 담는다** (SS§3.6 · 불변3).
 *  «사용자를 빈손으로 돌려보내는 것이 최악이다.» zz-4 에서 쪼개면 된다. */
export function asSingleQuestion(result: ImportResult): ImportResult {
  if (result.segments.length > 0 || result.raw.length === 0) return result
  return {
    ...result,
    segments: [
      {
        role: 'question',
        lines: result.raw.split('\n'),
        start: 0,
        end: result.raw.length,
        numberHint: null,
        points: null,
        hasCrossRef: false,
        hasImage: false,
        hasMissingImage: false,
        // 자동으로 나눈 것이 아니므로 낮게 준다 — 반드시 봐야 한다
        confidence: 0.3,
        reasons: ['noChoices'],
      },
    ],
  }
}
