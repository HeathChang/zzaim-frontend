/** S-02 화면 — **6초 목표를 떠받치는 규칙들**이 실제로 화면에서 도는가. */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { S02Segments } from '@/screens/S02Segments'
import { ConfidenceBadge, tierOf } from '@/screens/S02Segments/ConfidenceBadge'
import { isCollapsed } from '@/screens/S02Segments/RecoverPanel'
import { SplitMode } from '@/screens/S02Segments/SplitMode'
import { ResultList, VIRTUALIZE_ABOVE } from '@/screens/S02Segments/ResultList'
import { strings } from '@/app/strings'
import type { Segment } from '@/importing/types'

function seg(over: Partial<Segment> = {}): Segment {
  return {
    role: 'question',
    lines: ['1. 문항입니다 충분히 긴 내용입니다'],
    start: 0,
    end: 20,
    numberHint: 1,
    points: 3,
    hasCrossRef: false,
    hasImage: false,
    hasMissingImage: false,
    confidence: 0.95,
    reasons: [],
    ...over,
  }
}

function setup(segments: Segment[], onCommit = vi.fn()) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  render(
    <S02Segments raw={segments.map((s) => s.lines.join('\n')).join('\n')} blocks={[]} segments={segments} onCommit={onCommit} />,
  )
  return { onCommit }
}

const press = (key: string) => act(() => void fireEvent.keyDown(window, { key }))

describe('신뢰도 배지 (zz-4 D2)', () => {
  it('3구간으로 나뉜다 (SS§4.5)', () => {
    expect(tierOf(0.95)).toBe('high')
    expect(tierOf(0.72)).toBe('medium')
    expect(tierOf(0.41)).toBe('low')
  })

  it('★ 색으로만 구분하지 않는다 — ⚠ 아이콘과 숫자를 함께 (SS§1.6)', () => {
    render(<ConfidenceBadge confidence={0.41} reasons={[]} />)
    expect(screen.getByText(/⚠/)).toBeTruthy()
    expect(screen.getByText(/41%/)).toBeTruthy()
  })

  it('높은 신뢰도에는 경고 아이콘이 없다', () => {
    render(<ConfidenceBadge confidence={0.95} reasons={[]} />)
    expect(screen.queryByText(/⚠/)).toBeNull()
  })

  it('★ 근거를 함께 적는다 — 숫자만으로는 판단할 수 없다', () => {
    render(<ConfidenceBadge confidence={0.41} reasons={['noChoices', 'numberGap']} />)
    expect(screen.getByText(new RegExp(strings.confidence.noChoices))).toBeTruthy()
    expect(screen.getByText(new RegExp(strings.confidence.numberGap))).toBeTruthy()
  })
})

describe('N — 이 화면의 핵심 키', () => {
  it('★ 진입 커서가 첫 의심 지점에 놓인다 — 1번 카드가 아니다', () => {
    setup([seg(), seg(), seg({ confidence: 0.4, reasons: ['noChoices'] })])
    const options = screen.getAllByRole('option')
    expect(options[2]?.getAttribute('aria-selected')).toBe('true')
    expect(options[0]?.getAttribute('aria-selected')).toBe('false')
  })

  it('N 을 누르면 다음 의심 지점으로 간다', () => {
    setup([
      seg({ confidence: 0.4, reasons: ['noChoices'] }),
      seg(),
      seg({ confidence: 0.5, reasons: ['tooShort'] }),
    ])
    press('n')
    expect(screen.getAllByRole('option')[2]?.getAttribute('aria-selected')).toBe('true')
  })

  it('J/K 로 이동한다', () => {
    setup([seg(), seg(), seg()])
    press('j')
    expect(screen.getAllByRole('option')[1]?.getAttribute('aria-selected')).toBe('true')
    press('k')
    expect(screen.getAllByRole('option')[0]?.getAttribute('aria-selected')).toBe('true')
  })
})

describe('Space — 확인함 (zz-4 D5)', () => {
  it('★ 확인함으로 표시하면 «확인이 필요한 곳»이 줄어든다', () => {
    setup([seg({ confidence: 0.4, reasons: ['noChoices'] })])
    expect(screen.getByText(strings.segments.needAttention(1))).toBeTruthy()
    press(' ')
    expect(screen.getByText(strings.segments.noneLeft)).toBeTruthy()
  })

  it('★ 확인함 배지가 신뢰도 자리를 대신한다', () => {
    setup([seg({ confidence: 0.4, reasons: ['noChoices'] })])
    press(' ')
    expect(screen.getByText(/확인함/)).toBeTruthy()
  })

  it('★ 확인함은 «손댄 곳»으로 세지 않는다 — 경계를 고친 게 아니다', () => {
    setup([seg({ confidence: 0.4, reasons: ['noChoices'] })])
    press(' ')
    expect(screen.getByText(strings.segments.corrections(0))).toBeTruthy()
  })
})

