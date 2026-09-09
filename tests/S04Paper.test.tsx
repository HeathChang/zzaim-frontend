/** S-04 화면 — 편집 패널·머리말·조판 피드백. */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuestionEditPanel, PANEL_WIDTH } from '@/screens/S04Paper/QuestionEditPanel'
import { HeaderInline } from '@/screens/S04Paper/HeaderInline'
import { BlockButtons, clampSpacerHeight, SPACER_DEFAULT_MM } from '@/screens/S04Paper/BlockButtons'
import { Feedback, PageFill, shouldWarnPageFill } from '@/screens/S04Paper/feedback/Feedback'
import { strings } from '@/app/strings'
import type { PaperHeader, Question } from '@/domain/types'

const question: Question = {
  id: 'q1',
  body: { kind: 'html', html: '<p>다음 중 옳은 것은?</p>' },
  points: 3,
  numberHint: 1,
  numberBaked: false,
  hasCrossRef: false,
  passageId: null,
  tags: ['단원:문학'],
  note: '',
  createdAt: 0,
  updatedAt: 0,
}

const header: PaperHeader = {
  school: '○○고등학교',
  grade: '1학년',
  subject: '국어',
  examName: '중간고사',
  duration: '50',
  teacher: '',
  showTotalPoints: true,
}

function panel(over: Partial<Parameters<typeof QuestionEditPanel>[0]> = {}) {
  const props = {
    question,
    overridePoints: null,
    usedByOthers: 0,
    onChangeBody: vi.fn(),
    onChangePoints: vi.fn(),
    onChangeOverride: vi.fn(),
    onChangeTags: vi.fn(),
    onChangeNote: vi.fn(),
    onChangeAnswer: vi.fn(),
    onClose: vi.fn(),
    ...over,
  }
  render(<QuestionEditPanel {...props} />)
  return props
}

