/** 자동 저장 — **캐시에 자주, 파일에 가끔.**
 *
 *  기준: 캐시는 변경 후 2초 디바운스, 파일은 5초 유휴 또는 `Cmd/Ctrl+S` (SS§1.4).
 *  ⚠ 이 숫자들에는 실측 근거가 없다 — 관례값이다 (UD-06). 실사용 후 조정한다.
 *
 *  **크래시 시 최대 손실 10초**가 요구다 (PP§10). 캐시 2초면 그 안에 든다. */

export interface AutosaveOptions {
  /** 캐시에 쓰기까지 기다리는 시간(ms) */
  cacheDebounceMs?: number
  /** 파일에 쓰기까지 손을 놓아야 하는 시간(ms) */
  fileIdleMs?: number
  saveToCache(): Promise<void>
  saveToFile(): Promise<void>
  onError?(stage: 'cache' | 'file', error: unknown): void
  /** 테스트가 시각을 잡을 수 있게 주입한다 */
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
}

export interface Autosave {
  /** 문서가 바뀔 때마다 부른다 */
  touch(): void
  /** `Cmd/Ctrl+S` — 기다리지 않고 지금 저장한다 */
  flush(): Promise<void>
  /** 저장하지 않은 변경이 있는가 — 이탈 경고가 이 값을 본다 */
  isDirty(): boolean
  dispose(): void
}

export function createAutosave(options: AutosaveOptions): Autosave {
  const {
    cacheDebounceMs = 2000,
    fileIdleMs = 5000,
    saveToCache,
    saveToFile,
    onError,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
  } = options

  let cacheTimer: ReturnType<typeof setTimeout> | null = null
  let fileTimer: ReturnType<typeof setTimeout> | null = null
  let dirty = false
  /** 저장이 도는 중에 또 바뀌었는가 — 그러면 끝나고 한 번 더 돌아야 한다 */
  let pendingWhileSaving = false
  let saving = false

  const clear = (t: ReturnType<typeof setTimeout> | null) => {
    if (t) clearTimeoutFn(t)
  }

  const runFileSave = async (): Promise<void> => {
    if (saving) {
      // 저장이 겹치면 **파일이 반쯤 쓰인 상태로 두 번 열린다.** 줄 세운다
      pendingWhileSaving = true
      return
    }
    saving = true
    try {
      await saveToFile()
      dirty = false
    } catch (err) {
      // 저장 실패는 **작업을 막지 않는다** — 편집을 계속할 수 있어야 한다 (SS§6.6)
      onError?.('file', err)
    } finally {
      saving = false
      if (pendingWhileSaving) {
        pendingWhileSaving = false
        void runFileSave()
      }
    }
  }

  return {
    touch() {
      dirty = true
      clear(cacheTimer)
      clear(fileTimer)
      cacheTimer = setTimeoutFn(() => {
        void saveToCache().catch((err: unknown) => onError?.('cache', err))
      }, cacheDebounceMs)
      fileTimer = setTimeoutFn(() => void runFileSave(), fileIdleMs)
    },
    async flush() {
      clear(cacheTimer)
      clear(fileTimer)
      cacheTimer = null
      fileTimer = null
      await saveToCache().catch((err: unknown) => onError?.('cache', err))
      await runFileSave()
    },
    isDirty: () => dirty,
    dispose() {
      clear(cacheTimer)
      clear(fileTimer)
      cacheTimer = null
      fileTimer = null
    },
  }
}
