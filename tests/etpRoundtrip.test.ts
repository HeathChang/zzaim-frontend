/** 파일 왕복 — **정본이 정말로 정본인지** 확인한다.
 *  «저장 → 캐시 전체 삭제 → 열기» 로 100% 복구되어야 한다 (PP§10). */
import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8, zipSync, strToU8 } from 'fflate'
import { buildEtp, contentHash } from '@/storage/etp/write'
import { readEtp, EtpReadError } from '@/storage/etp/read'
import { emptyDocument, SCHEMA_VERSION, type EtpDocument } from '@/storage/etp/format'
import type { Paper, Passage, Question } from '@/domain/types'

const q = (id: string): Question => ({
  id,
  body: { kind: 'html', html: `<p>${id} 본문</p>` },
  points: 3,
  numberHint: 12,
  numberBaked: false,
  hasCrossRef: false,
  passageId: null,
  tags: ['단원:문학'],
  note: '메모',
  answer: '3',
  createdAt: 1,
  updatedAt: 2,
})

const passage = (id: string): Passage => ({
  id,
  body: { kind: 'html', html: '<p>지문</p>' },
  instruction: '다음 글을 읽고 물음에 답하시오.',
  tags: [],
  createdAt: 1,
  updatedAt: 2,
})

const paper = (id: string): Paper => ({
  id,
  title: '2학기 중간고사',
  header: {
    school: '○○고등학교',
    grade: '1학년',
    subject: '국어',
    examName: '중간고사',
    duration: '50',
    teacher: '',
    showTotalPoints: true,
  },
  layout: {
    pageSize: 'A4',
    orientation: 'portrait',
    columns: 2,
    duplex: false,
    margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
    gutter: 8,
    columnRule: false,
    fontScale: 100,
    startNumber: 1,
    targetPoints: 100,
    box: 'border',
    folio: true,
    closing: false,
    carryMark: true,
  },
  items: [
    { kind: 'question', questionId: 'q1', overridePoints: 4, keepWithNext: true },
    {
      kind: 'passageGroup',
      passageId: 'p1',
      children: [{ questionId: 'q2' }],
      splitPolicy: 'together',
    },
    { kind: 'spacer', heightMm: 30, ruled: true },
    { kind: 'divider' },
    { kind: 'notice', html: '<p>안내</p>' },
  ],
  createdAt: 1,
  updatedAt: 2,
})

function sample(): EtpDocument {
  return {
    ...emptyDocument(0),
    questions: [q('q1'), q('q2')],
    passages: [passage('p1')],
    papers: [paper('paper1')],
    blobs: new Map([['abc.1', new Uint8Array([1, 2, 3])]]),
  }
}

describe('왕복', () => {
  it('저장한 것이 그대로 돌아온다 — 이게 «파일이 정본»의 뜻이다', () => {
    const doc = sample()
    const { doc: back } = readEtp(buildEtp(doc, { now: 1000 }))
    expect(back.questions).toEqual(doc.questions)
    expect(back.passages).toEqual(doc.passages)
    expect(back.papers).toEqual(doc.papers)
    expect([...back.blobs.entries()]).toEqual([['abc.1', new Uint8Array([1, 2, 3])]])
  })

  it('저장 시각은 주입한 값이 쓰인다', () => {
    const { doc } = readEtp(buildEtp(sample(), { now: 4242 }))
    expect(doc.manifest.updatedAt).toBe(4242)
  })

  it('두 번 왕복해도 변하지 않는다 — 조금씩 어긋나면 언젠가 깨진다', () => {
    const once = readEtp(buildEtp(sample(), { now: 1 })).doc
    const twice = readEtp(buildEtp(once, { now: 1 })).doc
    expect(twice.questions).toEqual(once.questions)
    expect(twice.papers).toEqual(once.papers)
  })

  it('빈 문서도 왕복한다', () => {
    const { doc } = readEtp(buildEtp(emptyDocument(0), { now: 1 }))
    expect(doc.questions).toEqual([])
  })
})

