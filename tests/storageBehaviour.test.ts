/** 충돌·자동저장·공용PC·잠금 — «사고가 났을 때 어떻게 되는가»가 zz-1 의 대부분이다. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decideConflict } from '@/storage/conflict'
import { createAutosave } from '@/storage/cache/autosave'
import { isMarked, markForWipe, unmark, wipeIfMarked, type FlagStore } from '@/storage/publicPc'
import { startIdleLock, IDLE_MS, IDLE_MS_PUBLIC, HIDDEN_MS } from '@/app/idleLock'
import { migrationBackupName, rollingBackupName } from '@/storage/etp/migrate'
import { QUOTA_WARN_RATIO, readStorageStatus, requestPersistence } from '@/storage/persist'

describe('파일과 캐시 중 어느 쪽이 새로운가 — **자동 병합하지 않는다**', () => {
  it('처음 여는 파일은 그냥 연다', () => {
    expect(decideConflict({ fileUpdatedAt: 100, knownAt: null, cacheUpdatedAt: null }).kind).toBe(
      'open',
    )
  })

  it('파일이 다른 곳에서 바뀌었으면 D-02', () => {
    const d = decideConflict({ fileUpdatedAt: 200, knownAt: 100, cacheUpdatedAt: null })
    expect(d.kind).toBe('file-changed')
  })

  it('캐시가 파일보다 새로우면 D-03 복구', () => {
    const d = decideConflict({ fileUpdatedAt: 100, knownAt: 100, cacheUpdatedAt: 150 })
    expect(d.kind).toBe('cache-newer')
  })

  it('★ 둘 다 해당되면 **파일 외부 변경을 먼저 묻는다**', () => {
    // 복구를 먼저 물으면, 사용자가 복구를 고른 뒤에야 파일이 바뀐 걸 알게 되고
    // 방금 고른 복구본을 버려야 한다
    const d = decideConflict({ fileUpdatedAt: 300, knownAt: 100, cacheUpdatedAt: 500 })
    expect(d.kind).toBe('file-changed')
  })

  it('시각이 같으면 그냥 연다', () => {
    expect(decideConflict({ fileUpdatedAt: 100, knownAt: 100, cacheUpdatedAt: 100 }).kind).toBe(
      'open',
    )
  })
})

describe('자동 저장 — 캐시에 자주, 파일에 가끔', () => {
  beforeEach(() => vi.useFakeTimers())

  it('2초 뒤 캐시, 5초 뒤 파일', async () => {
    const saveToCache = vi.fn().mockResolvedValue(undefined)
    const saveToFile = vi.fn().mockResolvedValue(undefined)
    const a = createAutosave({ saveToCache, saveToFile })
    a.touch()

    await vi.advanceTimersByTimeAsync(2000)
    expect(saveToCache).toHaveBeenCalledOnce()
    expect(saveToFile).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(3000)
    expect(saveToFile).toHaveBeenCalledOnce()
    a.dispose()
  })

  it('계속 고치면 타이머가 미뤄진다 — 타이핑 중에 파일을 쓰지 않는다', async () => {
    const saveToFile = vi.fn().mockResolvedValue(undefined)
    const a = createAutosave({ saveToCache: vi.fn().mockResolvedValue(undefined), saveToFile })
    for (let i = 0; i < 5; i += 1) {
      a.touch()
      await vi.advanceTimersByTimeAsync(4000)
    }
    expect(saveToFile).not.toHaveBeenCalled()
    a.dispose()
  })

  it('Cmd+S 는 기다리지 않는다', async () => {
    const saveToFile = vi.fn().mockResolvedValue(undefined)
    const a = createAutosave({ saveToCache: vi.fn().mockResolvedValue(undefined), saveToFile })
    a.touch()
    await a.flush()
    expect(saveToFile).toHaveBeenCalledOnce()
    expect(a.isDirty()).toBe(false)
    a.dispose()
  })

  it('★ 저장 실패는 작업을 막지 않는다 — 알리기만 한다', async () => {
    const onError = vi.fn()
    const a = createAutosave({
      saveToCache: vi.fn().mockResolvedValue(undefined),
      saveToFile: vi.fn().mockRejectedValue(new Error('디스크 가득')),
      onError,
    })
    a.touch()
    await vi.advanceTimersByTimeAsync(6000)
    expect(onError).toHaveBeenCalledWith('file', expect.any(Error))
    // 실패했으므로 아직 «저장되지 않음» 이어야 한다 — 이탈 경고가 이 값을 본다
    expect(a.isDirty()).toBe(true)
    a.dispose()
  })

  it('저장이 겹치면 줄 세운다 — 파일을 두 번 동시에 열면 반쯤 쓰인다', async () => {
    const pending: { resolve: () => void } = { resolve: () => undefined }
    const saveToFile = vi.fn().mockImplementation(
      () =>
        new Promise<void>((r) => {
          pending.resolve = r
        }),
    )
    const a = createAutosave({ saveToCache: vi.fn().mockResolvedValue(undefined), saveToFile })
    a.touch()
    await vi.advanceTimersByTimeAsync(5000)
    expect(saveToFile).toHaveBeenCalledTimes(1)

    a.touch()
    await vi.advanceTimersByTimeAsync(5000)
    // 아직 첫 저장이 안 끝났다 — 두 번째는 기다려야 한다
    expect(saveToFile).toHaveBeenCalledTimes(1)

    pending.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(saveToFile).toHaveBeenCalledTimes(2)
    a.dispose()
  })

  it('dispose 하면 예약된 저장이 돌지 않는다', async () => {
    const saveToFile = vi.fn().mockResolvedValue(undefined)
    const a = createAutosave({ saveToCache: vi.fn().mockResolvedValue(undefined), saveToFile })
    a.touch()
    a.dispose()
    await vi.advanceTimersByTimeAsync(10000)
    expect(saveToFile).not.toHaveBeenCalled()
  })
})

describe('공용 PC — «다음에 열 때» 지운다', () => {
  function memoryStore(): FlagStore {
    const m = new Map<string, string>()
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => void m.set(k, v),
      removeItem: (k) => void m.delete(k),
    }
  }

  it('켜면 표시가 남는다', () => {
    const s = memoryStore()
    markForWipe(s)
    expect(isMarked(s)).toBe(true)
  })

  it('★ 표시가 있으면 다음 부팅에 지운다 — `unload` 삭제는 보장되지 않는다', async () => {
    const s = memoryStore()
    const wipe = vi.fn().mockResolvedValue(undefined)
    markForWipe(s)
    expect(await wipeIfMarked(wipe, s)).toBe(true)
    expect(wipe).toHaveBeenCalledOnce()
    // 한 번 지웠으면 표시를 거둔다 — 안 그러면 매번 지운다
    expect(isMarked(s)).toBe(false)
  })

  it('표시가 없으면 지우지 않는다', async () => {
    const s = memoryStore()
    const wipe = vi.fn().mockResolvedValue(undefined)
    expect(await wipeIfMarked(wipe, s)).toBe(false)
    expect(wipe).not.toHaveBeenCalled()
  })

  it('끄면 표시가 사라진다', () => {
    const s = memoryStore()
    markForWipe(s)
    unmark(s)
    expect(isMarked(s)).toBe(false)
  })
})

describe('자동 잠금', () => {
  beforeEach(() => vi.useFakeTimers())

  function harness(isPublic = false) {
    const onLock = vi.fn()
    const listeners = new Map<string, EventListener>()
    const target = {
      addEventListener: (t: string, fn: EventListener) => void listeners.set(t, fn),
      removeEventListener: (t: string) => void listeners.delete(t),
    }
    const docListeners = new Map<string, EventListener>()
    const doc = {
      addEventListener: (t: string, fn: EventListener) => void docListeners.set(t, fn),
      removeEventListener: (t: string) => void docListeners.delete(t),
      visibilityState: 'visible' as DocumentVisibilityState,
    }
    const stop = startIdleLock({
      onLock,
      isPublicPc: () => isPublic,
      target: target as unknown as Window,
      doc: doc as unknown as Document,
    })
    return { onLock, listeners, docListeners, doc, stop }
  }

  it('15분 손을 놓으면 잠긴다', () => {
    const h = harness()
    vi.advanceTimersByTime(IDLE_MS)
    expect(h.onLock).toHaveBeenCalledOnce()
    h.stop()
  })

  it('공용 PC 모드에서는 5분이다', () => {
    const h = harness(true)
    vi.advanceTimersByTime(IDLE_MS_PUBLIC)
    expect(h.onLock).toHaveBeenCalledOnce()
    h.stop()
  })

  it('조작하면 타이머가 되살아난다', () => {
    const h = harness()
    vi.advanceTimersByTime(IDLE_MS - 1000)
    h.listeners.get('keydown')?.(new Event('keydown'))
    vi.advanceTimersByTime(IDLE_MS - 1000)
    expect(h.onLock).not.toHaveBeenCalled()
    h.stop()
  })

  it('★ 잠긴 뒤의 조작으로는 타이머가 되살아나지 않는다 — 마우스만 흔들어 풀리면 안 된다', () => {
    const h = harness()
    vi.advanceTimersByTime(IDLE_MS)
    h.listeners.get('pointerdown')?.(new Event('pointerdown'))
    vi.advanceTimersByTime(IDLE_MS)
    expect(h.onLock).toHaveBeenCalledOnce()
    h.stop()
  })

  it('탭이 숨겨지면 30분으로 바뀐다', () => {
    const h = harness()
    h.doc.visibilityState = 'hidden'
    h.docListeners.get('visibilitychange')?.(new Event('visibilitychange'))
    vi.advanceTimersByTime(IDLE_MS)
    expect(h.onLock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(HIDDEN_MS - IDLE_MS)
    expect(h.onLock).toHaveBeenCalledOnce()
    h.stop()
  })

  it('멈추면 더 이상 잠기지 않는다', () => {
    const h = harness()
    h.stop()
    vi.advanceTimersByTime(IDLE_MS * 2)
    expect(h.onLock).not.toHaveBeenCalled()
  })
})

describe('백업 이름공간 — 섞이면 롤백 수단이 사라진다', () => {
  it('매 저장 백업과 마이그레이션 백업이 다른 이름이다', () => {
    expect(rollingBackupName('시험지.etp')).toBe('시험지.etp.bak')
    expect(migrationBackupName('시험지.etp', 1)).toBe('시험지.v1.bak')
  })

  it('★ 자동 저장을 아무리 반복해도 마이그레이션 백업을 덮지 않는다', () => {
    const rolling = rollingBackupName('a.etp')
    for (const v of [1, 2, 3]) {
      expect(migrationBackupName('a.etp', v)).not.toBe(rolling)
    }
  })
})

describe('저장소 권한·용량', () => {
  it('persist 가 없으면 조용히 false — 잃는 것이 없다, 정본은 파일이다', async () => {
    expect(await requestPersistence(undefined)).toBe(false)
  })

  it('예외가 나도 던지지 않는다', async () => {
    const storage = { persist: () => Promise.reject(new Error('no')) } as unknown as StorageManager
    expect(await requestPersistence(storage)).toBe(false)
  })

  it('80% 를 넘으면 경고한다', async () => {
    const storage = {
      estimate: () => Promise.resolve({ usage: 85, quota: 100 }),
      persisted: () => Promise.resolve(true),
    } as unknown as StorageManager
    const s = await readStorageStatus(storage)
    expect(s.ratio).toBeCloseTo(0.85)
    expect(s.shouldWarn).toBe(true)
    expect(QUOTA_WARN_RATIO).toBe(0.8)
  })

  it('여유가 있으면 경고하지 않는다', async () => {
    const storage = {
      estimate: () => Promise.resolve({ usage: 10, quota: 100 }),
      persisted: () => Promise.resolve(false),
    } as unknown as StorageManager
    expect((await readStorageStatus(storage)).shouldWarn).toBe(false)
  })
})
