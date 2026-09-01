/** SS§11 — «키보드 중심 제품에서 도움말은 부가 기능이 아니다.»
 *  Dialog 와 **같은 동작**이어야 한다. 한쪽만 트랩이면 새는 곳이 생긴다. */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { describeShortcut, S10Help } from '@/screens/S10Help'

const entries = [{ keys: 'N', description: '다음 확인 지점' }]

describe('단축키 표기', () => {
  it('조합키를 사람이 읽는 모양으로 만든다', () => {
    expect(describeShortcut({ key: 's', meta: true, run: vi.fn() })).toBe('⌘/Ctrl+S')
    expect(describeShortcut({ key: 'escape', run: vi.fn() })).toBe('Esc')
    expect(describeShortcut({ key: 'k', meta: true, shift: true, run: vi.fn() })).toBe('⌘/Ctrl+⇧+K')
  })
})

describe('도움말 오버레이', () => {
  it('현재 화면 것을 위에, 전역을 아래에 (SS§11.2)', () => {
    render(
      <S10Help
        open
        onClose={vi.fn()}
        screenEntries={entries}
        globalEntries={[{ keys: '⌘S', description: '저장' }]}
      />,
    )
    const text = document.body.textContent ?? ''
    expect(text.indexOf('다음 확인 지점')).toBeLessThan(text.indexOf('저장'))
  })

  it('Esc 로 닫힌다', () => {
    const onClose = vi.fn()
    render(<S10Help open onClose={onClose} screenEntries={entries} globalEntries={[]} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('안에 초점 대상이 없어도 Tab 이 밖으로 새지 않는다', () => {
    render(<S10Help open onClose={vi.fn()} screenEntries={entries} globalEntries={[]} />)
    const dialog = screen.getByRole('dialog')
    const e = fireEvent.keyDown(dialog, { key: 'Tab' })
    // preventDefault 됐다면 fireEvent 가 false 를 준다
    expect(e).toBe(false)
  })

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<S10Help open={false} onClose={vi.fn()} screenEntries={entries} globalEntries={[]} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
