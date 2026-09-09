/** 드래그 규칙 — «끌어다 놓으면 조판된다»가 이 제품의 1번 핵심 가치다 (PP§5.1).
 *  규칙을 순수 함수로 뽑아 두었으므로 DOM 없이 잰다. */
import { describe, expect, it } from 'vitest'
import { autoScrollSpeed, AUTOSCROLL_EDGE_PX, AUTOSCROLL_MAX_PPS, isBefore, resolveDrop } from '@/screens/S04Paper/dnd'
import type { PaperItem } from '@/domain/types'

const q = (id: string): PaperItem => ({ kind: 'question', questionId: id })
const group = (passageId: string, children: string[]): PaperItem => ({
  kind: 'passageGroup',
  passageId,
  children: children.map((questionId) => ({ questionId })),
  splitPolicy: 'together',
})

describe('드롭 위치', () => {
  const items = [q('a'), q('b'), q('c')]

  it('위쪽 절반에 놓으면 그 앞에', () => {
    expect(resolveDrop({ items, overIndex: 1, before: true, fromTrayQuestionId: 'z' })).toEqual({
      kind: 'insert',
      index: 1,
    })
  })

  it('아래쪽 절반에 놓으면 그 뒤에', () => {
    expect(resolveDrop({ items, overIndex: 1, before: false, fromTrayQuestionId: 'z' })).toEqual({
      kind: 'insert',
      index: 2,
    })
  })

  it('★ 지면 밖으로 끌어내면 시험지에서 뺀다', () => {
    expect(resolveDrop({ items, overIndex: null, before: true, fromTrayQuestionId: null })).toEqual({
      kind: 'remove',
    })
  })

  it('트레이에서 끌어와 지면 밖에 놓으면 아무 일도 없다', () => {
    expect(
      resolveDrop({ items, overIndex: null, before: true, fromTrayQuestionId: 'z' }).kind,
    ).toBe('blocked')
  })

  it('★ 이미 담긴 문항은 다시 담기지 않는다 — 두 번 인쇄된다', () => {
    expect(resolveDrop({ items, overIndex: 0, before: true, fromTrayQuestionId: 'a' })).toEqual({
      kind: 'blocked',
      reason: 'already-placed',
    })
  })

  it('묶음 안의 문항도 «이미 담긴» 것으로 본다', () => {
    const withGroup = [group('p1', ['x'])]
    expect(
      resolveDrop({ items: withGroup, overIndex: 0, before: true, fromTrayQuestionId: 'x' }).kind,
    ).toBe('blocked')
  })

  it('★ 묶음 **앞뒤**에는 놓을 수 있다 — 내부는 구조적으로 불가능하다', () => {
    const withGroup = [group('p1', ['x']), q('y')]
    expect(
      resolveDrop({ items: withGroup, overIndex: 0, before: false, fromTrayQuestionId: 'z' }),
    ).toEqual({ kind: 'insert', index: 1 })
  })
})

describe('절반 판정', () => {
  const rect = { top: 100, height: 50 }
  it('위쪽 절반', () => {
    expect(isBefore(110, rect)).toBe(true)
  })
  it('아래쪽 절반', () => {
    expect(isBefore(140, rect)).toBe(false)
  })
  it('정확히 가운데는 아래쪽으로 본다', () => {
    expect(isBefore(125, rect)).toBe(false)
  })
})

describe('가장자리 자동 스크롤 (SS§6.4)', () => {
  const rect = { top: 0, bottom: 500 }

  it('가운데서는 스크롤하지 않는다', () => {
    expect(autoScrollSpeed(250, rect)).toBe(0)
  })

  it('★ 가장자리에 가까울수록 빨라진다', () => {
    const near = Math.abs(autoScrollSpeed(5, rect))
    const far = Math.abs(autoScrollSpeed(35, rect))
    expect(near).toBeGreaterThan(far)
  })

  it('위쪽 가장자리는 음수(위로), 아래쪽은 양수(아래로)', () => {
    expect(autoScrollSpeed(5, rect)).toBeLessThan(0)
    expect(autoScrollSpeed(495, rect)).toBeGreaterThan(0)
  })

  it('최대 속도를 넘지 않는다', () => {
    expect(Math.abs(autoScrollSpeed(0, rect))).toBeLessThanOrEqual(AUTOSCROLL_MAX_PPS)
  })

  it('가장자리 폭은 40px 다', () => {
    expect(AUTOSCROLL_EDGE_PX).toBe(40)
    expect(autoScrollSpeed(AUTOSCROLL_EDGE_PX + 1, rect)).toBe(0)
  })
})
