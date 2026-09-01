/** zz-0 D3 — 되돌리기는 command 패턴.
 *
 *  «초기에 안 잡으면 못 넣는다»(PP§9.3). zz-0 은 스택과 인터페이스만 세우고
 *  각 영역이 자기 command 를 등록한다.
 *
 *  두 가지를 지킨다:
 *  1. **문서 상태에만** 걸린다. 저장과 무관하다 — 저장 후에도 되돌릴 수 있고,
 *     되돌리면 그 상태가 다시 저장된다 (한글과 같은 감각)
 *  2. 스택은 **세션 한정**이며 파일에 담지 않는다 (SS§9.3) */

export interface Command {
  /** 되돌리기 UI·`aria-live` 가 읽는다 */
  label: string
  do(): void
  undo(): void
}

/** 스택을 비우는 경계. 왜 비웠는지 사용자에게 알려야 한다 (PP§9.3). */
export type UndoBoundary =
  | 'file-open'
  | 'public-pc-exit'
  /** S-02 확정 — 되돌릴 대상 자체가 ImportSession → Question 으로 바뀐다.
   *  확정 후 Cmd+Z 로 문항 24개가 사라지면 안 된다 (zz-4 D8) */
  | 'import-commit'

export interface UndoState {
  past: Command[]
  future: Command[]
}

export interface UndoStack {
  push(cmd: Command): void
  undo(): Command | null
  redo(): Command | null
  canUndo(): boolean
  canRedo(): boolean
  /** 경계에서 스택을 비운다.
   *  @returns 실제로 버린 조작 수. **0 이 아니면 사용자에게 알려야 한다** —
   *  «되돌리기가 왜 안 되지»를 남기지 않는 것이 D3 의 요구다 */
  clear(boundary: UndoBoundary): number
  peek(): { undo: string | null; redo: string | null }
  subscribe(fn: (s: UndoState) => void): () => void
}

const MAX_DEPTH = 100

export function createUndoStack(): UndoStack {
  let past: Command[] = []
  let future: Command[] = []
  const listeners = new Set<(s: UndoState) => void>()
  const emit = () => {
    const snapshot: UndoState = { past: [...past], future: [...future] }
    listeners.forEach((fn) => fn(snapshot))
  }

  return {
    push(cmd) {
      cmd.do()
      past.push(cmd)
      // 새 조작이 들어오면 redo 갈래는 버린다 — 분기를 만들지 않는다
      future = []
      if (past.length > MAX_DEPTH) past.shift()
      emit()
    },
    undo() {
      const cmd = past.pop()
      if (!cmd) return null
      cmd.undo()
      future.push(cmd)
      emit()
      return cmd
    },
    redo() {
      const cmd = future.pop()
      if (!cmd) return null
      cmd.do()
      past.push(cmd)
      emit()
      return cmd
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      const discarded = past.length + future.length
      past = []
      future = []
      emit()
      return discarded
    },
    peek: () => ({
      undo: past.at(-1)?.label ?? null,
      redo: future.at(-1)?.label ?? null,
    }),
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
