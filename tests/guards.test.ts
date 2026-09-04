/** 이탈 경고 · 탭 잠금 · 마이그레이션 백업 생존 — 리뷰에서 빠져 있던 것들. */
import { describe, expect, it } from 'vitest'
import { shouldWarnOnUnload } from '@/app/useUnloadGuard'
import { acquireTabLock } from '@/storage/conflict'
import { saveAtomic, type Directory, type FileEntry } from '@/storage/fileHandle'
import { migrationBackupName } from '@/storage/etp/migrate'

describe('이탈 경고', () => {
  it('저장되지 않은 변경이 있으면 경고한다', () => {
    expect(shouldWarnOnUnload(true, false)).toBe(true)
  })

  it('깨끗하면 경고하지 않는다 — 매번 막으면 사용자가 무시하게 된다', () => {
    expect(shouldWarnOnUnload(false, false)).toBe(false)
  })

  it('★ 되쓰기가 안 되는 등급이면 깨끗해 보여도 경고한다', () => {
    // 다운로드로만 저장되는데 내려받기를 안 했으면 작업이 통째로 사라진다
    expect(shouldWarnOnUnload(false, true)).toBe(true)
  })
})

describe('두 탭 잠금 — 같은 파일을 두 곳에서 고치면 한쪽이 사라진다', () => {
  function fakeLocks(taken = new Set<string>()): LockManager {
    return {
      async request(name: string, options: unknown, cb: (lock: unknown) => Promise<boolean>) {
        const opts = options as { ifAvailable?: boolean }
        if (taken.has(name) && opts.ifAvailable) return cb(null)
        taken.add(name)
        return cb({ name })
      },
    } as unknown as LockManager
  }

  it('처음 여는 탭은 잠금을 잡는다', async () => {
    const lock = await acquireTabLock('a.etp', fakeLocks())
    expect(lock.acquired).toBe(true)
    lock.release()
  })

  it('★ 두 번째 탭은 못 잡는다 → 읽기 전용으로 열려야 한다', async () => {
    const taken = new Set<string>()
    const first = await acquireTabLock('a.etp', fakeLocks(taken))
    expect(first.acquired).toBe(true)
    const second = await acquireTabLock('a.etp', fakeLocks(taken))
    expect(second.acquired).toBe(false)
    first.release()
  })

  it('Web Locks 가 없으면 막지 않는다 — 쓸 수 있는 브라우저를 못 쓰게 하면 안 된다', async () => {
    const lock = await acquireTabLock('a.etp', undefined)
    expect(lock.acquired).toBe(true)
  })

  it('다른 파일은 서로 막지 않는다', async () => {
    const taken = new Set<string>()
    const a = await acquireTabLock('a.etp', fakeLocks(taken))
    const b = await acquireTabLock('b.etp', fakeLocks(taken))
    expect(a.acquired && b.acquired).toBe(true)
  })
})

describe('★ 마이그레이션 백업이 자동 저장에 살아남는가', () => {
  function dirWith(files: Map<string, string>): Directory {
    const entry = (name: string): FileEntry => ({
      name,
      async createWritable() {
        let buf = ''
        return {
          async write(d: Uint8Array) {
            buf = new TextDecoder().decode(d)
          },
          async close() {
            files.set(name, buf)
          },
        }
      },
      async read() {
        return new TextEncoder().encode(files.get(name) ?? '')
      },
      async remove() {
        files.delete(name)
      },
      async rename(next) {
        const v = files.get(name)
        if (v === undefined) throw new Error('not found')
        files.delete(name)
        files.set(next, v)
      },
    })
    return {
      getFile: async (n) => entry(n),
      removeFile: async (n) => void files.delete(n),
      has: async (n) => files.has(n),
    }
  }

  it('자동 저장을 10회 해도 `<name>.v<N>.bak` 이 살아 있다', async () => {
    const files = new Map<string, string>([
      ['a.etp', 'v2로 올린 내용'],
      [migrationBackupName('a.etp', 1), '올리기 전 원본'],
    ])
    const dir = dirWith(files)

    for (let i = 0; i < 10; i += 1) {
      await saveAtomic(dir, 'a.etp', new TextEncoder().encode(`저장 ${i}`))
    }

    // 매 저장의 백업은 직전 내용으로 계속 덮인다
    expect(files.get('a.etp.bak')).toBe('저장 8')
    // 마이그레이션 백업은 **그대로다** — 섞였다면 첫 저장에서 사라졌을 것이다
    expect(files.get('a.v1.bak')).toBe('올리기 전 원본')
  })
})
