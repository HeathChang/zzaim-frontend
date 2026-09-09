/** 시험지 아이템 조작 — **순수 함수다.**
 *
 *  되돌리기가 문서 상태에만 걸리므로(PP§9.3), 조작은 «이전 배열 → 다음 배열»이어야
 *  한다. 그래야 되돌리기가 «이전 배열로 되돌리기»로 끝난다. */
import type { PaperItem } from '@/domain/types'

/** 묶음 안에 다른 문항을 끼울 수 없다 — 지문과 종속 문항 사이가 벌어지면
 *  **답 없는 문항이 인쇄된다** (SS§6.4 «묶음 문항 내부: 삽입 불가 ⊘») */
export function canInsertAt(items: readonly PaperItem[], index: number): boolean {
  // 묶음은 하나의 아이템이므로 «내부»는 인덱스로 표현되지 않는다.
  // 삽입 지점이 유효 범위인지만 본다
  return index >= 0 && index <= items.length
}

export function insertAt(
  items: readonly PaperItem[],
  index: number,
  item: PaperItem,
): PaperItem[] {
  if (!canInsertAt(items, index)) return [...items]
  return [...items.slice(0, index), item, ...items.slice(index)]
}

export function removeAt(items: readonly PaperItem[], index: number): PaperItem[] {
  if (index < 0 || index >= items.length) return [...items]
  return [...items.slice(0, index), ...items.slice(index + 1)]
}

/** 순서 이동. `Alt+↑/↓` 와 드래그가 같은 함수를 쓴다 */
export function moveItem(items: readonly PaperItem[], from: number, to: number): PaperItem[] {
  if (from === to || from < 0 || from >= items.length) return [...items]
  const clamped = Math.max(0, Math.min(items.length - 1, to))
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (!moved) return [...items]
  next.splice(clamped, 0, moved)
  return next
}

/** `Shift+K` — 다음 아이템과 같은 단에 묶는다 */
export function toggleKeepWithNext(items: readonly PaperItem[], index: number): PaperItem[] {
  const target = items[index]
  if (!target || target.kind !== 'question') return [...items]
  const next = [...items]
  next[index] = { ...target, keepWithNext: !target.keepWithNext }
  return next
}

/** `Alt+P` — 이 시험지에서만 배점을 바꾼다.
 *  **원본 문항의 배점은 건드리지 않는다** — 다른 시험지에 영향이 가면 안 된다 (PD-07) */
export function setOverridePoints(
  items: readonly PaperItem[],
  index: number,
  points: number | null,
): PaperItem[] {
  const target = items[index]
  if (!target || target.kind !== 'question') return [...items]
  const next = [...items]
  if (points === null) {
    // 재정의를 **걷어낸다** — `undefined` 로 두면 파일에 `"overridePoints": null` 이
    // 남아 «0점»과 구분되지 않는다
    const rest = { ...target }
    delete rest.overridePoints
    next[index] = rest
  } else {
    next[index] = { ...target, overridePoints: points }
  }
  return next
}

/** 이미 담긴 문항인가 — 두 번 담으면 같은 문항이 두 번 인쇄된다 */
export function isAlreadyPlaced(items: readonly PaperItem[], questionId: string): boolean {
  return items.some(
    (i) =>
      (i.kind === 'question' && i.questionId === questionId) ||
      (i.kind === 'passageGroup' && i.children.some((c) => c.questionId === questionId)),
  )
}

/** 배점 합계. 시험지별 재정의가 있으면 그것을 쓴다 */
export function totalPoints(
  items: readonly PaperItem[],
  pointsOf: (questionId: string) => number | null,
): number {
  let sum = 0
  for (const item of items) {
    if (item.kind === 'question') {
      sum += item.overridePoints ?? pointsOf(item.questionId) ?? 0
    } else if (item.kind === 'passageGroup') {
      for (const c of item.children) sum += c.overridePoints ?? pointsOf(c.questionId) ?? 0
    }
  }
  return sum
}

/** 지문 없이 담긴 종속 문항 — «답 없는 문항이 인쇄된다» (SS§6.5) */
export function orphanQuestions(
  items: readonly PaperItem[],
  passageIdOf: (questionId: string) => string | null,
): string[] {
  const placedPassages = new Set(
    items.flatMap((i) => (i.kind === 'passageGroup' ? [i.passageId] : [])),
  )
  const orphans: string[] = []
  for (const item of items) {
    if (item.kind !== 'question') continue
    const passageId = passageIdOf(item.questionId)
    if (passageId && !placedPassages.has(passageId)) orphans.push(item.questionId)
  }
  return orphans
}
