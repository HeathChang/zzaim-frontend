/** 드래그 중 가장자리 자동 스크롤 (SS§6.4).
 *
 *  ★ 계산은 `dnd.ts` 가 이미 갖고 있었는데 **부르는 곳이 없었다.**
 *  그래서 화면 밖에 있는 자리로는 문항을 끌어다 놓을 수 없었다 —
 *  24문항짜리 시험지면 대부분의 이동이 그렇다.
 *
 *  `requestAnimationFrame` 으로 돈다. 프레임 간격을 실제로 재서 곱하므로
 *  «초당 600px» 이 화면 주사율과 무관하게 지켜진다. */
import { useEffect, useRef } from 'react'
import { autoScrollSpeed } from '@/screens/S04Paper/dnd'

export function useAutoScroll(active: boolean, target: React.RefObject<HTMLElement | null>) {
  const pointerY = useRef(0)

  useEffect(() => {
    if (!active) return
    const el = target.current
    if (!el) return

    const onMove = (e: DragEvent | PointerEvent) => {
      pointerY.current = e.clientY
    }
    // ⚠ `dragover` 로 받는다. 드래그 중에는 `pointermove` 가 오지 않는다
    window.addEventListener('dragover', onMove)
    window.addEventListener('pointermove', onMove)

    let raf = 0
    let last = 0
    const step = (now: number) => {
      const dt = last === 0 ? 0 : (now - last) / 1000
      last = now
      const speed = autoScrollSpeed(pointerY.current, el.getBoundingClientRect())
      if (speed !== 0 && dt > 0) el.scrollTop += speed * dt
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('dragover', onMove)
      window.removeEventListener('pointermove', onMove)
    }
  }, [active, target])
}
