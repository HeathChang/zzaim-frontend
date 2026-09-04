/** 채번 — **배치 순서에서 나온다. 원본 번호가 아니다** (HO§문항번호 · PP§6.1).
 *
 *  이게 이 제품의 핵심 약속이다: 순서를 바꿔도 시험지가 틀리지 않는다.
 *  그래서 번호는 저장하지 않고 매번 배치 결과에서 다시 만든다. */
import type { LayoutItem, Page } from '@/layout/types'

/** 배치된 순서대로 번호를 매긴다. `pages` 를 제자리에서 고친다.
 *
 *  - `numbered !== true` 인 아이템은 건너뛴다 (여백·구분선·안내문,
 *    그리고 번호가 픽셀에 박힌 이미지 문항 — PP§6.1 `numberBaked`)
 *  - 묶음은 데리고 있는 문항 수만큼 번호를 소비하고, 지시문 범위를 다시 만든다 */
export function assignNumbers(
  pages: Page[],
  items: readonly LayoutItem[],
  startNumber: number,
): void {
  const byKey = new Map(items.map((i) => [i.key, i]))
  let next = startNumber

  for (const page of pages) {
    for (const column of page.columns) {
      for (const placed of column.items) {
        const item = byKey.get(placed.key)
        if (!item?.numbered) {
          placed.number = null
          continue
        }
        if (item.kind === 'group') {
          // 지문 자체는 번호를 갖지 않는다. 데리고 있는 문항들이 갖는다.
          const count = Math.max(0, item.childCount ?? 0)
          if (count === 0) {
            placed.number = null
            continue
          }
          placed.number = next
          placed.numberRange = { from: next, to: next + count - 1 }
          next += count
          continue
        }
        placed.number = next
        next += 1
      }
    }
  }
}

/** 지시문에 쓸 범위 표기. `[1~3]`, 문항이 하나면 `[1]` */
export function formatRange(range: { from: number; to: number }): string {
  return range.from === range.to ? `[${range.from}]` : `[${range.from}~${range.to}]`
}
