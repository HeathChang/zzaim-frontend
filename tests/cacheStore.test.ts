/** 캐시 — **정본이 아니다.** 여기 있는 게 다 사라져도 파일만 있으면 복구된다.
 *  그래서 캐시의 어떤 실패도 작업을 막지 않아야 한다. */
import { describe, expect, it, vi } from 'vitest'
import { createMemoryCache } from '@/storage/cache/cacheStore'
import { createAutosave } from '@/storage/cache/autosave'
import { emptyDocument } from '@/storage/etp/format'

describe('캐시 스냅샷', () => {
  it('넣은 것이 그대로 나온다', async () => {
    const c = createMemoryCache()
    await c.put({ fileKey: 'a.etp', updatedAt: 10, fileUpdatedAt: 5, doc: emptyDocument(5) })
    const got = await c.get('a.etp')
    expect(got?.updatedAt).toBe(10)
    expect(got?.fileUpdatedAt).toBe(5)
  })

  it('모르는 파일은 null', async () => {
    expect(await createMemoryCache().get('없음')).toBeNull()
  })

  it('★ 공용 PC 정리는 한 건도 남기지 않는다', async () => {
    const c = createMemoryCache()
    await c.put({ fileKey: 'a', updatedAt: 1, fileUpdatedAt: 1, doc: emptyDocument(1) })
    await c.put({ fileKey: 'b', updatedAt: 1, fileUpdatedAt: 1, doc: emptyDocument(1) })
    await c.wipe()
    expect(await c.get('a')).toBeNull()
    expect(await c.get('b')).toBeNull()
  })

  it('두 시각을 따로 들고 있다 — 외부 변경 감지의 기준이 다르다', async () => {
    const c = createMemoryCache()
    await c.put({ fileKey: 'a', updatedAt: 900, fileUpdatedAt: 100, doc: emptyDocument(100) })
    const got = await c.get('a')
    // updatedAt = 내 작업이 얼마나 새로운가 / fileUpdatedAt = 파일이 언제 것이었나
    expect(got?.updatedAt).toBeGreaterThan(got?.fileUpdatedAt ?? 0)
  })
})

describe('★ 캐시가 죽어도 작업은 계속된다 — 정본은 파일이다', () => {
  it('캐시 쓰기가 실패해도 파일 저장은 돈다', async () => {
    vi.useFakeTimers()
    const saveToFile = vi.fn().mockResolvedValue(undefined)
    const onError = vi.fn()
    const a = createAutosave({
      saveToCache: vi.fn().mockRejectedValue(new Error('IndexedDB 차단')),
      saveToFile,
      onError,
    })
    a.touch()
    await vi.advanceTimersByTimeAsync(6000)
    expect(onError).toHaveBeenCalledWith('cache', expect.any(Error))
    expect(saveToFile).toHaveBeenCalledOnce()
    a.dispose()
    vi.useRealTimers()
  })
})
