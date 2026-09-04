/** 조판 엔진의 입출력 타입.
 *
 *  **엔진은 문항 본문을 모른다.** 아이템의 «키»와 «측정 높이»만 받는다 —
 *  문항은 불투명 블록이라는 원칙(PP§6.1)이 타입에도 그대로 나타난다. */
import type { ColumnCount, Orientation, PageSize, SplitPolicy } from '@/domain/types'

/** 배치가 다루는 최소 단위. `PaperItem` 을 측정 가능한 형태로 평탄화한 것 */
export interface LayoutItem {
  /** 측정 캐시와 배치 결과를 잇는 키 */
  key: string
  kind: 'question' | 'group' | 'spacer' | 'divider' | 'notice'
  /** 다음 아이템과 같은 단에 묶는다 (PP§6.3) */
  keepWithNext?: boolean
  /** `kind === 'group'` 일 때만 */
  splitPolicy?: SplitPolicy
  /** 채번 대상인가. 이미지에 번호가 박힌 문항은 제외한다 (PP§6.1) */
  numbered?: boolean
  /** 묶음이 데리고 있는 문항 수 — 지시문 범위(`[1~3]`) 계산에 쓴다 */
  childCount?: number
}

export interface LayoutConfig {
  pageSize: PageSize
  /** 가로로 돌리면 치수가 바뀐다 (zz-8 D1) */
  orientation?: Orientation
  /** 양면 — 홀·짝에서 안쪽/바깥쪽 여백이 뒤집힌다 (zz-6 D7) */
  duplex?: boolean
  columns: ColumnCount
  /** mm */
  gutter: number
  margin: { top: number; bottom: number; inner: number; outer: number }
  /** % — 85~115 */
  fontScale: number
  startNumber: number
  /** 지문 박스 모양. 측정 캐시 키에 들어간다 — padding·border 가 높이를 바꾼다 */
  box: 'border' | 'shade'
  /** 단 사이 세로선 (HO§기본레이아웃상태 `rule`).
   *  값은 zz-8(설정)이 소유하고 렌더는 zz-2 가 한다. 높이에 영향을 주지 않으므로
   *  **측정 캐시 키에는 들어가지 않는다** */
  rule?: boolean
  /** 안전 마진(mm). 기본 2 이며 **종이 실측으로 확정한다** (UD-12) */
  safetyMarginMm?: number
}

/** 배치된 아이템 하나 */
export interface PlacedItem {
  key: string
  /** 배치 순서에서 나온 번호. 채번 대상이 아니면 null (HO§문항번호) */
  number: number | null
  /** 묶음 지시문의 범위 — `[1~3]` 의 1 과 3 */
  numberRange?: { from: number; to: number }
  /** 한 단에 아예 안 들어간다 — ⚠ 경고 대상 */
  overflow: boolean
  /** 다음 단·쪽으로 넘어왔다 — 참고 표시 */
  carried: boolean
  /** 배치에 쓴 높이(px) = 측정 높이 + 간격 */
  height: number
}

export interface Column {
  items: PlacedItem[]
  /** 이 단이 쓴 높이(px) */
  used: number
}

export interface Page {
  /** 1부터 */
  index: number
  first: boolean
  columns: Column[]
  /** 이 쪽의 단 용량(px). 첫 쪽은 머리말만큼 작다 */
  capacity: number
}

export interface LayoutResult {
  pages: Page[]
  /** 한 단에 안 들어간 아이템들 — 화면이 경고를 띄운다 (SS§6.5) */
  overflowKeys: string[]
  /** 요청한 분할 정책대로 **못 한** 아이템들 (zz-2 D4).
   *  조용히 다르게 동작하면 «설정했는데 왜 안 되지»가 된다 */
  downgradedKeys: string[]
  /** 배치에 쓴 기하 — 렌더러가 같은 값을 써야 한다 */
  geometry: {
    colWmm: number
    colHmm: number
    pageWmm: number
    pageHmm: number
  }
  /** 마지막 쪽이 홀수면 뒷면이 백지가 된다 (PP§6.5②) */
  blankBack: boolean
}
