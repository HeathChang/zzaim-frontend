/** 배치 조작과 키보드 등가물 — **드래그 없이도 전부 되는가.**
 *  «모든 배치 조작에 키보드 등가물을 둔다»(PP§10)는 접근성 요구이자
 *  빠른 사용자의 주 경로다. */
import { describe, expect, it } from 'vitest'
import {
  canInsertAt,
  insertAt,
  isAlreadyPlaced,
  moveItem,
  orphanQuestions,
  removeAt,
  setOverridePoints,
  toggleKeepWithNext,
  totalPoints,
} from '@/app/store/paperOps'
import { applyAction, movePageTarget, resolveKey } from '@/screens/S04Paper/keyboardOps'
import type { PaperItem } from '@/domain/types'

const q = (id: string, over?: Partial<Extract<PaperItem, { kind: 'question' }>>): PaperItem => ({
  kind: 'question',
  questionId: id,
  ...over,
})

const group = (passageId: string, children: string[]): PaperItem => ({
  kind: 'passageGroup',
  passageId,
  children: children.map((questionId) => ({ questionId })),
  splitPolicy: 'together',
})

const key = (init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent =>
  new KeyboardEvent('keydown', init)

describe('아이템 조작', () => {
  it('삽입·삭제·이동', () => {
    let items = [q('a'), q('b')]
    items = insertAt(items, 1, q('c'))
    expect(items.map((i) => (i.kind === 'question' ? i.questionId : ''))).toEqual(['a', 'c', 'b'])
    items = removeAt(items, 1)
    expect(items).toHaveLength(2)
    items = moveItem(items, 0, 1)
    expect(items.map((i) => (i.kind === 'question' ? i.questionId : ''))).toEqual(['b', 'a'])
  })

  it('범위 밖 이동은 끝으로 잘린다 — 목록이 깨지지 않는다', () => {
    const items = [q('a'), q('b')]
    expect(moveItem(items, 0, 99)).toHaveLength(2)
    expect(moveItem(items, 99, 0)).toEqual(items)
  })

  it('삽입 지점이 유효한지 본다', () => {
    expect(canInsertAt([q('a')], 0)).toBe(true)
    expect(canInsertAt([q('a')], 1)).toBe(true)
    expect(canInsertAt([q('a')], 2)).toBe(false)
  })

  it('Shift+K — 다음과 같은 단에 묶는다', () => {
    const items = toggleKeepWithNext([q('a')], 0)
    expect(items[0]).toMatchObject({ keepWithNext: true })
    expect(toggleKeepWithNext(items, 0)[0]).toMatchObject({ keepWithNext: false })
  })

  it('★ 배점 재정의는 이 시험지에만 — 원본 문항은 건드리지 않는다 (PD-07)', () => {
    const items = setOverridePoints([q('a')], 0, 5)
    expect(items[0]).toMatchObject({ questionId: 'a', overridePoints: 5 })
    // null 을 주면 재정의를 걷어내고 원본 배점으로 돌아간다
    expect(setOverridePoints(items, 0, null)[0]).not.toHaveProperty('overridePoints')
  })

  it('이미 담긴 문항을 알아본다 — 두 번 담으면 두 번 인쇄된다', () => {
    const items = [q('a'), group('p1', ['b', 'c'])]
    expect(isAlreadyPlaced(items, 'a')).toBe(true)
    expect(isAlreadyPlaced(items, 'c')).toBe(true)
    expect(isAlreadyPlaced(items, 'z')).toBe(false)
  })
})

describe('배점 합계', () => {
  const pointsOf = (id: string) => ({ a: 3, b: 4, c: 5 })[id] ?? null

  it('원본 배점을 더한다', () => {
    expect(totalPoints([q('a'), q('b')], pointsOf)).toBe(7)
  })

  it('재정의가 있으면 그것을 쓴다', () => {
    expect(totalPoints([q('a', { overridePoints: 10 })], pointsOf)).toBe(10)
  })

  it('묶음 안의 문항도 센다', () => {
    expect(totalPoints([group('p1', ['a', 'b'])], pointsOf)).toBe(7)
  })

  it('배점 모르는 문항은 0으로 센다 — 합계가 NaN 이 되면 안 된다', () => {
    expect(totalPoints([q('zzz')], pointsOf)).toBe(0)
  })
})

describe('★ 지문 없는 종속 문항 — 답 없는 문항이 인쇄된다 (SS§6.5)', () => {
  const passageIdOf = (id: string) => (id === 'child' ? 'p1' : null)

  it('지문 없이 종속 문항만 담으면 집어낸다', () => {
    expect(orphanQuestions([q('child')], passageIdOf)).toEqual(['child'])
  })

  it('지문이 함께 담겨 있으면 문제없다', () => {
    expect(orphanQuestions([group('p1', ['child']), q('child')], passageIdOf)).toEqual([])
  })

  it('독립 문항은 대상이 아니다', () => {
    expect(orphanQuestions([q('solo')], passageIdOf)).toEqual([])
  })
})

describe('키보드 등가물 8종 (zz-5 D1)', () => {
  const ctx = { cursor: 2, itemCount: 5, trayFocused: false }

  it('① 트레이에서 Enter = 커서 위치에 삽입', () => {
    expect(resolveKey(key({ key: 'Enter' }), { ...ctx, trayFocused: true })).toEqual({
      kind: 'insert',
    })
  })

  it('② Alt+↑↓ = 순서 이동', () => {
    expect(resolveKey(key({ key: 'ArrowUp', altKey: true }), ctx)).toEqual({
      kind: 'move',
      from: 2,
      to: 1,
    })
    expect(resolveKey(key({ key: 'ArrowDown', altKey: true }), ctx)).toEqual({
      kind: 'move',
      from: 2,
      to: 3,
    })
  })

  it('③ Alt+PageUp/Down = 쪽 넘겨 이동', () => {
    expect(resolveKey(key({ key: 'PageDown', altKey: true }), ctx)).toEqual({
      kind: 'movePage',
      direction: 1,
    })
  })

  it('④ Delete = 제거', () => {
    expect(resolveKey(key({ key: 'Delete' }), ctx)).toEqual({ kind: 'remove', index: 2 })
  })

  it('⑤ ↑↓ = 커서 이동, 범위를 넘지 않는다', () => {
    expect(resolveKey(key({ key: 'ArrowUp' }), { ...ctx, cursor: 0 })).toEqual({
      kind: 'cursor',
      next: 0,
    })
    expect(resolveKey(key({ key: 'ArrowDown' }), { ...ctx, cursor: 4 })).toEqual({
      kind: 'cursor',
      next: 4,
    })
  })

  it('⑥ Shift+K = 다음과 묶기', () => {
    expect(resolveKey(key({ key: 'K', shiftKey: true }), ctx)).toEqual({
      kind: 'keepWithNext',
      index: 2,
    })
  })

  it('⑦ Alt+P = 배점 수정', () => {
    expect(resolveKey(key({ key: 'p', altKey: true }), ctx)).toEqual({
      kind: 'editPoints',
      index: 2,
    })
  })

  it('⑧ E = 편집 패널 열기', () => {
    expect(resolveKey(key({ key: 'e' }), ctx)).toEqual({ kind: 'openEditor', index: 2 })
  })

  it('★ Cmd/Ctrl 조합은 화면이 가로채지 않는다 — 저장·되돌리기는 전역이다', () => {
    expect(resolveKey(key({ key: 's', metaKey: true }), ctx)).toBeNull()
    expect(resolveKey(key({ key: 'z', ctrlKey: true }), ctx)).toBeNull()
  })
})

describe('조작 적용', () => {
  it('이동을 실제로 반영한다', () => {
    const items = [q('a'), q('b'), q('c')]
    const out = applyAction(items, { kind: 'move', from: 0, to: 2 })
    expect(out.map((i) => (i.kind === 'question' ? i.questionId : ''))).toEqual(['b', 'c', 'a'])
  })

  it('커서 이동은 아이템을 바꾸지 않는다', () => {
    const items = [q('a')]
    expect(applyAction(items, { kind: 'cursor', next: 0 })).toEqual(items)
  })

  it('★ 쪽 넘겨 이동은 여기서 처리하지 않는다 — 배치 결과를 알아야 답할 수 있다', () => {
    const items = [q('a'), q('b')]
    expect(applyAction(items, { kind: 'movePage', direction: 1 })).toEqual(items)
  })

  it('쪽 목표는 배치 결과에서 구한다', () => {
    // 아이템 0,1 은 1쪽 / 2,3 은 2쪽
    const pageOfItem = [1, 1, 2, 2]
    expect(movePageTarget(pageOfItem, 0, 1)).toBe(2)
    expect(movePageTarget(pageOfItem, 3, -1)).toBe(0)
  })

  it('마지막 쪽에서 더 넘기면 끝에 붙는다', () => {
    expect(movePageTarget([1, 1], 0, 1)).toBe(1)
  })
})
