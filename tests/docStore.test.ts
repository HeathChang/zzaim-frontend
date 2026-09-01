/** 문서 스토어 — 되돌리기가 걸리는 유일한 곳. 파일에 그대로 담긴다. */
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDoc, useDocStore } from '@/app/store/doc'
import type { Question } from '@/domain/types'

const q = (id: string): Question => ({
  id,
  body: { kind: 'html', html: '<p>x</p>' },
  points: 3,
  numberHint: 1,
  numberBaked: false,
  hasCrossRef: false,
  passageId: null,
  tags: [],
  note: '',
  createdAt: 0,
  updatedAt: 0,
})

describe('doc 스토어', () => {
  beforeEach(() => useDocStore.setState(emptyDoc()))

  it('문항을 넣고 꺼낸다', () => {
    useDocStore.getState().upsertQuestion(q('a'))
    expect(useDocStore.getState().questions['a']?.points).toBe(3)
  })

  it('같은 id 는 덮어쓴다', () => {
    useDocStore.getState().upsertQuestion(q('a'))
    useDocStore.getState().upsertQuestion({ ...q('a'), points: 5 })
    expect(Object.keys(useDocStore.getState().questions)).toHaveLength(1)
    expect(useDocStore.getState().questions['a']?.points).toBe(5)
  })

  it('load 는 이전 문서를 남기지 않는다 — 남으면 다른 파일의 문항이 섞인다', () => {
    useDocStore.getState().upsertQuestion(q('a'))
    useDocStore.getState().load({ ...emptyDoc(), questions: { b: q('b') } })
    const s = useDocStore.getState()
    expect(s.questions['a']).toBeUndefined()
    expect(s.questions['b']).toBeDefined()
  })

  it('reset 은 전부 비운다 — 공용 PC 정리가 이걸 쓴다', () => {
    useDocStore.getState().upsertQuestion(q('a'))
    useDocStore.getState().setActivePaper('p1')
    useDocStore.getState().reset()
    expect(useDocStore.getState().questions).toEqual({})
    expect(useDocStore.getState().activePaperId).toBeNull()
  })
})
