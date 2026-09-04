/** 원자적 저장 — **사고를 일부러 일으킨다.**
 *
 *  이 파일이 zz-1 의 핵심이다. 저장 도중 죽었을 때 정본이 잘려 있으면
 *  **문항 은행 전체가 사라진다** — 파일이 정본이라 되돌릴 데가 없다.
 *  실제 브라우저에서 «저장 중 강제 종료»를 재현하기 어려우므로,
 *  파일 시스템을 가짜로 만들고 원하는 단계에서 터뜨린다. */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  inspectRecovery,
  recoverInterrupted,
  SaveError,
  saveAtomic,
  type Directory,
  type FileEntry,
  type WritableFile,
} from '@/storage/fileHandle'

/** 메모리 파일 시스템. `failAt` 으로 원하는 지점에서 죽인다. */
function createFakeDir(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial))
  const fail = { write: false, close: false, rename: null as string | null }

  const entry = (name: string): FileEntry => ({
    name,
    async createWritable(): Promise<WritableFile> {
      // ⚠ 실제 `createWritable()` 은 **기존 파일을 절단한 채 연다.**
      // 그 위험을 그대로 흉내낸다 — 열자마자 내용이 사라진다.
      files.set(name, '')
      let buffer = ''
      return {
        async write(data) {
          if (fail.write) throw new Error('quota exceeded')
          buffer += new TextDecoder().decode(data)
        },
        async close() {
          if (fail.close) throw new Error('killed mid-close')
          files.set(name, buffer)
        },
        async abort() {
          files.delete(name)
        },
      }
    },
    async read() {
      const v = files.get(name)
      if (v === undefined) throw new Error('not found')
      return new TextEncoder().encode(v)
    },
    async remove() {
      files.delete(name)
    },
    async rename(next) {
      if (fail.rename === name) throw new Error('rename failed')
      const v = files.get(name)
      if (v === undefined) throw new Error('not found')
      files.delete(name)
      files.set(next, v)
    },
  })

  const dir: Directory = {
    async getFile(name) {
      return entry(name)
    },
    async removeFile(name) {
      files.delete(name)
    },
    async has(name) {
      return files.has(name)
    },
  }
  return { dir, files, fail }
}

const bytes = (s: string) => new TextEncoder().encode(s)

describe('정상 저장', () => {
  it('원본이 새 내용이 되고 이전 내용은 .bak 에 남는다', async () => {
    const { dir, files } = createFakeDir({ '시험지.etp': '옛 내용' })
    const out = await saveAtomic(dir, '시험지.etp', bytes('새 내용'))
    expect(out).toEqual({ kind: 'atomic', backup: '시험지.etp.bak' })
    expect(files.get('시험지.etp')).toBe('새 내용')
    expect(files.get('시험지.etp.bak')).toBe('옛 내용')
  })

  it('임시 파일을 남기지 않는다', async () => {
    const { dir, files } = createFakeDir({ '시험지.etp': '옛' })
    await saveAtomic(dir, '시험지.etp', bytes('새'))
    expect([...files.keys()].some((k) => k.endsWith('.tmp'))).toBe(false)
  })

  it('처음 저장하는 파일이면 백업 없이 만들어진다', async () => {
    const { dir, files } = createFakeDir()
    await saveAtomic(dir, '새파일.etp', bytes('내용'))
    expect(files.get('새파일.etp')).toBe('내용')
    expect(files.has('새파일.etp.bak')).toBe(false)
  })

  it('여러 번 저장해도 .bak 은 **직전 내용**이다', async () => {
    const { dir, files } = createFakeDir({ 'a.etp': 'v1' })
    await saveAtomic(dir, 'a.etp', bytes('v2'))
    await saveAtomic(dir, 'a.etp', bytes('v3'))
    expect(files.get('a.etp')).toBe('v3')
    expect(files.get('a.etp.bak')).toBe('v2')
  })
})

