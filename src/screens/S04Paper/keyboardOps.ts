/** 키보드 등가물 **8종** (zz-5 D1 · SS§6.4 · PP§10).
 *
 *  «드래그 앤 드롭은 편의이지 유일 경로가 아니다» — 드래그가 어려운 사용자를 위한
 *  배려이자, **마우스에서 손을 떼지 않으려는 빠른 사용자의 주 경로**이기도 하다.
 *
 *  순수 함수로 둔 이유: «Alt+↓ 를 누르면 무엇이 일어나는가»를 DOM 없이 검증할 수
 *  있어야 한다. 8종이 전부 도는지는 표의 오른쪽 열이 채워졌는지로 판단된다. */
import { moveItem, removeAt, toggleKeepWithNext } from '@/app/store/paperOps'
import type { PaperItem } from '@/domain/types'
import { strings } from '@/app/strings'

export type PaperAction =
  | { kind: 'insert' }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'movePage'; direction: -1 | 1 }
  | { kind: 'remove'; index: number }
  | { kind: 'cursor'; next: number }
  | { kind: 'keepWithNext'; index: number }
  | { kind: 'editPoints'; index: number }
  | { kind: 'openEditor'; index: number }
  | null

export interface KeyContext {
  cursor: number
  itemCount: number
  /** 좌측 트레이에 포커스가 있는가 — `Enter` 의 뜻이 달라진다 */
  trayFocused: boolean
}

/** 키 하나를 «무엇을 할지»로 옮긴다. **상태를 바꾸지 않는다.** */
export function resolveKey(e: KeyboardEvent, ctx: KeyContext): PaperAction {
  const { cursor, itemCount, trayFocused } = ctx
  const key = e.key

  // 트레이에서 Enter = 커서 위치에 삽입 (SS§6.4)
  if (key === 'Enter' && trayFocused) return { kind: 'insert' }

  if (e.altKey) {
    switch (key) {
      case 'ArrowUp':
        return { kind: 'move', from: cursor, to: cursor - 1 }
      case 'ArrowDown':
        return { kind: 'move', from: cursor, to: cursor + 1 }
      case 'PageUp':
        return { kind: 'movePage', direction: -1 }
      case 'PageDown':
        return { kind: 'movePage', direction: 1 }
      case 'p':
      case 'P':
        return { kind: 'editPoints', index: cursor }
      default:
        return null
    }
  }

  if (e.metaKey || e.ctrlKey) return null

  switch (key) {
    case 'ArrowUp':
      return { kind: 'cursor', next: Math.max(0, cursor - 1) }
    case 'ArrowDown':
      return { kind: 'cursor', next: Math.min(itemCount - 1, cursor + 1) }
    case 'Delete':
    case 'Backspace':
      return { kind: 'remove', index: cursor }
    case 'K':
      // `Shift+K` — 다음과 같은 단에 묶는다
      return e.shiftKey ? { kind: 'keepWithNext', index: cursor } : null
    case 'e':
    case 'E':
      // S-02 의 `E`(본문 펼치기)와 결이 같다 (HO§키보드:403)
      return { kind: 'openEditor', index: cursor }
    default:
      return null
  }
}

/** 조작을 실제로 적용한다. 화면은 이 결과를 스토어에 넣기만 한다 */
export function applyAction(
  items: readonly PaperItem[],
  action: PaperAction,
  /** 삽입할 것 (트레이에서 고른 문항) */
  pending?: PaperItem,
): PaperItem[] {
  if (!action) return [...items]
  switch (action.kind) {
    case 'insert':
      return pending ? [...items, pending] : [...items]
    case 'move':
      return moveItem(items, action.from, action.to)
    case 'remove':
      return removeAt(items, action.index)
    case 'keepWithNext':
      return toggleKeepWithNext(items, action.index)
    case 'movePage':
      // ⚠ 여기서는 처리할 수 없다. «다음 쪽이 어디인가»는 **배치 결과**를 알아야
      // 답할 수 있고, 그건 조판 엔진의 것이다. 화면이 `movePageTarget()` 으로
      // 목표 인덱스를 구해 `move` 로 바꿔 넘긴다
      return [...items]
    case 'editPoints':
    case 'openEditor':
    case 'cursor':
      // 상태만 바뀐다 — 아이템은 그대로
      return [...items]
  }
}

/** 쪽 넘겨 이동 — 배치 결과를 알아야 «다음 쪽»이 어디인지 안다.
 *  조판 엔진이 준 페이지 배열에서 현재 아이템의 쪽을 찾아 그 앞/뒤로 옮긴다. */
export function movePageTarget(
  pageOfItem: readonly number[],
  cursor: number,
  direction: -1 | 1,
): number {
  const currentPage = pageOfItem[cursor]
  if (currentPage === undefined) return cursor
  const wanted = currentPage + direction
  // 목표 쪽의 첫 아이템 위치
  const target = pageOfItem.findIndex((p) => p === wanted)
  if (target === -1) return direction > 0 ? pageOfItem.length - 1 : 0
  return target
}

/** `aria-live` 로 읽을 문구를 만든다 (SS§6.7).
 *  «12번 문항을 2쪽 1단 세 번째로 옮겼습니다» */
export interface PlacementDescription {
  number: number | null
  page: number
  column: number
  order: number
}

/** ★ 예전에는 이 함수가 **받은 것을 그대로 돌려주는 껍데기**였다.
 *  «옮겼습니다» 문장이 명세에 있는데 아무도 읽어 주지 않는 상태 —
 *  «마우스 없이도 된다»(PP§10)가 «옮겼는지 알 수 없다»로 끝나고 있었다. */
export function describePlacement(p: PlacementDescription): string {
  return strings.paperEdit.moved(p.number, p.page, p.column, p.order)
}