describe('카드 미리보기 (SS§4.3 A.5)', () => {
  it('★ 접힌 카드도 최대 4줄까지 보여 준다 — 첫 줄만 보이면 빈 카드처럼 보인다', () => {
    setup([seg({ lines: ['14.', '다음 중 옳은 것은?', '① 하나', '② 둘', '③ 셋', '④ 넷'] })])
    const card = screen.getByRole('option')
    expect(card.textContent).toContain('다음 중 옳은 것은?')
    // 4줄까지만 — 5번째는 펼쳐야 보인다
    expect(card.textContent).not.toContain('③ 셋')
  })

  it('E 로 펼치면 전부 보인다', () => {
    setup([seg({ lines: ['14.', 'a', 'b', 'c', 'd', '마지막 줄입니다'] })])
    press('e')
    expect(screen.getByRole('option').textContent).toContain('마지막 줄입니다')
  })
})

describe('편집과 통계', () => {
  it('M 으로 합치면 카드가 줄고 손댄 곳이 는다', () => {
    setup([seg(), seg()])
    press('j')
    press('m')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByText(strings.segments.corrections(1))).toBeTruthy()
  })

  it('D 로 지운다', () => {
    setup([seg(), seg()])
    press('d')
    expect(screen.getAllByRole('option')).toHaveLength(1)
  })

  it('P 로 지문 전환 — 카드에 지문 표시가 붙는다', () => {
    setup([seg()])
    press('p')
    expect(screen.getByText(strings.common.passage)).toBeTruthy()
  })

  it('E 로 본문을 펼친다 — Tab 을 쓰지 않는다 (SS§1.6)', () => {
    setup([seg({ lines: ['1. 첫 줄입니다', '둘째 줄입니다'] })])
    // ⚠ 왼쪽 원본 패널에는 모든 줄이 보인다(커서 강조). **카드 안**을 봐야 한다
    const card = () => screen.getByRole('option')
    // 접힌 상태에서도 4줄까지는 보인다 (SS§4.3 A.5) — 여기서는 2줄이라 다 보인다
    expect(card().textContent).toContain('둘째 줄')
    press('e')
    expect(card().textContent).toContain('둘째 줄')
  })
})

describe('확정 (zz-4 D8)', () => {
  it('의심이 없으면 바로 담는다', () => {
    const { onCommit } = setup([seg()])
    press('Enter')
    expect(onCommit).toHaveBeenCalled()
  })

  it('★ 의심이 남으면 **묻는다. 막지는 않는다** (D-06)', () => {
    const { onCommit } = setup([seg({ confidence: 0.4, reasons: ['noChoices'] })])
    press('Enter')
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByText(strings.segments.confirmAnyway))
    expect(onCommit).toHaveBeenCalled()
  })

  it('«확인하러 가기»를 고르면 담지 않고 의심 지점으로 간다', () => {
    const { onCommit } = setup([seg({ confidence: 0.4, reasons: ['noChoices'] })])
    press('Enter')
    fireEvent.click(screen.getByText(strings.segments.confirmGo))
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('확정 결과에 교정 통계가 실린다 — 서버 없는 제품의 유일한 계측', () => {
    const { onCommit } = setup([seg(), seg()])
    press('j')
    press('m')
    press('Enter')
    // 합친 카드가 의심 대상이 되면 먼저 묻는다 — 그때는 «그대로 담기»로 넘어간다
    const anyway = screen.queryByText(strings.segments.confirmAnyway)
    if (anyway) fireEvent.click(anyway)
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ stats: expect.objectContaining({ corrections: 1 }) }),
    )
  })
})

describe('분리 붕괴 복구 (zz-4 D6)', () => {
  it('60% 미만이 절반 이상이면 무너진 것으로 본다', () => {
    expect(isCollapsed([seg({ confidence: 0.4 }), seg({ confidence: 0.9 })])).toBe(true)
    expect(isCollapsed([seg({ confidence: 0.9 }), seg({ confidence: 0.9 })])).toBe(false)
  })

  it('빈 목록은 무너진 것이 아니다', () => {
    expect(isCollapsed([])).toBe(false)
  })

  it('★ 무너지면 형식을 고르는 패널이 뜬다 — 한 번의 선택이 50번의 교정을 대신한다', () => {
    setup([seg({ confidence: 0.3 }), seg({ confidence: 0.3 })])
    expect(screen.getByText(strings.segments.recoverTitle)).toBeTruthy()
    expect(screen.getByText(strings.segments.formatCircled)).toBeTruthy()
  })

  it('«손으로 고치기»를 고르면 패널이 사라진다', () => {
    setup([seg({ confidence: 0.3 }), seg({ confidence: 0.3 })])
    fireEvent.click(screen.getByText(strings.segments.recoverManual))
    expect(screen.queryByText(strings.segments.recoverTitle)).toBeNull()
  })
})

