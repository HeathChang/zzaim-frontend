/** SS§2.5 «전역 Ctrl+V» — 붙여넣기 영역에 포커스가 없어도 받아야 한다. */
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useGlobalPaste } from '@/app/useGlobalPaste'

function Harness({ onPaste, enabled }: { onPaste: (p: unknown) => void; enabled?: boolean }) {
  useGlobalPaste(onPaste, enabled)
  return <input aria-label="search" />
}

function paste(target: EventTarget, data: Record<string, string>) {
  const e = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
    clipboardData: unknown
  }
  Object.defineProperty(e, 'clipboardData', {
    value: { getData: (t: string) => data[t] ?? '' },
  })
  Object.defineProperty(e, 'target', { value: target })
  document.dispatchEvent(e)
}

describe('전역 붙여넣기', () => {
  it('문서 어디에 붙여넣어도 받는다', () => {
    const onPaste = vi.fn()
    render(<Harness onPaste={onPaste} />)
    paste(document.body, { 'text/html': '<p>가</p>', 'text/plain': '가' })
    expect(onPaste).toHaveBeenCalledWith({ html: '<p>가</p>', text: '가' })
  })

  it('입력칸에 붙여넣는 것은 가로채지 않는다 — 검색창 붙여넣기를 문항 가져오기로 오해하면 안 된다', () => {
    const onPaste = vi.fn()
    const { getByLabelText } = render(<Harness onPaste={onPaste} />)
    paste(getByLabelText('search'), { 'text/plain': '가' })
    expect(onPaste).not.toHaveBeenCalled()
  })

  it('꺼 두면 듣지 않는다', () => {
    const onPaste = vi.fn()
    render(<Harness onPaste={onPaste} enabled={false} />)
    paste(document.body, { 'text/plain': '가' })
    expect(onPaste).not.toHaveBeenCalled()
  })
})
