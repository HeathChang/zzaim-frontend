/** 배치 — **순수 함수다.** `(items, heights, config) → pages`
 *
 *  DOM 도 React 도 import 하지 않는다 (PP§9.3 · zz-2 불변2). 그래서 측정값을
 *  픽스처로 주입해 단위 테스트할 수 있고, 그것이 이 엔진을 믿을 수 있는 근거다.
 *
 *  왜 CSS 다단(`columns:2`)에 맡기지 않는가: 브라우저는 «이 문항이 2쪽 왼쪽 단
 *  맨 아래»라고 알려주지 않는다. 그런데 상태바의 «넘긴 문항 N곳»·지면 경고·
 *  «(다음 쪽에 이어짐)»·쪽수 경고가 **전부 배치 결과를 알아야** 나온다. */
import { DEFAULT_SAFETY_MARGIN_MM } from '@/layout/constants'
import { columnCapacity, deriveGeometry } from '@/layout/geometry'
import { assignNumbers } from '@/layout/numbering'
import { resolveSplitPolicy } from '@/layout/splitPolicy'
import type { Column, LayoutConfig, LayoutItem, LayoutResult, Page } from '@/layout/types'

/** 아이템 키 → 측정 높이(px). 키가 없으면 «아직 못 쟀다»는 뜻이다 */
export type Heights = ReadonlyMap<string, number>

/** 배치가 실제로 다루는 덩어리.
 *  `keepWithNext` 로 이어진 아이템들은 한 덩어리로 판정한다 — 묶지 않고 하나씩
 *  넣으면 «다음과 같은 단에»라는 약속이 깨진다. */
interface Bundle {
  items: LayoutItem[]
  height: number
}

function heightOf(item: LayoutItem, heights: Heights, gapPx: number): number {
  return (heights.get(item.key) ?? 0) + gapPx
}

function bundleItems(items: readonly LayoutItem[], heights: Heights, gapPx: number): Bundle[] {
  const out: Bundle[] = []
  let i = 0
  while (i < items.length) {
    const chain: LayoutItem[] = []
    let height = 0
    for (;;) {
      const item = items[i]
      if (!item) break
      chain.push(item)
      height += heightOf(item, heights, gapPx)
      i += 1
      if (!item.keepWithNext || i >= items.length) break
    }
    out.push({ items: chain, height })
  }
  return out
}

/** 요청된 분할 정책 중 **실제로 못 지키는 것**을 모은다.
 *
 *  `passage-first` 는 MVP 에 없다(zz-2 D4). 조용히 `together` 로 돌리면
 *  «설정했는데 왜 안 되지»가 되므로, 강등된 아이템을 결과에 담아 **화면이 말하게** 한다. */
function downgradedKeys(items: readonly LayoutItem[]): string[] {
  return items.filter((i) => resolveSplitPolicy(i.splitPolicy).downgraded).map((i) => i.key)
}

export function layoutPages(
  items: readonly LayoutItem[],
  heights: Heights,
  config: LayoutConfig,
): LayoutResult {
  const geometry = deriveGeometry(config)
  const safety = config.safetyMarginMm ?? DEFAULT_SAFETY_MARGIN_MM
  const overflowKeys: string[] = []
  const pages: Page[] = []

  const newPage = (index: number): Page => ({
    index,
    first: index === 1,
    capacity: columnCapacity(geometry, index === 1, safety),
    columns: Array.from({ length: config.columns }, (): Column => ({ items: [], used: 0 })),
  })

  let page = newPage(1)
  pages.push(page)
  let col = 0
  const current = (): Column => page.columns[col] as Column

  const advance = (): void => {
    col += 1
    if (col >= config.columns) {
      col = 0
      page = newPage(page.index + 1)
      pages.push(page)
    }
  }

  const place = (bundle: Bundle, carried: boolean, overflow: boolean): void => {
    const column = current()
    for (const item of bundle.items) {
      column.items.push({
        key: item.key,
        number: null,
        overflow,
        carried,
        height: heightOf(item, heights, geometry.gapPx),
      })
      if (overflow) overflowKeys.push(item.key)
    }
    column.used += bundle.height
  }

  // 덩어리를 큐로 다룬다 — 체인이 단을 넘으면 **풀어서 다시 넣어야** 하기 때문이다
  const queue: Bundle[] = bundleItems(items, heights, geometry.gapPx)

  while (queue.length > 0) {
    const bundle = queue.shift()
    if (!bundle) break

    // ① 덩어리가 단 전체보다 크다
    if (bundle.height > page.capacity) {
      // 체인이면 **묶음을 푼다.** 안 풀면 영원히 이월되고, 개별 문항은
      // 들어갈 수 있는데도 전부 «안 들어감»으로 표시된다 (zz-2 D4)
      if (bundle.items.length > 1) {
        const singles = bundle.items.map((item) => ({
          items: [item],
          height: heightOf(item, heights, geometry.gapPx),
        }))
        queue.unshift(...singles)
        continue
      }
      // 단일 아이템이 단보다 크다 -> 빈 단에 넣고 경고한다.
      // 넘겨봐야 다음 단에서도 안 들어간다 (HO§layout).
      const moved = current().used > 0
      if (moved) advance()
      place(bundle, moved, true)
      // 이 아이템이 단을 넘겼으므로 뒤 아이템을 같은 단에 이어 붙이면
      // 시트 밖으로 나간다. 반드시 단을 넘긴다.
      advance()
      continue
    }

    // ② 남은 자리에 안 들어간다 → 다음 단(또는 다음 쪽)
    if (current().used + bundle.height > page.capacity) {
      advance()
      // 새 쪽은 용량이 다르다(첫 쪽만 머리말을 뺀다). 다시 판정한다.
      if (bundle.height > page.capacity) {
        queue.unshift(bundle)
        continue
      }
      place(bundle, true, false)
      continue
    }

    // ③ 현재 단에 들어간다
    place(bundle, false, false)
  }

  // 채번은 **배치가 끝난 뒤** 배치 순서로 매긴다 (HO§문항번호)
  assignNumbers(pages, items, config.startNumber)

  return {
    pages,
    overflowKeys,
    // 요청대로 못 한 것들 — 화면이 이걸 보고 알린다
    downgradedKeys: downgradedKeys(items),
    geometry: {
      colWmm: geometry.colWmm,
      colHmm: geometry.colHmm,
      pageWmm: geometry.pageWmm,
      pageHmm: geometry.pageHmm,
    },
    // 양면 인쇄에서 마지막 쪽이 홀수면 뒷면이 백지가 된다 (PP§6.5②)
    blankBack: pages.length % 2 === 1,
  }
}
