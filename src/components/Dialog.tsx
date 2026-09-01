/** 공통 다이얼로그 — SS§1.6.
 *  «포커스 트랩. 닫으면 열기 전 요소로 포커스 복귀.»
 *  D-01~D-08 이 전부 이것 하나를 쓴다 (SS부록A «한 번 만들고 여러 화면에서»). */
import { useCallback, useEffect, useId, useRef } from 'react'
import { strings } from '@/app/strings'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  open: boolean
  title: string
  /** SS§1.7 — 무엇이·왜·다음에 무엇을 */
  children: React.ReactNode
  footer?: React.ReactNode
  /** `Esc`·바깥 클릭으로 닫을 수 있는가. 취소가 없는 다이얼로그(D-03)는 false */
  dismissable?: boolean
  onClose(): void
  /** 경고성이면 `alertdialog` — 스크린리더가 즉시 읽는다 */
  role?: 'dialog' | 'alertdialog'
}

export function Dialog({
  open,
  title,
  children,
  footer,
  dismissable = true,
  onClose,
  role = 'dialog',
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // 열기 직전의 포커스를 기억한다 — 닫을 때 여기로 돌려보낸다
  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? ref.current)?.focus()
    return () => {
      restoreTo.current?.focus()
    }
  }, [open])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      // 포커스 트랩 — 목록의 양 끝에서 순환시킨다
      const nodes = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      if (nodes.length === 0) {
        e.preventDefault()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [dismissable, onClose],
  )

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--color-neutral-900) 34%, transparent)',
      }}
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          width: 'var(--size-dialog)',
          maxWidth: 'calc(100vw - var(--space-8))',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-6)',
        }}
      >
        <h2 id={titleId} style={{ fontSize: 20 }}>
          {title}
        </h2>
        <div>{children}</div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            justifyContent: 'flex-end',
            marginTop: 'var(--space-4)',
          }}
        >
          {footer ?? (
            <button type="button" onClick={onClose}>
              {strings.dialog.close}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
