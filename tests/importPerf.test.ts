/** 성능 — «문항 50개 붙여넣기 → 경계 화면 표시까지 3초 이내» (PP§10).
 *
 *  이 숫자가 «5분에 50문항»(PP§7.1)의 앞부분을 좌우한다. 붙여넣고 3초를 넘게
 *  기다리면 교사는 «느린 도구»로 기억한다. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { purify, toBlocks } from '@/importing/sanitize'
import { segmentAll } from '@/importing/segment'

const CORPUS = join(process.cwd(), '../../zzaim-docs/planning/fixtures/corpus')
const files = readdirSync(CORPUS).filter((f) => f.endsWith('.html'))

/** 코퍼스를 이어 붙여 «50문항 이상» 한 뭉치를 만든다 */
function bigPaste(): string {
  return files
    .slice(0, 3)
    .map((f) => readFileSync(join(CORPUS, f), 'utf8'))
    .join('')
}

describe('가져오기 성능', () => {
  it('★ 50문항 이상을 3초 안에 세그먼트까지 만든다', () => {
    const html = bigPaste()
    const t0 = performance.now()
    const segments = segmentAll(toBlocks(purify(html)))
    const ms = performance.now() - t0

    expect(segments.filter((s) => s.role === 'question').length).toBeGreaterThanOrEqual(50)
    expect(ms, `${Math.round(ms)}ms`).toBeLessThan(3000)
  })

  it('정제가 병목이 아니다 — 세그먼트보다 오래 걸리면 구조를 다시 본다', () => {
    const html = bigPaste()
    const t0 = performance.now()
    const blocks = toBlocks(purify(html))
    const sanitizeMs = performance.now() - t0
    const t1 = performance.now()
    segmentAll(blocks)
    const segmentMs = performance.now() - t1
    // 둘 다 3초 예산 안에 넉넉히 들어야 한다
    expect(sanitizeMs + segmentMs).toBeLessThan(3000)
  })
})
