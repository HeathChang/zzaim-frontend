/** S-02 의 상태 — 커서·확인함·되돌리기·통계를 한 곳에서 다룬다.
 *
 *  화면 컴포넌트에서 이걸 떼어 낸 이유: **6초 목표를 떠받치는 규칙들**(`N` 이동,
 *  손댄 곳 카운트, 되돌리기 시 차감)이 렌더 코드에 섞이면 검증할 수 없다. */
import { useCallback, useMemo, useState } from 'react'
import { drop, groupFrom, merge, split, toggleRole, type Grouping } from '@/importing/ops'
import { initialCursor, nextSuspect, suspectCount } from '@/importing/nextSuspect'
import { createStats, record, undoRecord, type StatsState } from '@/importing/stats'
import type { Segment } from '@/importing/types'

export type EditorAnnounce = { kind: 'wrapped' } | { kind: 'none' } | { kind: 'merged'; total: number } | null

export interface SegmentEditor {
  segments: Segment[]
  cursor: number
  confirmed: ReadonlySet<number>
  expanded: ReadonlySet<number>
  stats: StatsState
  suspects: number
  announce: EditorAnnounce
  moveCursor(delta: number): void
  jumpTo(index: number): void
  /** `N` — 이 화면의 핵심 키 */
  gotoNextSuspect(): void
  /** `Space` — 확인함 토글. **손댄 곳으로 세지 않는다** */
  toggleConfirmed(): void
  /** `E` — 본문 펼치기 (`Tab` 을 쓰지 않는다 — SS§1.6) */
  toggleExpanded(): void
  /** `G` — 지문에 이어지는 문항들을 묶는다.
   *  **`passageId` 가 없으면 보관함에서 지문 없는 문항이 미아가 된다** (PP§6.2) */
  makeGroup(): void
  groupings: Grouping[]
  mergeUp(): void
  splitAt(lineIndexes: number[]): void
  togglePassage(): void
  removeCurrent(): void
  setNumber(value: number | null): void
  setPoints(value: number | null): void
  undo(): boolean
  canUndo: boolean
}

interface Snapshot {
  segments: Segment[]
  cursor: number
  /** 이 조작이 통계에서 무엇으로 셌는지 — 되돌릴 때 차감하려면 알아야 한다 */
  counted: 'correction' | 'field'
}

export function useSegmentEditor(initial: readonly Segment[], now = () => Date.now()): SegmentEditor {
  const [segments, setSegments] = useState<Segment[]>([...initial])
  const [cursor, setCursor] = useState(() => initialCursor(initial))
  const [confirmed, setConfirmed] = useState<ReadonlySet<number>>(new Set())
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())
  const [stats, setStats] = useState<StatsState>(() => createStats(now()))
  const [history, setHistory] = useState<Snapshot[]>([])
  const [announce, setAnnounce] = useState<EditorAnnounce>(null)
  const [groupings, setGroupings] = useState<Grouping[]>([])

  const suspects = useMemo(
    () => suspectCount(segments, { confirmed }),
    [segments, confirmed],
  )

  /** 편집을 적용하고 되돌리기용 스냅샷을 남긴다 */
  const apply = useCallback(
    (next: Segment[], counted: Snapshot['counted'], nextCursor?: number) => {
      setHistory((h) => [...h, { segments, cursor, counted }])
      setSegments(next)
      if (nextCursor !== undefined) setCursor(Math.max(0, Math.min(next.length - 1, nextCursor)))
      else setCursor((c) => Math.max(0, Math.min(next.length - 1, c)))
      setStats((s) => record(s, counted, now()))
    },
    [segments, cursor, now],
  )

  return {
    segments,
    cursor,
    confirmed,
    expanded,
    stats,
    suspects,
    announce,
    canUndo: history.length > 0,

    moveCursor: (delta) =>
      setCursor((c) => Math.max(0, Math.min(segments.length - 1, c + delta))),
    jumpTo: (index) => setCursor(Math.max(0, Math.min(segments.length - 1, index))),

    gotoNextSuspect: () => {
      const r = nextSuspect(segments, cursor, { confirmed })
      if (r.none) {
        setAnnounce({ kind: 'none' })
        return
      }
      setCursor(r.index)
      setAnnounce(r.wrapped ? { kind: 'wrapped' } : null)
    },

    toggleConfirmed: () => {
      setConfirmed((prev) => {
        const next = new Set(prev)
        if (next.has(cursor)) next.delete(cursor)
        else next.add(cursor)
        return next
      })
      // ⚠ 경계를 고친 게 아니므로 **손댄 곳으로 세지 않는다** (zz-4 D5)
      setStats((s) => record(s, 'confirm', now()))
    },

    toggleExpanded: () =>
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(cursor)) next.delete(cursor)
        else next.add(cursor)
        return next
      }),

    groupings,

    makeGroup: () => {
      const g = groupFrom(segments, cursor)
      if (!g) return
      setGroupings((prev) => [
        // 같은 지문을 다시 묶으면 이전 것을 대체한다
        ...prev.filter((x) => x.passageIndex !== g.passageIndex),
        g,
      ])
      setStats((s) => record(s, 'correction', now()))
    },

    mergeUp: () => {
      if (cursor <= 0) return
      const next = merge(segments, cursor)
      apply(next, 'correction', cursor - 1)
      setAnnounce({ kind: 'merged', total: next.length })
    },

    splitAt: (lineIndexes) => {
      const next = split(segments, cursor, lineIndexes)
      if (next.length === segments.length) return
      apply(next, 'correction')
    },

    togglePassage: () => apply(toggleRole(segments, cursor), 'correction'),
    removeCurrent: () => apply(drop(segments, cursor), 'correction'),

    setNumber: (value) => {
      const target = segments[cursor]
      if (!target) return
      const next = [...segments]
      next[cursor] = { ...target, numberHint: value }
      apply(next, 'field')
    },
    setPoints: (value) => {
      const target = segments[cursor]
      if (!target) return
      const next = [...segments]
      next[cursor] = { ...target, points: value }
      apply(next, 'field')
    },

    undo: () => {
      const last = history.at(-1)
      if (!last) return false
      setHistory((h) => h.slice(0, -1))
      setSegments(last.segments)
      setCursor(last.cursor)
      // **되돌리면 차감한다** — 안 그러면 «고쳤다 되돌렸다»가 정확도를 깎는다
      setStats((s) => undoRecord(s, last.counted, now()))
      return true
    },
  }
}
