/** SS§1.6 — «다이얼로그는 포커스 트랩. 닫으면 열기 전 요소로 포커스 복귀.» */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { Dialog } from '@/components/Dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'

function Harness({ dismissable = true }: { dismissable?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        opener
      </button>
      <Dialog
        open={open}
        title="title"
        dismissable={dismissable}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button">first</button>
            <button type="button">last</button>
          </>
        }
      >
        body
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('열면 안쪽 첫 포커스 대상으로 간다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('opener'))
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('닫으면 열기 전 요소로 포커스가 돌아온다', () => {
    render(<Harness />)
    const opener = screen.getByText('opener')
    // jsdom 의 click 은 실제 브라우저와 달리 포커스를 옮기지 않는다 — 직접 준다
    opener.focus()
    fireEvent.click(opener)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(document.activeElement).toBe(opener)
  })

  it('Tab 이 마지막에서 처음으로 순환한다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('opener'))
    screen.getByText('last').focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('Shift+Tab 이 처음에서 마지막으로 순환한다', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('opener'))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByText('last'))
  })

  it('취소가 없는 다이얼로그는 Esc 로 닫히지 않는다 (D-03)', () => {
    render(<Harness dismissable={false} />)
    fireEvent.click(screen.getByText('opener'))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('ConfirmDialog', () => {
  it('되돌릴 수 없는 조작이면 포커스가 취소에 놓인다 — 파괴적 선택지를 기본으로 두지 않는다', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="delete"
        cancelLabel="cancel"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(document.activeElement).toBe(screen.getByText('cancel'))
  })

  it('경고성이면 alertdialog 로 읽힌다', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        body="b"
        confirmLabel="ok"
        cancelLabel="cancel"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })
})
