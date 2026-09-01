/** 확인 다이얼로그 — D-01·D-05·D-06 등이 쓴다.
 *  SS§10 공통 규칙: **파괴적 선택지를 기본 포커스로 두지 않는다.** */
import { useEffect, useRef } from 'react'
import { Dialog } from '@/components/Dialog'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  body: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  /** 확인이 되돌릴 수 없는 조작인가. 참이면 포커스가 취소로 간다 */
  destructive?: boolean
  onConfirm(): void
  onCancel(): void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open && destructive) cancelRef.current?.focus()
  }, [open, destructive])

  return (
    <Dialog
      open={open}
      title={title}
      role={destructive ? 'alertdialog' : 'dialog'}
      onClose={onCancel}
      footer={
        <>
          <button type="button" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {body}
    </Dialog>
  )
}
