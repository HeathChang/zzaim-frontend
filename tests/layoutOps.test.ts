/** zz-8 D3 — 설정 되돌리기.
 *
 *  ★ 핵심은 **«슬라이더 한 번 끄는 것이 한 번의 되돌리기»** 다.
 *  값이 바뀔 때마다 스택에 쌓으면 `Cmd+Z` 를 40번 눌러야 하고, 그건 없는 기능과 같다. */
import { describe, expect, it } from 'vitest'
import { breakMerge, changedField, pushLayoutChange, type LayoutCommand } from '@/app/store/layoutOps'
import { createUndoStack } from '@/app/undo'
import { DEFAULT_LAYOUT } from '@/domain/defaults'
import type { PaperLayout } from '@/domain/types'

const withMargin = (inner: number): PaperLayout => ({
  ...DEFAULT_LAYOUT,
  margin: { ...DEFAULT_LAYOUT.margin, inner },
})

function harness() {
  const stack = createUndoStack()
  const ref: { current: LayoutCommand | null } = { current: null }
  let current = DEFAULT_LAYOUT
  const change = (next: PaperLayout, now: number) =>
    pushLayoutChange(
      stack,
      {
        field: changedField(current, next),
        label: '설정',
        before: current,
        after: next,
        apply: (v) => {
          current = v
        },
      },
      now,
      ref,
    )
  return { stack, ref, change, get: () => current }
}

describe('무엇이 바뀌었나', () => {
  it('한 항목이면 그 이름을 준다', () => {
    expect(changedField(DEFAULT_LAYOUT, { ...DEFAULT_LAYOUT, gutter: 10 })).toBe('gutter')
    expect(changedField(DEFAULT_LAYOUT, withMargin(30))).toBe('margin.inner')
  })

  it('아무것도 안 바뀌었거나 여럿이면 묶지 않을 이름을 준다', () => {
    expect(changedField(DEFAULT_LAYOUT, DEFAULT_LAYOUT)).toBe('none')
    expect(changedField(DEFAULT_LAYOUT, { ...withMargin(30), gutter: 10 })).toBe('multi')
  })
})

describe('되돌리기', () => {
  it('설정을 바꾸고 되돌리면 이전 값으로 간다', () => {
    const h = harness()
    h.change({ ...DEFAULT_LAYOUT, gutter: 12 }, 1000)
    expect(h.get().gutter).toBe(12)
    h.stack.undo()
    expect(h.get().gutter).toBe(DEFAULT_LAYOUT.gutter)
  })

  it('★ 슬라이더를 한 번 끄는 것이 되돌리기 한 번이다', () => {
    const h = harness()
    // 같은 항목을 잇달아 40번 만진다
    for (let i = 1; i <= 40; i += 1) h.change(withMargin(20 + i), 1000 + i * 10)
    expect(h.get().margin.inner).toBe(60)
    h.stack.undo()
    // **처음 값**으로 한 번에 돌아간다
    expect(h.get().margin.inner).toBe(DEFAULT_LAYOUT.margin.inner)
    expect(h.stack.canUndo()).toBe(false)
  })

  it('뜸해지면 별개의 조작이다 — 1초 넘게 손을 놓았으면 따로 센다', () => {
    const h = harness()
    h.change(withMargin(30), 1000)
    h.change(withMargin(40), 1000 + 5000)
    h.stack.undo()
    expect(h.get().margin.inner).toBe(30)
    h.stack.undo()
    expect(h.get().margin.inner).toBe(DEFAULT_LAYOUT.margin.inner)
  })

  it('다른 항목이면 묶지 않는다', () => {
    const h = harness()
    h.change(withMargin(30), 1000)
    h.change({ ...withMargin(30), gutter: 12 }, 1010)
    h.stack.undo()
    expect(h.get().gutter).toBe(DEFAULT_LAYOUT.gutter)
    expect(h.get().margin.inner).toBe(30)
  })

  it('★ 되돌린 뒤의 조작이 되돌린 명령에 흡수되지 않는다', () => {
    const h = harness()
    h.change(withMargin(30), 1000)
    h.stack.undo()
    breakMerge(h.ref)
    h.change(withMargin(45), 1100)
    expect(h.get().margin.inner).toBe(45)
    h.stack.undo()
    expect(h.get().margin.inner).toBe(DEFAULT_LAYOUT.margin.inner)
  })

  it('다시하기로 되돌아온다', () => {
    const h = harness()
    h.change({ ...DEFAULT_LAYOUT, columns: 1 }, 1000)
    h.stack.undo()
    expect(h.get().columns).toBe(2)
    h.stack.redo()
    expect(h.get().columns).toBe(1)
  })
})
