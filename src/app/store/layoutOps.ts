/** 설정 변경을 **되돌릴 수 있는 조작**으로 만든다 (zz-8 D3 · zz-0 D2·D3).
 *
 *  설정은 문서 상태다(`Paper.layout`). 그러니 되돌리기 대상이다 —
 *  «여백을 잘못 만졌는데 원래 값이 뭐였는지 기억이 안 난다»가 이 기능의 이유다.
 *
 *  ★ **연속 조작은 하나로 묶는다.** 슬라이더를 한 번 끄는 동안 값이 40번 바뀌는데
 *  그걸 40번 되돌리게 만들면 `Cmd+Z` 가 쓸모없어진다. 같은 항목을 이어서 만지면
 *  마지막 상태만 남기고 **처음 값**으로 되돌린다. */
import type { PaperLayout } from '@/domain/types'
import type { Command, UndoStack } from '@/app/undo'

export interface LayoutChange {
  /** 어떤 항목인가 — 묶음 판정에 쓴다 (`margin.inner` 처럼 경로로) */
  field: string
  /** 사용자에게 읽어 줄 이름 */
  label: string
  before: PaperLayout
  after: PaperLayout
  apply(next: PaperLayout): void
}

/** 무엇이 바뀌었나. **묶기 판정에만 쓴다** — 같은 항목을 이어 만지면 한 번으로 친다.
 *  여러 개가 한꺼번에 바뀌면 묶지 않는다(`'multi'`) */
export function changedField(before: PaperLayout, after: PaperLayout): string {
  const changed: string[] = []
  for (const key of Object.keys(after) as (keyof PaperLayout)[]) {
    if (key === 'margin') {
      for (const side of ['top', 'bottom', 'inner', 'outer'] as const) {
        if (before.margin[side] !== after.margin[side]) changed.push(`margin.${side}`)
      }
      continue
    }
    if (before[key] !== after[key]) changed.push(key)
  }
  if (changed.length === 1) return changed[0] as string
  return changed.length === 0 ? 'none' : 'multi'
}

/** 이어진 조작으로 볼 시간(ms). 이보다 뜸하면 별개의 조작이다 */
const MERGE_WINDOW_MS = 1200

export interface LayoutCommand extends Command {
  readonly field: string
  /** 이 명령에 이어 붙일 수 있는가 */
  absorb(change: LayoutChange, now: number): boolean
}

function isLayoutCommand(cmd: Command | null): cmd is LayoutCommand {
  return cmd !== null && 'absorb' in cmd
}

/** 되돌리기 스택에 설정 변경을 넣는다. **직전 것과 이어지면 합친다** */
export function pushLayoutChange(
  stack: UndoStack,
  change: LayoutChange,
  now: number,
  lastRef: { current: LayoutCommand | null },
): void {
  const previous = lastRef.current
  if (isLayoutCommand(previous) && previous.absorb(change, now)) {
    // 합쳤다 — 스택에 새로 쌓지 않는다
    change.apply(change.after)
    return
  }

  let latest = change.after
  let at = now
  const command: LayoutCommand = {
    field: change.field,
    label: change.label,
    do: () => change.apply(latest),
    undo: () => change.apply(change.before),
    absorb(next, when) {
      // 여러 항목이 한꺼번에 바뀐 조작은 묶지 않는다 — 무엇을 되돌리는지 흐려진다
      if (next.field === 'multi' || change.field === 'multi') return false
      if (next.field !== change.field) return false
      if (when - at > MERGE_WINDOW_MS) return false
      latest = next.after
      at = when
      return true
    },
  }
  lastRef.current = command
  stack.push(command)
}

/** 되돌리기·다시하기가 끝났으면 **묶기를 끊는다.**
 *  안 끊으면 되돌린 뒤의 조작이 되돌린 명령에 흡수돼 스택이 꼬인다. */
export function breakMerge(lastRef: { current: LayoutCommand | null }): void {
  lastRef.current = null
}
