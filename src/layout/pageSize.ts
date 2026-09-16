/** 실제 지면 치수 — **방향을 반영한 뒤의 값** (zz-8 D1).
 *
 *  가로로 돌리면 폭과 높이가 **바뀐다.** 이 계산이 한 곳에 없으면
 *  «가드는 세로로 재고 조판은 가로로 그리는» 어긋남이 생긴다. */
import { PAGE_SIZE_MM } from '@/layout/constants'
import type { Orientation, PageSize } from '@/domain/types'

export function effectivePage(
  pageSize: PageSize,
  orientation: Orientation = 'portrait',
): { w: number; h: number } {
  const { w, h } = PAGE_SIZE_MM[pageSize]
  return orientation === 'landscape' ? { w: h, h: w } : { w, h }
}