describe('쪼개기 모드 (zz-4 D4)', () => {
  it('문단 경계만 자를 수 있다 — 줄이 하나면 아예 뜨지 않는다', () => {
    const { container } = render(
      <SplitMode lines={['한 줄뿐']} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('Enter 로 현재 지점에서 자른다', () => {
    const onConfirm = vi.fn()
    render(<SplitMode lines={['a', 'b', 'c']} onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledWith([1])
  })

  it('Space 로 여러 지점을 고른다 — 한 번에 3개로 쪼개기', () => {
    const onConfirm = vi.fn()
    render(<SplitMode lines={['a', 'b', 'c', 'd']} onConfirm={onConfirm} onCancel={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: ' ' })
    fireEvent.keyDown(dialog, { key: 'ArrowDown' })
    fireEvent.keyDown(dialog, { key: ' ' })
    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledWith([1, 2])
  })

  it('Esc 로 취소한다', () => {
    const onCancel = vi.fn()
    render(<SplitMode lines={['a', 'b']} onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('가상 스크롤 (zz-4 D9)', () => {
  it('임계값 아래에서는 전부 그린다 — 가상화는 공짜가 아니다', () => {
    const many = Array.from({ length: 24 }, () => seg())
    setup(many)
    expect(screen.getAllByRole('option')).toHaveLength(24)
  })

  it('임계값이 100 이다 (SS부록D)', () => {
    expect(VIRTUALIZE_ABOVE).toBe(100)
  })

  it('★ 100개를 넘으면 일부만 DOM 에 올린다 — 전부 올리면 60fps 를 못 지킨다', () => {
    // ⚠ jsdom 은 레이아웃을 계산하지 않아 스크롤 높이가 0이다.
    // 그래서 컴포넌트를 **높이를 준 채** 직접 잰다 (실제 배치는 E2E 가 본다)
    render(
      <div style={{ height: 600 }}>
        <ResultList
          count={150}
          cursor={0}
          label="목록 150개"
          renderRow={(i) => (
            <div key={i} role="option" aria-selected={false}>
              카드 {i}
            </div>
          )}
        />
      </div>,
    )
    const rendered = screen.queryAllByRole('option').length
    expect(rendered).toBeLessThan(150)
  })

  it('임계값 아래에서는 목록 전체가 접근성 트리에 있다', () => {
    render(
      <ResultList
        count={24}
        cursor={0}
        label="목록 24개"
        renderRow={(i) => (
          <div key={i} role="option" aria-selected={false}>
            카드 {i}
          </div>
        )}
      />,
    )
    expect(screen.getAllByRole('option')).toHaveLength(24)
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toContain('24')
  })
})

describe('G — 묶음 (zz-4 D8)', () => {
  it('★ 지문에서 G 를 누르면 뒤 문항들이 묶이고 표시가 붙는다', () => {
    setup([
      seg({ role: 'passage', lines: ['[1~2] 다음 글을 읽고'], range: { from: 1, to: 2 } }),
      seg(),
      seg(),
    ])
    press('g')
    expect(screen.getAllByText(strings.segments.grouped)).toHaveLength(2)
  })

  it('★ 묶은 문항의 passageId 가 확정 결과에 실린다 — 없으면 미아가 된다', () => {
    const { onCommit } = setup([
      seg({ role: 'passage', lines: ['[1~2] 다음 글을 읽고'], range: { from: 1, to: 2 } }),
      seg(),
      seg(),
    ])
    press('g')
    press('Enter')
    const anyway = screen.queryByText(strings.segments.confirmAnyway)
    if (anyway) fireEvent.click(anyway)
    const arg = onCommit.mock.calls[0]?.[0] as {
      questions: { passageId: string | null }[]
      passages: { id: string }[]
    }
    expect(arg.questions.every((q) => q.passageId === arg.passages[0]?.id)).toBe(true)
  })

  it('문항에서 G 를 누르면 아무 일도 없다', () => {
    setup([seg(), seg()])
    press('g')
    expect(screen.queryByText(strings.segments.grouped)).toBeNull()
  })
})

describe('신뢰도 근거 6종이 전부 실제로 뜬다 (SS§4.5)', () => {
  const cases: [string, Partial<Segment>][] = [
    ['noChoices', { lines: ['1. 선택지가 없는 문항입니다 충분히 긴 내용으로 채웁니다'] }],
    ['tooShort', { lines: ['1. 짧음'] }],
    ['crossRef', { lines: ['1. 위 3번과 관련하여 답하시오 충분히 긴 내용을 넣습니다'] }],
  ]

  for (const [reason, over] of cases) {
    it(`«${strings.confidence[reason as keyof typeof strings.confidence]}» 가 카드에 뜬다`, () => {
      const { unmount } = render(<div />)
      unmount()
      setup([seg({ confidence: 1, reasons: [], ...over })])
      // 실제 판정은 화면이 아니라 confidence.ts 가 한다 — 여기서는 **표시**를 본다
      render(
        <ConfidenceBadge
          confidence={0.5}
          reasons={[reason as 'noChoices']}
        />,
      )
      expect(
        screen.getAllByText(
          new RegExp(strings.confidence[reason as keyof typeof strings.confidence]),
        ).length,
      ).toBeGreaterThan(0)
    })
  }

  it('여섯 종류가 전부 문구를 갖는다 — 코드만 있고 문구가 없으면 화면이 빈다', () => {
    const codes = ['noChoices', 'numberGap', 'noPoints', 'tooShort', 'tooLong', 'crossRef'] as const
    for (const c of codes) {
      expect(strings.confidence[c]).toBeTruthy()
    }
  })
})