describe('이식성 — 일반 zip 도구로 풀 수 있어야 한다 (PP§10)', () => {
  it('평범한 zip 이고 엔트리 이름이 규격대로다', () => {
    const entries = unzipSync(buildEtp(sample(), { now: 1 }))
    expect(Object.keys(entries).sort()).toEqual([
      'blobs/abc.1',
      'manifest.json',
      'papers.json',
      'passages.json',
      'questions.json',
    ])
  })

  it('JSON 이 사람이 읽을 수 있게 들여쓰여 있다', () => {
    const entries = unzipSync(buildEtp(sample(), { now: 1 }))
    const text = strFromU8(entries['questions.json'] as Uint8Array)
    expect(text).toContain('\n  ')
    expect(JSON.parse(text)).toHaveLength(2)
  })
})

describe('망가진 파일 — 파일을 믿지 않는다', () => {
  it('zip 이 아니면 이유를 붙여 거절한다', () => {
    expect(() => readEtp(new Uint8Array([1, 2, 3]))).toThrow(EtpReadError)
    try {
      readEtp(new Uint8Array([1, 2, 3]))
    } catch (e) {
      expect((e as EtpReadError).reason).toBe('not-a-zip')
    }
  })

  it('manifest 가 없으면 우리 파일이 아니다 — 추측해서 열지 않는다', () => {
    const zip = zipSync({ 'hello.txt': strToU8('hi') })
    try {
      readEtp(zip)
      expect.unreachable()
    } catch (e) {
      expect((e as EtpReadError).reason).toBe('not-an-etp')
    }
  })

  it('★ 앞으로 만든 파일은 열지 않는다 — 억지로 열어 저장하면 모르는 필드가 사라진다', () => {
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 })),
    })
    try {
      readEtp(zip)
      expect.unreachable()
    } catch (e) {
      expect((e as EtpReadError).reason).toBe('too-new')
    }
  })

  it('망가진 문항 하나 때문에 파일 전체가 안 열리지는 않는다', () => {
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: 1, updatedAt: 1 })),
      'questions.json': strToU8(JSON.stringify([q('ok'), { id: 'bad' }, null])),
    })
    const { doc, report } = readEtp(zip)
    expect(doc.questions.map((x) => x.id)).toEqual(['ok'])
    expect(report.skipped).toHaveLength(2)
  })

  it('JSON 이 깨져 있으면 그 항목만 비운다', () => {
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: 1, updatedAt: 1 })),
      'questions.json': strToU8('{ 깨진'),
    })
    const { doc } = readEtp(zip)
    expect(doc.questions).toEqual([])
  })
})

describe('내용 해시', () => {
  it('같은 내용이면 같은 이름 — 같은 이미지를 두 번 담지 않는다', () => {
    expect(contentHash(new Uint8Array([1, 2, 3]))).toBe(contentHash(new Uint8Array([1, 2, 3])))
  })

  it('한 바이트만 달라도 이름이 바뀐다', () => {
    expect(contentHash(new Uint8Array([1, 2, 3]))).not.toBe(contentHash(new Uint8Array([1, 2, 4])))
  })

  it('길이가 다르면 이름이 다르다', () => {
    expect(contentHash(new Uint8Array([1]))).not.toBe(contentHash(new Uint8Array([1, 1])))
  })
})

describe('이미지가 파일에 실린다 — 안 실으면 다른 PC 에서 그림 자리가 빈다', () => {
  it('blobs 가 왕복한다', () => {
    const doc = {
      ...emptyDocument(0),
      questions: [
        {
          ...q('img'),
          body: { kind: 'image' as const, blobId: 'h1.3', naturalWidth: 100, naturalHeight: 50 },
        },
      ],
      blobs: new Map([['h1.3', new Uint8Array([9, 8, 7])]]),
    }
    const { doc: back } = readEtp(buildEtp(doc, { now: 1 }))
    expect(back.blobs.get('h1.3')).toEqual(new Uint8Array([9, 8, 7]))
    const body = back.questions[0]?.body
    expect(body?.kind).toBe('image')
    if (body?.kind === 'image') expect(body.blobId).toBe('h1.3')
  })

  it('blobId 가 없는 이미지 문항은 건너뛴다 — 열 수 없는 문항을 넣지 않는다', () => {
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: 1, updatedAt: 1 })),
      'questions.json': strToU8(
        JSON.stringify([{ id: 'x', body: { kind: 'image', naturalWidth: 1, naturalHeight: 1 } }]),
      ),
    })
    const { doc, report } = readEtp(zip)
    expect(doc.questions).toEqual([])
    expect(report.skipped).toHaveLength(1)
  })
})
