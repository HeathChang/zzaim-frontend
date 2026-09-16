/** zz-8 — 설정 패널의 상태와 키보드 (D3 · D6).
 *
 *  브라우저에서 못 만드는 상태(읽기 전용)와, 브라우저에서 재기 어려운 것
 *  («드래그 중에는 반영하지 않는다»)을 여기서 본다. */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { S05Settings } from '@/screens/S05Settings'
import { DEFAULT_LAYOUT } from '@/domain/defaults'
import type { PaperLayout } from '@/domain/types'

function view(over: Partial<React.ComponentProps<typeof S05Settings>> = {}) {
  const onChange = vi.fn()
  const onClose = vi.fn()
  const onApplyPoints = vi.fn()
  render(
    <S05Settings
      layout={DEFAULT_LAYOUT}
      onChange={onChange}
      questions={[{ id: 'q1', points: 3, tags: [] }]}
      onApplyPoints={onApplyPoints}
      pageCount={2}
      onClose={onClose}
      {...over}
    />,
  )
  return { onChange, onClose, onApplyPoints }
}

describe('읽기 전용 (D6 상태4)', () => {
  it('★ 사유를 먼저 말한다 — 눌리지 않는 이유를 모르면 고장으로 보인다', () => {
    view({ readOnly: true })
    expect(screen.getByRole('alert').textContent).toContain('다른 탭')
  })

  it('★ 모든 입력이 잠긴다', () => {
    view({ readOnly: true })
    const controls = [
      ...screen.getAllByRole('slider'),
      ...screen.getAllByRole('combobox'),
      ...screen.getAllByRole('checkbox'),
    ]
    expect(controls.length).toBeGreaterThan(10)
    expect(controls.every((c) => (c as HTMLInputElement).disabled)).toBe(true)
  })

  it('배점 일괄도 잠긴다 — 배점은 문서 내용이다', () => {
    view({ readOnly: true })
    expect(screen.getByRole('button', { name: '균등' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('평소에는 잠기지 않는다', () => {
    view()
    expect((screen.getByLabelText('용지 크기') as HTMLSelectElement).disabled).toBe(false)
  })
})

describe('글자 크기 — 드래그 중에는 반영하지 않는다 (D3)', () => {
  it('★ 값을 끄는 동안에는 문서를 건드리지 않는다 — 매번 전체 재측정이 돈다', () => {
    const { onChange } = view()
    const slider = screen.getByLabelText('글자 크기')
    fireEvent.change(slider, { target: { value: '110' } })
    fireEvent.change(slider, { target: { value: '115' } })
    expect(onChange).not.toHaveBeenCalled()
    // 화면의 숫자는 따라 움직인다 — 반응이 없으면 고장으로 보인다
    expect((slider as HTMLInputElement).value).toBe('115')
  })

  it('★ 놓았을 때 한 번만 반영한다', () => {
    const { onChange } = view()
    const slider = screen.getByLabelText('글자 크기')
    fireEvent.change(slider, { target: { value: '110' } })
    fireEvent.pointerUp(slider)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0]?.[0] as PaperLayout).fontScale).toBe(110)
  })

  it('여백 같은 값은 **즉시** 반영한다 — 재측정이 없다', () => {
    const { onChange } = view()
    fireEvent.change(screen.getByLabelText('위'), { target: { value: '30' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('상한에 닿았을 때 (D2)', () => {
  it('더 못 올리는 이유를 말한다 — 조용히 안 움직이면 고장으로 보인다', () => {
    const tight: PaperLayout = {
      ...DEFAULT_LAYOUT,
      gutter: 20,
      margin: { ...DEFAULT_LAYOUT.margin, inner: 60, outer: 60 },
    }
    view({ layout: tight })
    expect(screen.getAllByText(/자리가 없습니다/).length).toBeGreaterThan(0)
  })

  it('여유가 있으면 조용하다', () => {
    view()
    expect(screen.queryByText(/자리가 없습니다/)).toBeNull()
  })
})

describe('지문 이어짐 표기 (UD-39)', () => {
  it('★ 지금은 발화하지 않는다는 사실을 숨기지 않는다', () => {
    view()
    expect(screen.getByText(/지문이 나뉘지 않아/)).toBeTruthy()
  })
})

describe('닫기', () => {
  it('Esc 로 닫는다 — 포커스 트랩이 아니다 (불변2)', () => {
    const { onClose } = view()
    fireEvent.keyDown(screen.getByLabelText('용지 크기'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
