/** SS§6.5 «지문 담기» — **경고에는 고칠 방법이 함께 있어야 한다.**
 *
 *  ★ 이 동작이 붙어 있지 않아 버튼이 **아예 그려지지 않고 있었다.**
 *  경고만 뜨고 «어떻게 고치지»에는 답이 없는 상태였고, 그걸 지키던 E2E 는
 *  «경고가 없으면 통과» 라 영영 초록이었다. */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { restorePassage } from '@/screens/S04Paper/restorePassage'
import { Feedback } from '@/screens/S04Paper/feedback/Feedback'
import { orphanQuestions } from '@/app/store/paperOps'
import type { PaperItem } from '@/domain/types'

const q = (questionId: string): PaperItem => ({ kind: 'question', questionId })
const group = (passageId: string, children: string[]): PaperItem => ({
  kind: 'passageGroup',
  passageId,
  children: children.map((questionId) => ({ questionId })),
  splitPolicy: 'together',
})

describe('지문 없는 문항 찾기', () => {
  it('지문이 시험지에 없으면 미아다', () => {
    const items = [q('q1')]
    expect(orphanQuestions(items, (id) => (id === 'q1' ? 'p1' : null))).toEqual(['q1'])
  })

  it('지문 묶음 안에 있으면 미아가 아니다', () => {
    const items = [group('p1', ['q1'])]
    expect(orphanQuestions(items, () => 'p1')).toEqual([])
  })

  it('지문에 속하지 않는 문항은 미아가 아니다', () => {
    expect(orphanQuestions([q('q1')], () => null)).toEqual([])
  })
})

describe('지문 담기', () => {
  it('★ 문항을 지문 묶음으로 감싼다 — 자리만 맞추면 다시 흩어진다', () => {
    const out = restorePassage([q('q1'), q('q2')], 0, 'p1')
    expect(out[0]).toEqual({
      kind: 'passageGroup',
      passageId: 'p1',
      children: [{ questionId: 'q1' }],
      splitPolicy: 'together',
    })
    expect(out[1]).toEqual(q('q2'))
  })

  it('★ 같은 지문의 묶음이 이미 있으면 **그 묶음에 넣는다** — 지문이 두 번 나오면 안 된다', () => {
    const out = restorePassage([group('p1', ['q1']), q('q2')], 1, 'p1')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      kind: 'passageGroup',
      children: [{ questionId: 'q1' }, { questionId: 'q2' }],
    })
  })

  it('이 시험지에서만 쓰는 배점을 잃지 않는다', () => {
    const items: PaperItem[] = [{ kind: 'question', questionId: 'q1', overridePoints: 7 }]
    const out = restorePassage(items, 0, 'p1')
    expect(out[0]).toMatchObject({ children: [{ questionId: 'q1', overridePoints: 7 }] })
  })

  it('문항이 아닌 자리에는 아무 일도 하지 않는다', () => {
    const items = [group('p1', ['q1'])]
    expect(restorePassage(items, 0, 'p1')).toEqual(items)
    expect(restorePassage(items, 9, 'p1')).toEqual(items)
  })
})

describe('경고에 고칠 방법이 붙는다', () => {
  it('★ 동작을 주면 버튼이 나온다', () => {
    const onAction = vi.fn()
    render(<Feedback kind="missingPassage" onAction={onAction} />)
    const btn = screen.getByRole('button', { name: '지문 담기' })
    fireEvent.click(btn)
    expect(onAction).toHaveBeenCalled()
  })

  it('동작이 없으면 버튼도 없다 — 누를 수 없는 버튼을 보여 주지 않는다', () => {
    render(<Feedback kind="missingPassage" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('참고 표시에는 버튼이 붙지 않는다 — 고칠 것이 없다', () => {
    render(<Feedback kind="carried" onAction={() => undefined} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
