/** 전역 붙여넣기 — SS§2.5 «전역 `Ctrl+V`».
 *
 *  붙여넣기 영역에 포커스가 없어도 받아야 한다. 교사가 «어디에 붙여야 하지»를
 *  고민하는 순간 3분 목표가 깨진다 (PP§7.4).
 *
 *  입력칸에 포커스가 있을 때는 **가로채지 않는다** — 검색창에 붙여넣는 것을
 *  문항 가져오기로 오해하면 안 된다. */
import { useEffect } from 'react'
import { isTextEntry } from '@/app/shortcuts'
import { readPaste, type PastePayload } from '@/components/PasteZone'

export function useGlobalPaste(onPaste: (p: PastePayload) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: ClipboardEvent) => {
      if (isTextEntry(e.target)) return
      if (!e.clipboardData) return
      e.preventDefault()
      onPaste(readPaste(e.clipboardData))
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [onPaste, enabled])
}
