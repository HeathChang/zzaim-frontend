/** S-07 잠금 화면 — SS§9.
 *
 *  «화면 전체를 덮는다. 뒤가 비쳐서는 안 된다.» 시험 문항이 보이면 잠근 의미가 없다.
 *
 *  잠금 중에도 **자동 저장은 계속된다.** 저장이 실패했다면 해제할 때 그 사실을
 *  알려야 한다 — 모르고 자리를 뜨면 작업을 잃는다 (SS§9.4). */
import { useEffect, useRef } from 'react'
import { strings } from '@/app/strings'

export interface S07LockProps {
  open: boolean
  /** 잠긴 이유 — 문구가 다르다 */
  reason: 'idle' | 'manual' | 'hidden'
  /** 잠금 중 저장이 실패했는가 */
  saveFailed?: boolean
  onUnlock(): void
}

export function S07Lock({ open, reason, saveFailed = false, onUnlock }: S07LockProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) buttonRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={strings.lock.title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        // 불투명해야 한다. 반투명이면 문항이 비친다
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ fontSize: 40 }} aria-hidden>
        🔒
      </div>
      <h1>{strings.lock.title}</h1>
      <p>{reason === 'manual' ? strings.lock.manual : strings.lock.idle}</p>
      <button type="button" ref={buttonRef} onClick={onUnlock}>
        {strings.lock.unlock}
      </button>
      <p style={{ color: 'var(--color-neutral-700)' }}>
        {saveFailed ? strings.lock.saveFailed : strings.lock.saved}
      </p>
    </div>
  )
}
