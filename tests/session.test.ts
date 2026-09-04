/** 세션 — **부품이 순서대로 이어지는가.**
 *  단위 부품이 다 통과해도 조립 순서가 틀리면 데이터가 사라진다. */
import { describe, expect, it, vi } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { openDocument, saveDocument, OpenError, type SessionPorts } from '@/storage/session'
import { emptyDocument, SCHEMA_VERSION, type EtpDocument } from '@/storage/etp/format'
import { buildEtp } from '@/storage/etp/write'
import type { Directory, FileEntry } from '@/storage/fileHandle'

function fakeDir(initial: Record<string, Uint8Array> = {}) {
  const files = new Map(Object.entries(initial))
  const entry = (name: string): FileEntry => ({
    name,
    async createWritable() {
      let buf = new Uint8Array()
      return {
        async write(data: Uint8Array) {
          buf = new Uint8Array(data)
        },
        async close() {
          files.set(name, buf)
        },
      }
    },
    async read() {
      const v = files.get(name)
      if (!v) throw new Error('not found')
      return v
    },
    async remove() {
      files.delete(name)
    },
    async rename(next) {
      const v = files.get(name)
      if (!v) throw new Error('not found')
      files.delete(name)
      files.set(next, v)
    },
  })
  const dir: Directory = {
    getFile: async (n) => entry(n),
    removeFile: async (n) => void files.delete(n),
    has: async (n) => files.has(n),
  }
  return { dir, files }
}

function ports(over: Partial<SessionPorts> & { dir?: Directory; files?: Map<string, Uint8Array> }) {
  const base: SessionPorts = {
    directory: over.dir ?? null,
    readFile: async (name) => {
      const v = over.files?.get(name)
      if (!v) throw new Error('not found')
      return v
    },
    now: () => 1000,
    lastKnownAt: async () => null,
    cacheUpdatedAt: async () => null,
  }
  return { ...base, ...over } as SessionPorts
}

function sampleBytes(now: number): Uint8Array {
  const doc: EtpDocument = { ...emptyDocument(now) }
  return buildEtp(doc, { now })
}

describe('열기', () => {
  it('정상 파일을 연다', async () => {
    const { dir, files } = fakeDir({ 'a.etp': sampleBytes(500) })
    const r = await openDocument(ports({ dir, files }), 'a.etp')
    expect(r.doc.manifest.updatedAt).toBe(500)
    expect(r.conflict.kind).toBe('open')
  })

  it('없는 파일은 이유를 붙여 실패한다', async () => {
    const { dir, files } = fakeDir()
    await expect(openDocument(ports({ dir, files }), 'a.etp')).rejects.toBeInstanceOf(OpenError)
  })

  it('우리 파일이 아니면 이유가 not-an-etp 다', async () => {
    const bad = zipSync({ 'x.txt': strToU8('hi') })
    const { dir, files } = fakeDir({ 'a.etp': bad })
    try {
      await openDocument(ports({ dir, files }), 'a.etp')
      expect.unreachable()
    } catch (e) {
      expect((e as OpenError).reason).toBe('not-an-etp')
    }
  })

  it('앞으로 만든 파일은 열지 않는다', async () => {
    const future = zipSync({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 })),
    })
    const { dir, files } = fakeDir({ 'a.etp': future })
    try {
      await openDocument(ports({ dir, files }), 'a.etp')
      expect.unreachable()
    } catch (e) {
      expect((e as OpenError).reason).toBe('too-new')
    }
  })

  it('★ 저장이 끊겨 원본이 없으면 **먼저 되돌리고** 연다', async () => {
    // 마지막 단계에서 죽은 상태: 원본 없음, 백업만 있음
    const { dir, files } = fakeDir({ 'a.etp.bak': sampleBytes(400) })
    const r = await openDocument(ports({ dir, files }), 'a.etp')
    expect(r.recovered).toBe(true)
    expect(r.doc.manifest.updatedAt).toBe(400)
    expect(files.has('a.etp')).toBe(true)
  })

  it('파일이 다른 곳에서 바뀌었으면 그 사실을 알린다', async () => {
    const { dir, files } = fakeDir({ 'a.etp': sampleBytes(900) })
    const r = await openDocument(
      ports({ dir, files, lastKnownAt: async () => 500 }),
      'a.etp',
    )
    expect(r.conflict.kind).toBe('file-changed')
  })

  it('캐시가 더 새로우면 복구를 묻는다', async () => {
    const { dir, files } = fakeDir({ 'a.etp': sampleBytes(500) })
    const r = await openDocument(
      ports({ dir, files, lastKnownAt: async () => 500, cacheUpdatedAt: async () => 800 }),
      'a.etp',
    )
    expect(r.conflict.kind).toBe('cache-newer')
  })
})

describe('저장', () => {
  it('디렉토리가 있으면 원자적으로 저장한다', async () => {
    const { dir, files } = fakeDir({ 'a.etp': sampleBytes(100) })
    const r = await saveDocument(ports({ dir, files }), 'a.etp', emptyDocument(0))
    expect(r.outcome).toEqual({ kind: 'atomic', backup: 'a.etp.bak' })
    expect(files.has('a.etp.bak')).toBe(true)
  })

  it('★ 디렉토리 권한이 없으면 다운로드로 간다 — 절단 위험이 없다', async () => {
    const onDownload = vi.fn().mockReturnValue({ kind: 'download' as const })
    const r = await saveDocument(
      ports({ directory: null, onDownload }),
      'a.etp',
      emptyDocument(0),
    )
    expect(r.outcome).toEqual({ kind: 'download' })
    expect(onDownload).toHaveBeenCalled()
  })

  it('저장 시각은 주입한 시계에서 온다', async () => {
    const { dir, files } = fakeDir()
    const r = await saveDocument(ports({ dir, files, now: () => 777 }), 'a.etp', emptyDocument(0))
    expect(r.savedAt).toBe(777)
  })

  it('저장 → 열기 왕복이 성립한다 — 이게 «파일이 정본»의 실전 형태다', async () => {
    const { dir, files } = fakeDir()
    const p = ports({ dir, files, now: () => 2000 })
    const doc = {
      ...emptyDocument(0),
      questions: [
        {
          id: 'q1',
          body: { kind: 'html' as const, html: '<p>본문</p>' },
          points: 3,
          numberHint: null,
          numberBaked: false,
          hasCrossRef: false,
          passageId: null,
          tags: [],
          note: '',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }
    await saveDocument(p, 'a.etp', doc)
    const back = await openDocument(p, 'a.etp')
    expect(back.doc.questions).toEqual(doc.questions)
    expect(back.doc.manifest.updatedAt).toBe(2000)
  })
})