describe('★ 저장 도중 죽었다 — 정본이 온전한가', () => {
  let ctx: ReturnType<typeof createFakeDir>
  beforeEach(() => {
    ctx = createFakeDir({ '시험지.etp': '소중한 문항 200개' })
  })

  it('쓰는 중에 용량이 모자랐다 → **원본은 손도 대지 않았다**', async () => {
    ctx.fail.write = true
    await expect(saveAtomic(ctx.dir, '시험지.etp', bytes('새'))).rejects.toThrow(SaveError)
    expect(ctx.files.get('시험지.etp')).toBe('소중한 문항 200개')
  })

  it('닫는 중에 탭이 죽었다 → 원본은 그대로', async () => {
    ctx.fail.close = true
    await expect(saveAtomic(ctx.dir, '시험지.etp', bytes('새'))).rejects.toThrow(SaveError)
    expect(ctx.files.get('시험지.etp')).toBe('소중한 문항 200개')
  })

  it('실패하면 임시 파일을 치운다 — 쓰레기가 쌓이면 다음 저장도 헷갈린다', async () => {
    ctx.fail.write = true
    await saveAtomic(ctx.dir, '시험지.etp', bytes('새')).catch(() => undefined)
    expect([...ctx.files.keys()].some((k) => k.endsWith('.tmp'))).toBe(false)
  })

  it('백업으로 미는 중에 죽었다 → **원본이 아직 원본 이름에 있다**', async () => {
    ctx.fail.rename = '시험지.etp'
    await expect(saveAtomic(ctx.dir, '시험지.etp', bytes('새'))).rejects.toThrow(SaveError)
    expect(ctx.files.get('시험지.etp')).toBe('소중한 문항 200개')
  })

  it('마지막 단계에서 죽었다 → **백업이 온전하다.** 복구할 수 있다', async () => {
    ctx.fail.rename = '시험지.etp.tmp'
    await expect(saveAtomic(ctx.dir, '시험지.etp', bytes('새'))).rejects.toThrow(SaveError)
    expect(ctx.files.get('시험지.etp.bak')).toBe('소중한 문항 200개')
  })

  it('어느 단계에서 죽든 **내용이 온전한 파일이 최소 하나 남는다**', async () => {
    for (const stage of ['write', 'close', 'renameOriginal', 'renameTemp'] as const) {
      const c = createFakeDir({ 'a.etp': '원본' })
      if (stage === 'write') c.fail.write = true
      if (stage === 'close') c.fail.close = true
      if (stage === 'renameOriginal') c.fail.rename = 'a.etp'
      if (stage === 'renameTemp') c.fail.rename = 'a.etp.tmp'

      await saveAtomic(c.dir, 'a.etp', bytes('새 내용')).catch(() => undefined)
      const survivors = [...c.files.values()].filter((v) => v === '원본' || v === '새 내용')
      expect(survivors.length, `단계: ${stage}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('실패는 어느 단계였는지 알려준다 — 화면이 문구를 고를 수 있어야 한다', async () => {
    ctx.fail.write = true
    try {
      await saveAtomic(ctx.dir, '시험지.etp', bytes('새'))
      expect.unreachable()
    } catch (e) {
      expect((e as SaveError).stage).toBe('write-temp')
    }
  })
})

describe('끊긴 저장을 되돌린다 — 파일이 «사라진 것처럼» 보이면 안 된다', () => {
  it('마지막 단계에서 죽으면 원본 이름이 비어 있다는 것을 감지한다', async () => {
    const c = createFakeDir({ 'a.etp': '원본' })
    c.fail.rename = 'a.etp.tmp'
    await saveAtomic(c.dir, 'a.etp', bytes('새')).catch(() => undefined)

    const report = await inspectRecovery(c.dir, 'a.etp')
    expect(report.hasOriginal).toBe(false)
    expect(report.hasBackup).toBe(true)
    expect(report.interrupted).toBe(true)
  })

  it('백업을 원본 이름으로 되돌린다 — 임시본을 믿지 않는다', async () => {
    const c = createFakeDir({ 'a.etp': '원본' })
    c.fail.rename = 'a.etp.tmp'
    await saveAtomic(c.dir, 'a.etp', bytes('새')).catch(() => undefined)

    expect(await recoverInterrupted(c.dir, 'a.etp')).toBe(true)
    expect(c.files.get('a.etp')).toBe('원본')
  })

  it('원본이 멀쩡하면 되돌리지 않고 찌꺼기만 치운다', async () => {
    const c = createFakeDir({ 'a.etp': '원본', 'a.etp.tmp': '쓰레기' })
    expect(await recoverInterrupted(c.dir, 'a.etp')).toBe(false)
    expect(c.files.get('a.etp')).toBe('원본')
    expect(c.files.has('a.etp.tmp')).toBe(false)
  })

  it('정상 저장 뒤에는 끊긴 흔적이 없다', async () => {
    const c = createFakeDir({ 'a.etp': '원본' })
    await saveAtomic(c.dir, 'a.etp', bytes('새'))
    expect((await inspectRecovery(c.dir, 'a.etp')).interrupted).toBe(false)
  })

  it('되돌릴 것이 아무것도 없으면 false', async () => {
    const c = createFakeDir()
    expect(await recoverInterrupted(c.dir, 'a.etp')).toBe(false)
  })
})
