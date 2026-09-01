/** 공용 인벤토리 — 규칙이 명시된 것들만 잰다.
 *  «한 번 만들고 여러 화면에서 쓴다»(SS부록A)의 전제는 **동작이 하나**라는 것이다. */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { matchesTags, parseTag, TagFilter } from '@/components/TagFilter'
import { InlineEditBadge } from '@/components/InlineEditBadge'
import { ToastHost, useToasts } from '@/components/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'

describe('태그 — 그룹:값 하나로 통일 (PD-03)', () => {
  it('첫 콜론에서 나눈다', () => {
    expect(parseTag('단원:문학')).toEqual({ group: '단원', value: '문학' })
  })

  it('값에 콜론이 있어도 그룹은 하나다', () => {
    expect(parseTag('출처:2025:중간')).toEqual({ group: '출처', value: '2025:중간' })
  })

  it('콜론이 없으면 그룹 없는 태그다', () => {
    expect(parseTag('중요')).toEqual({ group: null, value: '중요' })
  })
})

describe('필터 논리 — 같은 그룹 안은 OR, 그룹 간은 AND (SS§5.3)', () => {
  const tags = ['단원:문학', '난이도:상', '출처:2025중간']

  it('선택이 없으면 전부 통과한다', () => {
    expect(matchesTags(tags, new Set())).toBe(true)
  })

  it('같은 그룹에서 하나만 맞아도 통과 (OR)', () => {
    expect(matchesTags(tags, new Set(['단원:문학', '단원:문법']))).toBe(true)
  })

  it('다른 그룹은 전부 맞아야 통과 (AND)', () => {
    expect(matchesTags(tags, new Set(['단원:문학', '난이도:상']))).toBe(true)
    expect(matchesTags(tags, new Set(['단원:문학', '난이도:하']))).toBe(false)
  })

  it('그룹 없는 태그끼리도 OR 로 묶인다', () => {
    expect(matchesTags(['중요'], new Set(['중요', '보류']))).toBe(true)
  })

  it('필터 UI 가 그룹별로 묶어 보여준다', () => {
    render(
      <TagFilter
        options={[
          { tag: '단원:문학', count: 84 },
          { tag: '단원:문법', count: 61 },
        ]}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    )
    expect(screen.getByText('단원')).toBeTruthy()
    expect(screen.getByText(/문학 \(84\)/)).toBeTruthy()
  })
})

describe('인라인 편집 뱃지', () => {
  function open(value: number | null, onChange = vi.fn()) {
    render(
      <InlineEditBadge
        value={value}
        emptyLabel="[?]"
        format={(v) => `[${v}점]`}
        ariaLabel="배점"
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('배점'))
    return { input: screen.getByLabelText('배점') as HTMLInputElement, onChange }
  }

  it('값이 없으면 빈 라벨을 보여준다', () => {
    render(
      <InlineEditBadge
        value={null}
        emptyLabel="[?]"
        format={(v) => `[${v}점]`}
        ariaLabel="배점"
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('[?]')).toBeTruthy()
  })

  it('Enter 로 확정한다', () => {
    const { input, onChange } = open(3)
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('빈 값은 «모름»으로 확정된다 — 0 이 되면 배점 합계가 거짓이 된다', () => {
    const { input, onChange } = open(3)
    fireEvent.change(input, { target: { value: '  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('숫자가 아니면 버리고 원래 값을 지킨다', () => {
    const { input, onChange } = open(3)
    fireEvent.change(input, { target: { value: '삼점' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('범위 밖도 버린다', () => {
    const { input, onChange } = open(3)
    fireEvent.change(input, { target: { value: '9999' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Esc 는 편집만 취소한다 — 패널까지 닫히면 안 된다', () => {
    const outer = vi.fn()
    const onChange = vi.fn()
    render(
      <div onKeyDown={outer}>
        <InlineEditBadge
          value={3}
          emptyLabel="[?]"
          format={(v) => `[${v}점]`}
          ariaLabel="배점"
          onChange={onChange}
        />
      </div>,
    )
    fireEvent.click(screen.getByLabelText('배점'))
    fireEvent.keyDown(screen.getByLabelText('배점'), { key: 'Escape' })
    expect(onChange).not.toHaveBeenCalled()
    expect(outer).not.toHaveBeenCalled()
  })
})

describe('토스트 — 3초, 되돌리기가 붙으면 6초 (SS부록D)', () => {
  function Harness({ withUndo }: { withUndo: boolean }) {
    const { items, show, dismiss } = useToasts()
    return (
      <>
        <button
          type="button"
          onClick={() =>
            show({ id: 't1', message: '담았습니다', ...(withUndo ? { onUndo: () => {} } : {}) })
          }
        >
          show
        </button>
        <ToastHost items={items} onDismiss={dismiss} />
      </>
    )
  }

  it('되돌리기 없는 토스트는 3초에 사라진다', () => {
    vi.useFakeTimers()
    render(<Harness withUndo={false} />)
    fireEvent.click(screen.getByText('show'))
    expect(screen.getByText('담았습니다')).toBeTruthy()
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.queryByText('담았습니다')).toBeNull()
    vi.useRealTimers()
  })

  it('되돌리기가 붙으면 6초를 준다 — 3초는 읽고 누르기에 짧다', () => {
    vi.useFakeTimers()
    render(<Harness withUndo />)
    fireEvent.click(screen.getByText('show'))
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.getByText('담았습니다')).toBeTruthy()
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.queryByText('담았습니다')).toBeNull()
    vi.useRealTimers()
  })
})

describe('오류 경계', () => {
  it('한 조각이 무너져도 대신 그릴 것을 보여준다', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Boom(): never {
      throw new Error('boom')
    }
    render(
      <ErrorBoundary fallback={<div>대신</div>}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('대신')).toBeTruthy()
    spy.mockRestore()
  })
})
