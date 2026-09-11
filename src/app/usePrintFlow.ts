/** 인쇄 흐름의 상태 (zz-6 D4 · D5).
 *
 *  **왜 «인쇄 중»이 별도 단계인가.** `window.print()` 는 동기라서, 안내 화면을
 *  닫는 `setState` 와 같은 턴에 부르면 **안내 화면이 DOM 에 남은 채로 인쇄된다.**
 *  단계를 나눠 «닫힌 다음 렌더»가 커밋된 뒤(effect)에 인쇄한다.
 *
 *  «건너뛰기»는 **안내 화면만** 생략한다. 점검은 `tryPrint` 안에서 언제나 돈다. */
import { useCallback, useState } from 'react'
import type { PreflightInput } from '@/print/preflight'
import { isBlocked, preflight } from '@/print/preflight'

const SKIP_KEY = 'zzaim.print.skipGuide'

export interface PrintRequest {
  input: PreflightInput
  /** 지면만 남긴다 — 열린 패널이 있으면 닫는다 */
  focusPaper(): void
  /** 한글 파일로 내보내기에 필요한 것 (zz-9).
   *  **화면만 이 값을 만들 수 있다** — 배치 결과와 본문을 다 아는 곳이 거기다 */
  hwpx?: { build(): Uint8Array; fileName: string; empty: boolean }
}

export type PrintPhase =
  | { kind: 'idle' }
  | { kind: 'guide'; req: PrintRequest }
  /** 인쇄 창을 여는 중. `returnToGuide` 면 인쇄 뒤 **안내 화면으로 돌아온다** —
   *  인쇄가 잘못 나왔을 때 설정을 다시 볼 곳이 있어야 한다 (zz-6 D10) */
  | { kind: 'printing'; req: PrintRequest; returnToGuide: boolean }

function readSkip(store: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return store?.getItem(SKIP_KEY) === '1'
  } catch {
    // 공용 PC 의 저장소 차단 — 건너뛰기를 못 기억할 뿐, 인쇄는 되어야 한다
    return false
  }
}

export function usePrintFlow(store: Storage | null = globalThis.localStorage ?? null) {
  const [phase, setPhase] = useState<PrintPhase>({ kind: 'idle' })
  const [skip, setSkipState] = useState(() => readSkip(store))

  const setSkip = useCallback(
    (next: boolean) => {
      setSkipState(next)
      try {
        store?.setItem(SKIP_KEY, next ? '1' : '0')
      } catch {
        // 기억하지 못해도 이번 인쇄는 진행한다
      }
    },
    [store],
  )

  /** 인쇄 요청. 건너뛰기여도 **막을 사유가 있으면 안내를 연다** — 조용히
   *  인쇄하지 않는 것이 점검의 존재 이유다 */
  const request = useCallback(
    (req: PrintRequest) => {
      req.focusPaper()
      const blocked = isBlocked(preflight(req.input))
      // 건너뛰기여도 막을 사유가 있으면 안내를 연다
      if (skip && !blocked) setPhase({ kind: 'printing', req, returnToGuide: false })
      else setPhase({ kind: 'guide', req })
    },
    [skip],
  )

  const confirm = useCallback(() => {
    setPhase((p) => (p.kind === 'guide' ? { kind: 'printing', req: p.req, returnToGuide: true } : p))
  }, [])

  const cancel = useCallback(() => setPhase({ kind: 'idle' }), [])

  /** 인쇄 창을 연 뒤. **안내를 보고 왔으면 그 화면으로 돌아간다** (D10 상태 4) */
  const done = useCallback(() => {
    setPhase((p) =>
      p.kind === 'printing' && p.returnToGuide ? { kind: 'guide', req: p.req } : { kind: 'idle' },
    )
  }, [])

  /** 헤더의 «인쇄 안내 다시 보기» — 건너뛰기를 끈다 */
  const showGuideAgain = useCallback(() => setSkip(false), [setSkip])

  return { phase, skip, setSkip, request, confirm, cancel, done, showGuideAgain }
}
