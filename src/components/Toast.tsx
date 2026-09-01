/** 토스트 — SS§1.3 «성공: 토스트 3초. 되돌릴 수 있으면 되돌리기 버튼 동봉».
 *  되돌리기가 붙으면 6초를 준다 (SS부록D) — 3초는 읽고 누르기에 짧다. */
import { useEffect, useRef, useState, useCallback } from 'react'
import { strings } from '@/app/strings'

const PLAIN_MS = 3000
const WITH_UNDO_MS = 6000

export interface ToastItem {
  id: string
  message: string
  onUndo?: () => void
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
    setItems((list) => list.filter((i) => i.id !== id))
  }, [])

  const show = useCallback(
    (item: ToastItem) => {
      setItems((list) => [...list, item])
      const ms = item.onUndo ? WITH_UNDO_MS : PLAIN_MS
      timers.current.set(
        item.id,
        setTimeout(() => dismiss(item.id), ms),
      )
    },
    [dismiss],
  )

  // 언마운트 시 타이머를 전부 정리한다 — 안 하면 사라진 컴포넌트에 setState 한다
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach(clearTimeout)
      map.clear()
    }
  }, [])

  return { items, show, dismiss }
}

export function ToastHost({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss(id: string): void
}) {
  return (
    <div
      // 조작 결과를 읽어 준다 (SS§1.6). 끼어들지 않게 polite
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        zIndex: 60,
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            background: 'var(--color-neutral-900)',
            color: 'var(--color-neutral-100)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-4)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <span>{t.message}</span>
          {t.onUndo && (
            <button
              type="button"
              onClick={() => {
                t.onUndo?.()
                onDismiss(t.id)
              }}
            >
              {strings.toast.undo}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
