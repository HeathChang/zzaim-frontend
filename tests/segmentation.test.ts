/** 경계 휴리스틱 정확도 — **사람 없이 매 커밋 잴 수 있는 유일한 지표다** (PP§13.3).
 *
 *  테스터를 만나기 전 5~9주 구간에서 «고쳤을 때 좋아졌는가»를 판단할 근거가
 *  이것뿐이다. 파이썬 하네스가 낸 기준선 **98.1%** 를 TypeScript 구현이 지키는지 본다.
 *
 *  ⚠ **합성 코퍼스다.** 절대 정확도가 아니라 **회귀 감지**에만 쓴다 (UD-07).
 *  실물 시험지 10장을 구하면 즉시 교체한다. */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { RANGE_RE } from '@/importing/patterns'
import { describe, expect, it } from 'vitest'
import { purify, toBlocks } from '@/importing/sanitize'
import { segmentAll } from '@/importing/segment'
import { isSuspect } from '@/importing/confidence'

const FIXTURES = join(process.cwd(), '../../zzaim-docs/planning/fixtures')
const CORPUS = join(FIXTURES, 'corpus')

interface Truth {
  file: string
  questions: number
  passages: number
  sequence: string[]
}

const manifest: Truth[] = JSON.parse(readFileSync(join(FIXTURES, 'manifest.json'), 'utf8'))
const byFile = new Map(manifest.map((m) => [m.file, m]))

/** 예측 시퀀스를 정답으로 만드는 **최소 편집 수** = «손댄 곳».
 *  기획서 §13.3 의 «1 − 손댄 곳 / 최종 문항 수» 의 분자다. */
function editDistance(pred: readonly string[], truth: readonly string[]): number {
  const n = pred.length
  const m = truth.length
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = 0; i <= n; i += 1) d[i]![0] = i
  for (let j = 0; j <= m; j += 1) d[0]![j] = j
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = pred[i - 1] === truth[j - 1] ? 0 : 1
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
    }
  }
  return d[n]![m]!
}

function analyze(file: string) {
  const html = readFileSync(join(CORPUS, file), 'utf8')
  const segments = segmentAll(toBlocks(purify(html)))
  const pred = segments
    .filter((s) => s.role !== 'unknown')
    .map((s) => (s.role === 'passage' ? 'P' : 'Q'))
  const truth = byFile.get(file)?.sequence ?? []
  const edits = editDistance(pred, truth)
  return {
    pred,
    truth,
    edits,
    accuracy: 1 - edits / Math.max(1, truth.length),
    suspects: segments.filter((s) => s.role !== 'unknown' && isSuspect(s)).length,
    segments,
  }
}

const files = readdirSync(CORPUS).filter((f) => f.endsWith('.html')).sort()

describe('경계 휴리스틱 — 코퍼스 실측', () => {
  it('코퍼스가 자리에 있다 — 없으면 이 지표 전체가 무의미하다', () => {
    expect(files.length).toBeGreaterThanOrEqual(15)
    expect(manifest.length).toBe(files.length)
  })

  it('★ 전체 정확도가 기준선 98.1% 아래로 떨어지지 않는다', () => {
    let totalEdits = 0
    let totalItems = 0
    const rows: string[] = []
    for (const file of files) {
      const r = analyze(file)
      totalEdits += r.edits
      totalItems += r.truth.length
      rows.push(`${file}: 손댄 곳 ${r.edits} / ${r.truth.length} (${Math.round(r.accuracy * 100)}%)`)
    }
    const accuracy = 1 - totalEdits / totalItems
    // 실패하면 어느 파일이 나빠졌는지 바로 보이게 남긴다
    expect(accuracy, rows.join('\n')).toBeGreaterThanOrEqual(0.981)
  })

  it('일부러 휴리스틱을 깨뜨리는 3장의 **현재 상태를 고정**한다', () => {
    // 13 지문 안 열거 · 14 숫자형 선택지 · 15 번호 없는 서술형.
    // 이 셋은 «못 맞히는 것이 알려진» 케이스다. 목표는 100% 가 아니라
    // **더 나빠지지 않는 것**이다 — 좋아지면 이 숫자를 올린다.
    const known: Record<string, number> = {
      '13-국어-지문내열거.html': 1.0,
      '14-국어-선택지숫자.html': 0.66, // 파이썬 하네스와 같은 값. 남은 약점이다
      '15-국어-번호없음.html': 0.87,
    }
    for (const [file, floor] of Object.entries(known)) {
      if (!files.includes(file)) continue
      const r = analyze(file)
      expect(r.accuracy, `${file}: ${r.pred.join('')} vs ${r.truth.join('')}`).toBeGreaterThanOrEqual(
        floor,
      )
    }
  })

  it('★ 숫자형 선택지가 문항으로 쪼개지지 않는다 — 12문항이 72개가 된 적이 있다', () => {
    const file = files.find((f) => f.startsWith('14-'))
    if (!file) return
    const r = analyze(file)
    // 정답 개수의 1.5배를 넘으면 대량 거짓 분할이 났다는 뜻이다
    expect(r.pred.length).toBeLessThan(r.truth.length * 1.5)
  })

  it('★ **틀렸을 때 스스로 안다** — 이게 신뢰도의 존재 이유다', () => {
    // 잘 맞힌 시험지는 의심 지점이 적어야 «어디를 볼지»가 좁혀진다.
    // 못 맞힌 시험지는 **많이 의심해야** 교사가 그곳을 본다.
    // 반대로 되면(잘 맞혔는데 전부 의심 / 틀렸는데 자신만만) 신뢰도가 쓸모없다.
    for (const file of files) {
      const r = analyze(file)
      const ratio = r.suspects / Math.max(1, r.pred.length)
      if (r.accuracy >= 0.99) {
        expect(ratio, `${file}: 다 맞혔는데 의심 ${Math.round(ratio * 100)}%`).toBeLessThan(0.5)
      } else {
        expect(ratio, `${file}: 틀렸는데 의심 ${Math.round(ratio * 100)}%`).toBeGreaterThan(0.1)
      }
    }
  })
})

describe('지시문 물결표 — 수능은 전각을 쓴다', () => {
  it('★ `[1～3]`(전각 U+FF5E) 를 지문 경계로 잡는다 — 실제 수능 PDF 에서 지문 0개였다', () => {
    expect(RANGE_RE.test('[1～3] 다음 글을 읽고 물음에 답하시오.')).toBe(true)
    expect(RANGE_RE.exec('[10～13] 다음 글을 읽고')?.slice(1, 3)).toEqual(['10', '13'])
  })

  it('반각·물결 대시·하이픈도 그대로 받는다', () => {
    for (const s of ['[1~3]', '[1〜3]', '[1-3]', '[1–3]']) expect(RANGE_RE.test(s)).toBe(true)
  })
})
