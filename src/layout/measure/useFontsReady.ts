/** 폰트 게이트 — **폰트 로드 전에는 지면을 그리지 않는다** (zz-2 불변3 · HO§measure).
 *
 *  이걸 빼면 폰트 교체 순간 조판이 전부 밀린다. 그리고 밀린 줄도 모른다 —
 *  화면은 멀쩡해 보이고 인쇄물만 다르다.
 *
 *  두 가지를 기다린다:
 *  1. `document.fonts.ready` — 선언된 폰트가 실제로 로드됐는가
 *  2. **서브셋 밖 글자 폴백** — 고전 한자가 든 시험지면 전체본까지 (zz-0 D7) */
import { useEffect, useState } from 'react'
import { checkCriticalFonts } from '@/app/fontGuard'

export type FontGateState =
  | { status: 'loading' }
  | { status: 'ready' }
  /** 폰트를 못 받았다. **지면을 그리면 안 된다** */
  | { status: 'missing'; families: string[] }

export interface FontGateOptions {
  /** 이 지면에 실제로 쓰이는 글자 전체. 서브셋 밖 글자를 찾는 데 쓴다 */
  text?: string
  /** 서브셋 밖 글자를 만났을 때 전체본을 받는 함수 (zz-0 `fontFallback`) */
  ensureFor?: (text: string) => Promise<boolean>
}

export function useFontGate({ text, ensureFor }: FontGateOptions = {}): FontGateState {
  const [state, setState] = useState<FontGateState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      const result = await checkCriticalFonts()
      if (!alive) return
      if (!result.ready) {
        setState({ status: 'missing', families: result.missing })
        return
      }
      // 서브셋 밖 글자가 있으면 전체본을 받을 때까지 계속 loading 이다
      if (text && ensureFor) {
        await ensureFor(text)
        if (!alive) return
      }
      setState({ status: 'ready' })
    }
    setState({ status: 'loading' })
    void run().catch(() => {
      // 확인 자체가 실패하면 «없음»으로 둔다 — 모르는 채 그리는 것보다 낫다
      if (alive) setState({ status: 'missing', families: [] })
    })
    return () => {
      alive = false
    }
  }, [text, ensureFor])

  return state
}
