/** 가져오기 흐름 — S-00 → S-01 → S-02 를 잇는다 (SS§14).
 *
 *  «오래 머무르면 실패»인 화면이 가운데 있다. 0.3초 미만이면 **건너뛴다** —
 *  깜빡임이 기다림보다 나쁘다 (SS§1.3). */
import { useCallback, useRef, useState } from 'react'
import { asSingleQuestion, importFromClipboard } from '@/importing/clipboard'
import type { ImportResult } from '@/importing/types'
import type { PastePayload } from '@/components/PasteZone'
import { SKIP_BELOW_MS } from '@/screens/S01Importing'

export type ImportPhase =
  | { kind: 'idle' }
  | { kind: 'working'; found: number; progress: number }
  /** 문항을 하나도 못 찾았다 — 빈손으로 돌려보내지 않는다 (SS§3.6) */
  | { kind: 'empty'; result: ImportResult }
  /** 서식 없는 텍스트였다 — 표와 그림이 사라졌다 (SS§2.6) */
  | { kind: 'plain-notice'; result: ImportResult }
  | { kind: 'done'; result: ImportResult }
  | { kind: 'no-clipboard' }

export interface ImportFlow {
  phase: ImportPhase
  paste(payload: PastePayload): void
  /** «그래도 통째로 하나의 문항으로 담기» */
  acceptAsOne(): void
  /** 평문 고지 뒤 «그대로 진행» */
  acceptPlain(): void
  cancel(): void
  reset(): void
}

export function useImportFlow(onDone?: (r: ImportResult) => void): ImportFlow {
  const [phase, setPhase] = useState<ImportPhase>({ kind: 'idle' })
  const cancelled = useRef(false)

  const finish = useCallback(
    (result: ImportResult, startedAt: number) => {
      if (cancelled.current) return
      const elapsed = performance.now() - startedAt
      // 0.3초 미만이면 진행 화면을 아예 보여 주지 않는다
      if (elapsed < SKIP_BELOW_MS) {
        // 이미 계산은 끝났다 — 화면만 건너뛴다
      }
      if (result.segments.length === 0) {
        setPhase({ kind: 'empty', result })
        return
      }
      if (result.plainTextOnly) {
        setPhase({ kind: 'plain-notice', result })
        return
      }
      setPhase({ kind: 'done', result })
      onDone?.(result)
    },
    [onDone],
  )

  const paste = useCallback(
    (payload: PastePayload) => {
      cancelled.current = false
      if (!payload.html && payload.text.trim().length === 0) {
        setPhase({ kind: 'no-clipboard' })
        return
      }
      const startedAt = performance.now()
      setPhase({ kind: 'working', found: 0, progress: 0 })
      // 파싱은 동기다 — 50문항 3초 요구(PP§10) 안에서 충분하다.
      // 비동기로 쪼개는 것은 실측이 그걸 요구할 때 한다
      const result = importFromClipboard(payload)
      finish(result, startedAt)
    },
    [finish],
  )

  return {
    phase,
    paste,
    acceptAsOne: () => {
      if (phase.kind !== 'empty') return
      const result = asSingleQuestion(phase.result)
      setPhase({ kind: 'done', result })
      onDone?.(result)
    },
    acceptPlain: () => {
      if (phase.kind !== 'plain-notice') return
      setPhase({ kind: 'done', result: phase.result })
      onDone?.(phase.result)
    },
    cancel: () => {
      cancelled.current = true
      setPhase({ kind: 'idle' })
    },
    reset: () => setPhase({ kind: 'idle' }),
  }
}
