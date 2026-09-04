/** 이탈 경고 — «저장되지 않은 변경이 있는 채로 탭을 닫으면 경고» (PP§5.4 · SS§13.2).
 *
 *  **제한 등급에서는 항상 띄운다.** 되쓰기가 안 되는 상태에서는 «저장됨»이
 *  거짓말이고, 사용자가 내려받기를 안 했으면 작업이 통째로 사라진다.
 *
 *  브라우저는 문구를 무시하고 자기 문구를 쓴다 — 우리가 정할 수 있는 것은
 *  «띄울지 말지»뿐이다. */
import { useEffect } from 'react'

export interface UnloadGuardOptions {
  /** 저장되지 않은 변경이 있는가 */
  isDirty(): boolean
  /** 되쓰기가 불가능한 등급인가 — 그러면 깨끗해 보여도 경고한다 */
  alwaysWarn?: boolean
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>
}

export function shouldWarnOnUnload(dirty: boolean, alwaysWarn: boolean): boolean {
  return dirty || alwaysWarn
}

export function useUnloadGuard({
  isDirty,
  alwaysWarn = false,
  target = window,
}: UnloadGuardOptions): void {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (!shouldWarnOnUnload(isDirty(), alwaysWarn)) return
      // 표준이 요구하는 두 가지를 다 한다 — 브라우저마다 보는 것이 다르다
      e.preventDefault()
      e.returnValue = ''
    }
    target.addEventListener('beforeunload', handler as EventListener)
    return () => target.removeEventListener('beforeunload', handler as EventListener)
  }, [isDirty, alwaysWarn, target])
}
