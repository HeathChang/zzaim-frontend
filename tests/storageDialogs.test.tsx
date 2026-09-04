/** SS§10 다이얼로그 — 문구가 아니라 **동작 규칙**을 잰다. */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  D01Unsaved,
  D02FileChanged,
  D03Recover,
  D04ReadOnly,
  D08SaveFailed,
} from '@/components/dialogs/StorageDialogs'
import { S07Lock } from '@/screens/S07Lock'
import { strings } from '@/app/strings'

describe('D-01 저장하지 않고 나가기', () => {
  it('세 갈래를 준다 — 취소가 있어야 실수로 나가지 않는다', () => {
    render(
      <D01Unsaved open onSave={vi.fn()} onDiscard={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText(strings.dialogs.unsavedSave)).toBeTruthy()
    expect(screen.getByText(strings.dialogs.unsavedDiscard)).toBeTruthy()
    expect(screen.getByText(strings.dialog.cancel)).toBeTruthy()
  })

  it('Esc 는 취소다 — 파괴적 선택지로 이어지지 않는다', () => {
    const onCancel = vi.fn()
    const onDiscard = vi.fn()
    render(<D01Unsaved open onSave={vi.fn()} onDiscard={onDiscard} onCancel={onCancel} />)
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
    expect(onDiscard).not.toHaveBeenCalled()
  })
})

describe('D-02 파일이 다른 곳에서 바뀜', () => {
  it('★ Esc 로 닫히지 않는다 — 어느 쪽을 쓸지 반드시 골라야 한다', () => {
    const onTakeFile = vi.fn()
    render(<D02FileChanged open onTakeFile={onTakeFile} onKeepMine={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onTakeFile).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  it('«파일 내용 쓰기»가 권장으로 표시된다', () => {
    render(<D02FileChanged open onTakeFile={vi.fn()} onKeepMine={vi.fn()} />)
    expect(screen.getByText(/권장/)).toBeTruthy()
  })
})

describe('D-03 복구 — 자동 병합하지 않는다', () => {
  it('두 갈래뿐이고 «합치기»가 없다', () => {
    render(<D03Recover open onRecover={vi.fn()} onOpenFile={vi.fn()} />)
    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons).toEqual([strings.dialogs.recoverNo, strings.dialogs.recoverYes])
    expect(buttons.join(' ')).not.toContain('합치')
  })

  it('Esc 를 막는다 — 취소가 없는 다이얼로그다 (SS§10 공통 규칙)', () => {
    const onOpenFile = vi.fn()
    render(<D03Recover open onRecover={vi.fn()} onOpenFile={onOpenFile} />)
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onOpenFile).not.toHaveBeenCalled()
  })
})

describe('D-04 읽기 전용', () => {
  it('두 탭 상황을 설명하고 두 갈래를 준다', () => {
    render(<D04ReadOnly open onOpenReadOnly={vi.fn()} onTakeOver={vi.fn()} />)
    expect(screen.getByText(strings.dialogs.readOnlyBody)).toBeTruthy()
    expect(screen.getByText(strings.dialogs.readOnlyOpen)).toBeTruthy()
  })
})

describe('D-08 저장 실패', () => {
  it('★ 원본이 온전하다는 사실을 알린다 — 모르면 «다 날아갔다»고 믿는다', () => {
    render(<D08SaveFailed open onRetry={vi.fn()} onSaveAs={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(strings.dialogs.saveFailedSafe)).toBeTruthy()
  })

  it('닫을 수 있다 — 저장 실패가 편집을 막으면 안 된다', () => {
    const onClose = vi.fn()
    render(<D08SaveFailed open onRetry={vi.fn()} onSaveAs={vi.fn()} onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('S-07 잠금 화면', () => {
  it('화면을 덮고 포커스가 «계속하기»에 간다', () => {
    render(<S07Lock open reason="idle" onUnlock={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByText(strings.lock.unlock))
  })

  it('★ 뒤가 비치지 않는다 — 비치면 잠근 의미가 없다', () => {
    render(<S07Lock open reason="idle" onUnlock={vi.fn()} />)
    const bg = getComputedStyle(screen.getByRole('alertdialog')).background
    expect(bg).not.toContain('transparent')
    expect(bg).toContain('var(--color-bg)')
  })

  it('저장이 실패했으면 해제할 때 알린다 — 모르고 자리를 뜨면 작업을 잃는다', () => {
    render(<S07Lock open reason="idle" saveFailed onUnlock={vi.fn()} />)
    expect(screen.getByText(strings.lock.saveFailed)).toBeTruthy()
  })

  it('저장이 됐으면 안심시킨다', () => {
    render(<S07Lock open reason="idle" onUnlock={vi.fn()} />)
    expect(screen.getByText(strings.lock.saved)).toBeTruthy()
  })

  it('직접 잠근 경우와 시간이 지난 경우의 문구가 다르다', () => {
    const { rerender } = render(<S07Lock open reason="manual" onUnlock={vi.fn()} />)
    expect(screen.getByText(strings.lock.manual)).toBeTruthy()
    rerender(<S07Lock open reason="idle" onUnlock={vi.fn()} />)
    expect(screen.getByText(strings.lock.idle)).toBeTruthy()
  })

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<S07Lock open={false} reason="idle" onUnlock={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
