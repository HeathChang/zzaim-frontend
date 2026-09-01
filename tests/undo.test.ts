/** zz-0 D3 — 되돌리기 스택. «세션 한정, 문서 상태에만». */
import { describe, expect, it, vi } from 'vitest'
import { createUndoStack } from '@/app/undo'

function cmd(label: string, log: string[]) {
  return {
    label,
    do: () => log.push(`do:${label}`),
    undo: () => log.push(`undo:${label}`),
  }
}

describe('되돌리기 스택', () => {
  it('push 는 즉시 실행한다', () => {
    const log: string[] = []
    const s = createUndoStack()
    s.push(cmd('a', log))
    expect(log).toEqual(['do:a'])
  })

  it('undo → redo 가 왕복한다', () => {
    const log: string[] = []
    const s = createUndoStack()
    s.push(cmd('a', log))
    s.undo()
    s.redo()
    expect(log).toEqual(['do:a', 'undo:a', 'do:a'])
  })

  it('새 조작이 들어오면 redo 갈래를 버린다 — 분기를 만들지 않는다', () => {
    const log: string[] = []
    const s = createUndoStack()
    s.push(cmd('a', log))
    s.undo()
    s.push(cmd('b', log))
    expect(s.canRedo()).toBe(false)
  })

  it('빈 스택에서 undo·redo 는 null 이다', () => {
    const s = createUndoStack()
    expect(s.undo()).toBeNull()
    expect(s.redo()).toBeNull()
  })

  it('경계에서 스택을 비운다 — S-02 확정 후 Cmd+Z 로 문항이 사라지면 안 된다', () => {
    const log: string[] = []
    const s = createUndoStack()
    s.push(cmd('a', log))
    s.clear('import-commit')
    expect(s.canUndo()).toBe(false)
    expect(s.undo()).toBeNull()
  })

  it('깊이 상한을 넘으면 가장 오래된 것부터 버린다', () => {
    const log: string[] = []
    const s = createUndoStack()
    for (let i = 0; i < 105; i += 1) s.push(cmd(`c${i}`, log))
    let count = 0
    while (s.undo()) count += 1
    expect(count).toBe(100)
  })

  it('구독자가 상태 변화를 받는다', () => {
    const log: string[] = []
    const s = createUndoStack()
    const fn = vi.fn()
    const off = s.subscribe(fn)
    s.push(cmd('a', log))
    expect(fn).toHaveBeenCalled()
    off()
    s.push(cmd('b', log))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('peek 은 다음에 되돌릴 것의 이름을 준다 — aria-live 가 읽는다', () => {
    const log: string[] = []
    const s = createUndoStack()
    s.push(cmd('문항 이동', log))
    expect(s.peek().undo).toBe('문항 이동')
  })
})

describe('경계에서 비우기는 «몇 개를 버렸는지»를 준다', () => {
  it('버린 개수를 돌려준다 — 0 이 아니면 사용자에게 알려야 한다 (D3)', () => {
    const log: string[] = []
    const s = createUndoStack()
    s.push(cmd('a', log))
    s.push(cmd('b', log))
    s.undo()
    expect(s.clear('file-open')).toBe(2)
  })

  it('비어 있으면 0 — 알릴 것이 없다', () => {
    expect(createUndoStack().clear('file-open')).toBe(0)
  })
})
