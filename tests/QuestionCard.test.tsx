/** 공용 카드 — 역할을 소비자가 «잊을 수 없게» 만들었는지 본다. */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuestionCard } from '@/components/QuestionCard'

describe('문항 카드', () => {
  it('option 역할이면 aria-selected 가 붙는다', () => {
    render(<QuestionCard role="option" preview="본문" selected />)
    expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true')
  })

  it('listitem 역할에는 aria-selected 를 붙이지 않는다 — 거기서는 무효다', () => {
    render(<QuestionCard role="listitem" preview="본문" selected />)
    expect(screen.getByRole('listitem').hasAttribute('aria-selected')).toBe(false)
  })

  it('이미 담긴 문항은 흐리게 + 표시 (SS§6.3 A.3)', () => {
    render(<QuestionCard role="listitem" preview="본문" used usedLabel="담김" />)
    expect(screen.getByText(/담김/)).toBeTruthy()
  })

  it('밀도에 따라 높이가 정해진다 — 낮은 밀도는 자동', () => {
    const { container, rerender } = render(<QuestionCard role="listitem" preview="x" density="high" />)
    expect((container.firstChild as HTMLElement).style.height).toBe('56px')
    rerender(<QuestionCard role="listitem" preview="x" density="low" />)
    expect((container.firstChild as HTMLElement).style.height).toBe('')
  })
})
