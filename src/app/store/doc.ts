/** 문서 상태 — **되돌리기가 걸리는 유일한 스토어**다 (zz-0 D2 · PP§9.3).
 *  파일(.etp)에 그대로 담기는 것이 여기 있다. */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Paper, Passage, Question } from '@/domain/types'

export interface DocState {
  /** 문항 은행 — **화면(S-03)이 아니라 데이터**다. 보관함 화면이 없어도 존재한다 */
  questions: Record<string, Question>
  passages: Record<string, Passage>
  papers: Record<string, Paper>
  activePaperId: string | null
}

export interface DocActions {
  reset(): void
  load(next: DocState): void
  upsertQuestion(q: Question): void
  upsertPassage(p: Passage): void
  upsertPaper(p: Paper): void
  setActivePaper(id: string | null): void
}

export const emptyDoc = (): DocState => ({
  questions: {},
  passages: {},
  papers: {},
  activePaperId: null,
})

export const useDocStore = create<DocState & DocActions>()(
  immer((set) => ({
    ...emptyDoc(),
    reset: () => set(() => emptyDoc()),
    load: (next) => set(() => ({ ...next })),
    upsertQuestion: (q) =>
      set((s) => {
        s.questions[q.id] = q
      }),
    upsertPassage: (p) =>
      set((s) => {
        s.passages[p.id] = p
      }),
    upsertPaper: (p) =>
      set((s) => {
        s.papers[p.id] = p
      }),
    setActivePaper: (id) =>
      set((s) => {
        s.activePaperId = id
      }),
  })),
)
