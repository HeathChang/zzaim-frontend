/** 자동 잠금 타이머 — «어깨 너머»를 막는다 (PP§5.4 · SS§9).
 *
 *  출제 중인 시험 문항이 유출되면 시험 재실시와 교사 징계로 이어진다.
 *  교무실 공용 PC 에서 작업하다 자리를 비우는 상황이 그대로 위험이다.
 *
 *  기준(SS§9.1): 15분 미조작 · 🔒 모드면 5분 · 탭 비활성 30분. */

export const IDLE_MS = 15 * 60 * 1000
export const IDLE_MS_PUBLIC = 5 * 60 * 1000
export const HIDDEN_MS = 30 * 60 * 1000

export interface IdleLockOptions {
  onLock(): void
  isPublicPc(): boolean
  /** 테스트가 시각을 잡을 수 있게 주입한다 */
  setTimeoutFn?: typeof setTimeout
  clearTimeoutFn?: typeof clearTimeout
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  doc?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>
}

const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export function startIdleLock(options: IdleLockOptions): () => void {
  const {
    onLock,
    isPublicPc,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    target = window,
    doc = document,
  } = options

  let timer: ReturnType<typeof setTimeout> | null = null
  let locked = false

  const arm = (ms: number): void => {
    if (timer) clearTimeoutFn(timer)
    timer = setTimeoutFn(() => {
      locked = true
      onLock()
    }, ms)
  }

  const onActivity = (): void => {
    // 이미 잠긴 뒤의 조작은 «해제»가 처리한다. 여기서 타이머를 되살리면
    // 잠금 화면 위에서 마우스를 흔드는 것만으로 잠금이 풀린 것처럼 보인다
    if (locked) return
    arm(isPublicPc() ? IDLE_MS_PUBLIC : IDLE_MS)
  }

  const onVisibility = (): void => {
    if (locked) return
    if (doc.visibilityState === 'hidden') arm(HIDDEN_MS)
    else onActivity()
  }

  for (const type of ACTIVITY) target.addEventListener(type, onActivity, { passive: true })
  doc.addEventListener('visibilitychange', onVisibility)
  onActivity()

  return () => {
    if (timer) clearTimeoutFn(timer)
    for (const type of ACTIVITY) target.removeEventListener(type, onActivity)
    doc.removeEventListener('visibilitychange', onVisibility)
  }
}
