/** 파일과 캐시가 어긋났을 때. **자동으로 합치지 않는다** (PP§9.2 · SS§10).
 *
 *  시험 문항을 잘못 합치면 교사가 눈치채기 전에 **틀린 시험지가 나간다.**
 *  그래서 «어느 쪽이 새로운가»만 판정하고 결정은 사람에게 넘긴다. */

export type ConflictDecision =
  /** 그대로 연다 */
  | { kind: 'open' }
  /** 파일이 다른 곳에서 바뀌었다 → D-02. 기본은 «파일 내용 쓰기» */
  | { kind: 'file-changed'; fileUpdatedAt: number; knownAt: number }
  /** 캐시가 파일보다 새롭다 (크래시 후) → D-03 «복구» */
  | { kind: 'cache-newer'; cacheUpdatedAt: number; fileUpdatedAt: number }

export interface ConflictInput {
  /** 파일 안 `manifest.updatedAt` */
  fileUpdatedAt: number
  /** 이 앱이 «마지막으로 알던» 파일의 시각. 처음 여는 파일이면 null */
  knownAt: number | null
  /** 캐시에 남아 있는 작업의 시각. 없으면 null */
  cacheUpdatedAt: number | null
}

/** 우선순위: **파일 외부 변경이 먼저다.**
 *
 *  둘 다 해당될 수 있다(다른 PC 에서도 고쳤고 여기서도 크래시했다). 그때
 *  «복구»를 먼저 물으면 사용자가 복구를 고른 뒤에야 파일이 바뀐 걸 알게 된다 —
 *  순서를 뒤집으면 방금 고른 복구본을 버려야 한다. */
export function decideConflict(input: ConflictInput): ConflictDecision {
  const { fileUpdatedAt, knownAt, cacheUpdatedAt } = input

  if (knownAt !== null && fileUpdatedAt > knownAt) {
    return { kind: 'file-changed', fileUpdatedAt, knownAt }
  }
  if (cacheUpdatedAt !== null && cacheUpdatedAt > fileUpdatedAt) {
    return { kind: 'cache-newer', cacheUpdatedAt, fileUpdatedAt }
  }
  return { kind: 'open' }
}

/** 같은 파일을 두 탭에서 여는 것을 막는다 (PP§9.2).
 *
 *  Web Locks 는 잠금을 **콜백이 사는 동안** 유지한다. 그래서 «영원히 끝나지 않는
 *  약속»을 잡아 두고, 해제 함수를 돌려준다. */
export interface TabLock {
  acquired: boolean
  release(): void
}

export async function acquireTabLock(
  fileKey: string,
  locks: LockManager | undefined = navigator.locks,
): Promise<TabLock> {
  // Web Locks 가 없으면 잠그지 못한다. **막지 않고 통과시킨다** —
  // 여기서 진입을 막으면 쓸 수 있는 브라우저에서도 못 쓰게 된다.
  if (!locks) return { acquired: true, release: () => undefined }

  let release = (): void => undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })

  // ⚠ **`locks.request()` 를 await 하면 안 된다.**
  // 그 약속은 콜백이 끝나야 풀리는데, 우리는 콜백 안에서 잠금을 **붙들고 있어야**
  // 한다. await 하면 «잠금을 잡았다»를 영원히 못 듣고 파일 열기가 멈춘다.
  // 그래서 «잡았다»는 별도 신호로 받는다.
  let signal: (ok: boolean) => void = () => undefined
  const acquired = new Promise<boolean>((resolve) => {
    signal = resolve
  })

  void locks
    .request(`zzaim:file:${fileKey}`, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        signal(false)
        return
      }
      signal(true)
      await held // 여기서 잠금을 붙들고 있는다
    })
    .catch(() => signal(false))

  return { acquired: await acquired, release }
}
