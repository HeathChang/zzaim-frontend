/** 드래그 규칙 — **순수 함수로 뽑는다.**
 *
 *  «끌어다 놓으면 조판된다»가 이 제품의 1번 핵심 가치다(PP§5.1). 그런데 드롭
 *  위치 계산을 컴포넌트 안에 두면 검증할 수 없다 — «묶음 안에 못 넣는다» 같은
 *  규칙이 조용히 깨진다.
 *
 *  ## 드래그 중에는 재배치하지 않는다 (zz-5 D2 · PP§6.3)
 *  삽입선만 그리고 **캐시된 높이로 계산한 반투명 고스트**를 겹친다.
 *  드롭 시점에 정밀 재측정 + 재배치한다 — 16ms 목표는 드롭 기준이다. */
import type { PaperItem } from '@/domain/types'

export type DropVerdict =
  /** 여기 놓을 수 있다 */
  | { kind: 'insert'; index: number }
  /** 지면 밖 — 시험지에서 뺀다 */
  | { kind: 'remove' }
  /** 놓을 수 없다 (`⊘`) */
  | { kind: 'blocked'; reason: 'inside-group' | 'already-placed' }

export interface DropContext {
  items: readonly PaperItem[]
  /** 놓으려는 대상 아이템의 인덱스. 지면 밖이면 null */
  overIndex: number | null
  /** 대상의 위쪽 절반인가 — 아래쪽이면 뒤에 넣는다 */
  before: boolean
  /** 트레이에서 끌어온 문항 id (지면 안 이동이면 null) */
  fromTrayQuestionId: string | null
}

/** 이미 담긴 문항인가 */
function alreadyPlaced(items: readonly PaperItem[], questionId: string): boolean {
  return items.some(
    (i) =>
      (i.kind === 'question' && i.questionId === questionId) ||
      (i.kind === 'passageGroup' && i.children.some((c) => c.questionId === questionId)),
  )
}

export function resolveDrop(ctx: DropContext): DropVerdict {
  const { items, overIndex, before, fromTrayQuestionId } = ctx

  if (overIndex === null) {
    // 지면 밖에 놓았다. 트레이에서 온 것이면 아무 일도 없다
    return fromTrayQuestionId ? { kind: 'blocked', reason: 'already-placed' } : { kind: 'remove' }
  }

  if (fromTrayQuestionId && alreadyPlaced(items, fromTrayQuestionId)) {
    // «이미 담긴 문항입니다» — 놓아도 아무 일이 없다 (SS§6.4)
    return { kind: 'blocked', reason: 'already-placed' }
  }

  // ⚠ «묶음 내부에는 삽입 불가»(SS§6.4 `⊘`)는 **모델이 이미 보장한다** —
  // 묶음은 아이템 하나이고 종속 문항은 그 안의 `children` 이라 **바깥에서
  // 가리킬 인덱스가 없다.** 지문과 종속 문항 사이를 벌릴 방법이 구조적으로 없다.
  // 그래서 여기서 따로 막지 않는다. 자식마다 드롭 대상을 노출하는 순간
  // 이 보장이 깨지므로 그렇게 하지 않는다.
  return { kind: 'insert', index: before ? overIndex : overIndex + 1 }
}

/** 커서 위치가 대상의 위쪽 절반인가 */
export function isBefore(pointerY: number, rect: { top: number; height: number }): boolean {
  return pointerY < rect.top + rect.height / 2
}

/** 가장자리 자동 스크롤 (SS§6.4).
 *  «가장자리 40px 안에 머무르면 자동 스크롤. 가장자리에 가까울수록 빨라지며 최대 초당 600px» */
export const AUTOSCROLL_EDGE_PX = 40
export const AUTOSCROLL_MAX_PPS = 600

export function autoScrollSpeed(pointerY: number, rect: { top: number; bottom: number }): number {
  const fromTop = pointerY - rect.top
  const fromBottom = rect.bottom - pointerY
  if (fromTop < AUTOSCROLL_EDGE_PX) {
    const ratio = 1 - Math.max(0, fromTop) / AUTOSCROLL_EDGE_PX
    return -AUTOSCROLL_MAX_PPS * ratio
  }
  if (fromBottom < AUTOSCROLL_EDGE_PX) {
    const ratio = 1 - Math.max(0, fromBottom) / AUTOSCROLL_EDGE_PX
    return AUTOSCROLL_MAX_PPS * ratio
  }
  return 0
}
