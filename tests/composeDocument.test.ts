/** ★ 저장 회귀 — **«저장했는데 빈 파일»** 을 두 번 다시 내지 않기 위한 테스트.
 *
 *  실제로 있었던 결함이다: 세션이 들고 있던 `doc` 상태만 저장했고, 교사가 만든
 *  문항·지문·시험지는 문서 스토어에 있어서 파일에 하나도 담기지 않았다.
 *  타입 검사도 단위 테스트도 못 잡았다 — 두 상태가 **둘 다 유효했기** 때문이다. */
import { describe, expect, it } from 'vitest'
import { composeDocument } from '@/storage/composeDocument'
import { emptyDocument } from '@/storage/etp/format'
import { buildEtp } from '@/storage/etp/write'
import { readEtp } from '@/storage/etp/read'
import { DEFAULT_LAYOUT, EMPTY_HEADER } from '@/domain/defaults'
import type { Paper, Passage, Question } from '@/domain/types'

const q = (id: string): Question => ({
  id,
  body: { kind: 'html', html: `<p>${id}</p>` },
  points: 5,
  tags: [],
  numberHint: null,
  numberBaked: false,
  hasCrossRef: false,
  passageId: null,
  note: '',
  createdAt: 1,
  updatedAt: 1,
})

const p = (id: string): Passage => ({
  id,
  body: { kind: 'html', html: `<p>${id}</p>` },
  instruction: '',
  tags: [],
  createdAt: 1,
  updatedAt: 1,
})

const paper = (id: string): Paper => ({
  id,
  title: '',
  header: EMPTY_HEADER,
  layout: DEFAULT_LAYOUT,
  items: [{ kind: 'question', questionId: 'q1' }],
  createdAt: 1,
  updatedAt: 1,
})

const content = {
  questions: { q1: q('q1'), q2: q('q2') },
  passages: { s1: p('s1') },
  papers: { paper1: paper('paper1') },
}

describe('저장할 문서 조립', () => {
  it('★ 스토어의 문항·지문·시험지가 전부 담긴다 — 이게 빠져서 빈 파일이 저장됐다', () => {
    const doc = composeDocument(emptyDocument(1), content, 999)
    expect(doc.questions.map((x) => x.id)).toEqual(['q1', 'q2'])
    expect(doc.passages.map((x) => x.id)).toEqual(['s1'])
    expect(doc.papers[0]?.items).toHaveLength(1)
  })

  it('저장 시각을 갱신한다 — 누가 최신인지 이 값으로 가린다', () => {
    expect(composeDocument(emptyDocument(1), content, 999).manifest.updatedAt).toBe(999)
  })

  it('파일 메타(스키마 버전·이미지)는 원본에서 가져온다', () => {
    const base = emptyDocument(1)
    base.blobs.set('abc', new Uint8Array([1, 2]))
    const doc = composeDocument(base, content, 999)
    expect(doc.manifest.schemaVersion).toBe(base.manifest.schemaVersion)
    expect(doc.blobs.get('abc')).toEqual(new Uint8Array([1, 2]))
  })

  it('빈 스토어면 빈 문서가 된다 — 조립이 값을 지어내지 않는다', () => {
    const doc = composeDocument(emptyDocument(1), { questions: {}, passages: {}, papers: {} }, 2)
    expect(doc.questions).toEqual([])
    expect(doc.papers).toEqual([])
  })

  it('★ 조립한 문서가 .etp 로 나갔다가 그대로 돌아온다', () => {
    const doc = composeDocument(emptyDocument(1), content, 999)
    const { doc: back } = readEtp(buildEtp(doc, { now: 999 }))
    expect(back.questions.map((x) => x.id)).toEqual(['q1', 'q2'])
    expect(back.papers[0]?.items).toEqual([{ kind: 'question', questionId: 'q1' }])
    expect(back.papers[0]?.layout.columns).toBe(DEFAULT_LAYOUT.columns)
  })
})
