/** zz-0 D10 — 단축키 우선순위. SS§1.5 의 규칙 두 줄이 전부다. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createShortcutRegistry, isTextEntry } from '@/app/shortcuts'

function key(init: Partial<KeyboardEvent> & { key: string }, target?: EventTarget): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
  if (target) Object.defineProperty(e, 'target', { value: target })
  return e
}

describe('입력칸 판별', () => {
  it('텍스트 입력·textarea·contenteditable 은 참', () => {
    const input = document.createElement('input')
    expect(isTextEntry(input)).toBe(true)
    expect(isTextEntry(document.createElement('textarea'))).toBe(true)
    const ce = document.createElement('div')
    ce.contentEditable = 'true'
    // jsdom 은 isContentEditable 을 구현하지 않아 속성으로 대신 본다
    Object.defineProperty(ce, 'isContentEditable', { value: true })
    expect(isTextEntry(ce)).toBe(true)
  })

  it('체크박스는 글자를 받지 않으므로 단축키를 막지 않는다', () => {
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    expect(isTextEntry(cb)).toBe(false)
  })
})

describe('우선순위', () => {
  let registry: ReturnType<typeof createShortcutRegistry>
  beforeEach(() => {
    registry = createShortcutRegistry()
  })

  it('화면별이 전역을 이긴다', () => {
    const g = vi.fn()
    const s = vi.fn()
    registry.registerGlobal([{ key: 'n', run: g }])
    registry.pushScreen([{ key: 'n', run: s }])
    registry.handle(key({ key: 'n' }))
    expect(s).toHaveBeenCalledOnce()
    expect(g).not.toHaveBeenCalled()
  })

  it('Esc 와 저장은 화면이 가로채도 전역이 이긴다 (SS§1.5 예외)', () => {
    const gEsc = vi.fn()
    const sEsc = vi.fn()
    registry.registerGlobal([{ key: 'escape', run: gEsc, worksInInput: true }])
    registry.pushScreen([{ key: 'escape', run: sEsc }])
    registry.handle(key({ key: 'Escape' }))
    expect(gEsc).toHaveBeenCalledOnce()
    expect(sEsc).not.toHaveBeenCalled()
  })

  it('화면을 pop 하면 전역으로 돌아온다', () => {
    const g = vi.fn()
    const s = vi.fn()
    registry.registerGlobal([{ key: 'n', run: g }])
    const pop = registry.pushScreen([{ key: 'n', run: s }])
    pop()
    registry.handle(key({ key: 'n' }))
    expect(g).toHaveBeenCalledOnce()
  })

  it('입력 중에는 한 글자 키를 삼키지 않는다', () => {
    const run = vi.fn()
    registry.pushScreen([{ key: 'n', run }])
    const input = document.createElement('input')
    registry.handle(key({ key: 'n' }, input))
    expect(run).not.toHaveBeenCalled()
  })

  it('입력 중에도 저장은 듣는다', () => {
    const run = vi.fn()
    registry.registerGlobal([{ key: 's', meta: true, worksInInput: true, run }])
    const input = document.createElement('input')
    registry.handle(key({ key: 's', metaKey: true }, input))
    expect(run).toHaveBeenCalledOnce()
  })

  it('조합키가 다르면 매치되지 않는다', () => {
    const run = vi.fn()
    registry.registerGlobal([{ key: 'p', meta: true, run }])
    registry.handle(key({ key: 'p' }))
    expect(run).not.toHaveBeenCalled()
  })
})
