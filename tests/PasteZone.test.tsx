/** S-00 의 8할. 여기가 죽으면 제품의 첫 동선이 통째로 죽는다. */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PasteZone, readPaste } from '@/components/PasteZone'

function clipboard(data: Record<string, string>): DataTransfer {
  return { getData: (t: string) => data[t] ?? '' } as unknown as DataTransfer
}

describe('붙여넣기 읽기', () => {
  it('HTML 이 있으면 HTML 을 준다', () => {
    expect(readPaste(clipboard({ 'text/html': '<p>가</p>', 'text/plain': '가' }))).toEqual({
      html: '<p>가</p>',
      text: '가',
    })
  })

  it('HTML 이 없으면 null — 평문 경로로 간다 (SS§2.6)', () => {
    expect(readPaste(clipboard({ 'text/plain': '가' })).html).toBeNull()
  })
})

describe('PasteZone', () => {
  it('textarea 기반이고 접근성 이름이 붙는다 (SS§2.7)', () => {
    render(<PasteZone label="여기에 붙여넣으세요" onPaste={vi.fn()} />)
    const el = screen.getByLabelText('여기에 붙여넣으세요')
    expect(el.tagName).toBe('TEXTAREA')
  })

  it('⚠ readOnly 가 아니다 — readOnly 면 붙여넣기가 도착하지 않을 수 있다', () => {
    render(<PasteZone label="l" onPaste={vi.fn()} />)
    expect((screen.getByLabelText('l') as HTMLTextAreaElement).readOnly).toBe(false)
  })

  it('붙여넣으면 payload 를 넘기고 기본 동작은 막는다', () => {
    const onPaste = vi.fn()
    render(<PasteZone label="l" onPaste={onPaste} />)
    fireEvent.paste(screen.getByLabelText('l'), {
      clipboardData: clipboard({ 'text/html': '<p>x</p>', 'text/plain': 'x' }),
    })
    expect(onPaste).toHaveBeenCalledWith({ html: '<p>x</p>', text: 'x' })
  })

  it('타이핑해도 값이 남지 않는다 — 여기로 문항을 «작성»하게 하지 않는다', () => {
    render(<PasteZone label="l" onPaste={vi.fn()} />)
    const el = screen.getByLabelText('l') as HTMLTextAreaElement
    fireEvent.change(el, { target: { value: '손으로 입력' } })
    expect(el.value).toBe('')
  })
})
