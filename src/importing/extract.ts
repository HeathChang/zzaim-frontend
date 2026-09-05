/** 번호·배점·상호참조를 본문에서 분리한다 (zz-3 D6 · PP§6.1).
 *
 *  ## 언제 제거하는가가 핵심이다 (zz-3 D9)
 *  세그먼트 확정 **전에** 본문을 건드리면 `start`/`end` 오프셋이 밀려
 *  **zz-4 의 원본 강조와 양방향 점프가 깨진다.**
 *  그래서 추출 단계에서는 **파생 필드로만 기록**하고, **확정 시점에** 제거한다. */
import { NUM_RE, PTS_RE, XREF_RE } from '@/importing/patterns'
import type { Segment } from '@/importing/types'

export interface Extracted {
  /** 원본 시험지의 번호. **표시하지 않는다** — 조판 엔진이 배치 순서로 다시 매긴다 */
  numberHint: number | null
  points: number | null
  /** «위 3번과 관련하여» — 자동으로 고칠 수 없다. 재배치 시 경고만 한다 */
  hasCrossRef: boolean
}

export function extract(segment: Segment): Extracted {
  const body = segment.lines.join(' ')
  const pts = PTS_RE.exec(body)
  return {
    numberHint: segment.numberHint,
    points: pts?.[1] ? Number(pts[1]) : null,
    hasCrossRef: segment.role === 'question' && XREF_RE.test(body),
  }
}

/** **확정 시점에만** 부른다. 여기서 비로소 토큰을 본문에서 걷어낸다.
 *
 *  번호는 **첫 줄의 선두에서만** 지운다 — 본문 중간의 «1. 서로의 말을»은
 *  지문 안의 열거일 수 있다. 배점은 어디 있든 하나만 지운다. */
export function stripTokens(lines: readonly string[]): string[] {
  return lines.map((line, i) => {
    let out = line
    if (i === 0) out = out.replace(NUM_RE, '')
    out = out.replace(PTS_RE, '')
    return out.replace(/\s{2,}/g, ' ').trim()
  })
}

/** 확정 — 세그먼트를 «본문 + 메타»로 만든다.
 *  도메인 객체(`Question`)를 만드는 것은 zz-4 의 일이다 (확정 화면이 소유한다). */
export interface CommittedSegment {
  html: string
  numberHint: number | null
  points: number | null
  hasCrossRef: boolean
  role: Segment['role']
}

export function commit(segment: Segment): CommittedSegment {
  const meta = extract(segment)
  const lines = stripTokens(segment.lines).filter((l) => l.length > 0)
  return {
    // 문단 구조를 살려 둔다 — 선택지 줄바꿈이 조판에서 그대로 쓰인다
    html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
    ...meta,
    role: segment.role,
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