describe('문항 편집 패널 (zz-5 D9)', () => {
  it('★ 본문은 **한 영역**이다 — 선택지 5칸 같은 구조화 UI가 없다', () => {
    panel()
    const textareas = screen.getAllByRole('textbox').filter((el) => el.tagName === 'TEXTAREA')
    // 본문 + 메모 두 개뿐. 선택지 5칸이 있으면 훨씬 많아진다
    expect(textareas.length).toBeLessThanOrEqual(2)
    expect(screen.queryByText(/선택지 1/)).toBeNull()
    expect(screen.queryByText(/정답 지정/)).toBeNull()
  })

  it('본문을 고치면 알려준다', () => {
    const p = panel()
    const body = screen.getByLabelText(new RegExp(strings.paperEdit.bodyLabel))
    fireEvent.change(body, { target: { value: '<p>바뀐 본문</p>' } })
    expect(p.onChangeBody).toHaveBeenCalledWith('<p>바뀐 본문</p>')
  })

  it('★ 다른 시험지에서 쓰이면 고지한다 — 모르고 고치면 함께 바뀐다 (PD-07)', () => {
    panel({ usedByOthers: 3 })
    expect(screen.getByText(new RegExp(strings.paperEdit.sharedWarning(3)))).toBeTruthy()
  })

  it('혼자 쓰는 문항에는 고지가 없다', () => {
    panel({ usedByOthers: 0 })
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('배점은 기본과 «이 시험지에서만» 두 칸이다', () => {
    panel()
    expect(screen.getByLabelText(new RegExp(strings.paperEdit.pointsLabel))).toBeTruthy()
    expect(screen.getByLabelText(new RegExp(strings.paperEdit.overrideLabel))).toBeTruthy()
  })

  it('Esc 로 닫힌다', () => {
    const p = panel()
    fireEvent.keyDown(screen.getByLabelText(strings.paperEdit.editTitle), { key: 'Escape' })
    expect(p.onClose).toHaveBeenCalled()
  })

  it('폭은 326px 다 (HO§도구UI크기)', () => {
    expect(PANEL_WIDTH).toBe(326)
  })
})

describe('머리말 인라인 편집 (zz-5 D5)', () => {
  it('★ 평소에는 머리말 그대로 보인다 — 설정 화면으로 가지 않는다', () => {
    render(<HeaderInline data={header} fs={13.6} questionCount={24} totalPoints={100} onChange={vi.fn()} />)
    expect(screen.getByText(/○○고등학교/)).toBeTruthy()
  })

  it('클릭하면 그 자리에서 고친다', () => {
    const onChange = vi.fn()
    render(<HeaderInline data={header} fs={13.6} questionCount={24} totalPoints={100} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText(strings.paperEdit.headerEdit))
    const school = screen.getByLabelText(new RegExp(strings.paperEdit.headerSchool))
    fireEvent.change(school, { target: { value: '△△중학교' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ school: '△△중학교' }))
  })
})

describe('여백 블록 (zz-5 D11 · PD-06)', () => {
  it('기본 30mm · 줄 있음', () => {
    const onInsert = vi.fn()
    render(<BlockButtons columnHeightMm={257} onInsert={onInsert} />)
    fireEvent.click(screen.getByText(strings.paperEdit.insertSpacer))
    expect(onInsert).toHaveBeenCalledWith({ kind: 'spacer', heightMm: SPACER_DEFAULT_MM, ruled: true })
  })

  it('★ 높이는 5mm ~ 단 높이로 잘린다 — 넘으면 엔진이 overflow 로 처리해 이유를 알기 어렵다', () => {
    expect(clampSpacerHeight(1, 257)).toBe(5)
    expect(clampSpacerHeight(999, 257)).toBe(257)
    expect(clampSpacerHeight(30, 257)).toBe(30)
  })

  it('구분선과 안내문도 넣을 수 있다', () => {
    const onInsert = vi.fn()
    render(<BlockButtons columnHeightMm={257} onInsert={onInsert} />)
    fireEvent.click(screen.getByText(strings.paperEdit.insertDivider))
    expect(onInsert).toHaveBeenCalledWith({ kind: 'divider' })
  })
})

describe('조판 피드백 (zz-5 D3)', () => {
  it('경고에는 ⚠ 가 붙고 참고 표시에는 붙지 않는다', () => {
    const { rerender } = render(<Feedback kind="overflow" />)
    expect(screen.getByText(/⚠/)).toBeTruthy()
    rerender(<Feedback kind="carried" />)
    expect(screen.queryByText(/⚠/)).toBeNull()
  })

  it('★ 고칠 수 있는 것에는 동작을 준다', () => {
    const onAction = vi.fn()
    render(<Feedback kind="missingPassage" onAction={onAction} />)
    fireEvent.click(screen.getByText(strings.paperFeedback.action.missingPassage))
    expect(onAction).toHaveBeenCalled()
  })

  it('참고 표시에는 동작이 없다', () => {
    render(<Feedback kind="carried" onAction={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('마지막 쪽 여백 과다는 **정보 제공만** 한다', () => {
    expect(shouldWarnPageFill(100, 900)).toBe(true)
    expect(shouldWarnPageFill(800, 900)).toBe(false)
    // 강제하지 않으므로 동작 버튼이 없다
    render(<Feedback kind="carried" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('머리말이 비어 있을 때', () => {
  it('★ 빈 값의 라벨을 남기지 않는다 — «본» 같은 조각만 보이면 깨져 보인다', () => {
    render(
      <HeaderInline
        data={{ ...header, duration: '' }}
        fs={13.6}
        questionCount={24}
        totalPoints={100}
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByText('분', { exact: true })).toBeNull()
  })

  it('값이 있으면 라벨과 함께 보인다', () => {
    render(
      <HeaderInline data={header} fs={13.6} questionCount={24} totalPoints={100} onChange={vi.fn()} />,
    )
    expect(screen.getByText(/50분/)).toBeTruthy()
  })
})

describe('★ 측정이 실패해도 나머지 지면은 정상 조판된다 (zz-5 D8)', () => {
  it('높이를 못 잰 아이템은 0으로 다루고 배치를 멈추지 않는다', async () => {
    const { layoutPages } = await import('@/layout/layoutPages')
    const items = [
      { key: 'a', kind: 'question' as const, numbered: true },
      { key: 'broken', kind: 'question' as const, numbered: true },
      { key: 'c', kind: 'question' as const, numbered: true },
    ]
    // 'broken' 은 측정값이 없다 — 실제로 측정이 실패한 상황이다
    const heights = new Map([
      ['a', 100],
      ['c', 100],
    ])
    const r = layoutPages(items, heights, {
      pageSize: 'A4',
      columns: 2,
      gutter: 8,
      margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
      fontScale: 100,
      startNumber: 1,
      box: 'border',
    })
    const placed = r.pages.flatMap((p) => p.columns.flatMap((c) => c.items))
    // 세 개 모두 배치되고 번호도 이어진다
    expect(placed.map((p) => p.key)).toEqual(['a', 'broken', 'c'])
    expect(placed.map((p) => p.number)).toEqual([1, 2, 3])
  })
})

describe('마지막 쪽 여백 과다 — 정보 제공만 (SS§6.5)', () => {
  it('많이 비었으면 알린다', () => {
    render(<PageFill ratio={0.2} />)
    expect(screen.getByText(/80%가 비어 있습니다/)).toBeTruthy()
  })

  it('강제하지 않는다 — 고치라는 버튼이 없다', () => {
    render(<PageFill ratio={0.2} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
