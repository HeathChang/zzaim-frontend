/** 문서의 설정(`PaperLayout`) → 조판 엔진의 설정(`LayoutConfig`).
 *
 *  ★ **둘을 잇는 곳이 여기 하나뿐이어야 한다.** 화면마다 제 나름대로 옮기면
 *  «저장된 값»과 «그려진 값»이 갈라지고, 그 어긋남은 종이에서야 드러난다.
 *
 *  두 타입이 따로 있는 이유: 엔진은 문서를 몰라야 한다(`layout/` 순수성 규칙).
 *  머리말·쪽번호처럼 배치에 영향이 없는 항목은 여기서 **버린다** — 엔진에 넘기면
 *  측정 캐시 키가 쓸데없이 갈린다. */
import type { PaperLayout } from '@/domain/types'
import type { LayoutConfig } from '@/layout/types'

export function toLayoutConfig(layout: PaperLayout): LayoutConfig {
  return {
    pageSize: layout.pageSize,
    orientation: layout.orientation,
    duplex: layout.duplex,
    columns: layout.columns,
    gutter: layout.gutter,
    margin: { ...layout.margin },
    // ⚠ 퍼센트다. 여기서 100 을 곱하거나 나누지 않는다 — 저장 형식도 퍼센트다
    fontScale: layout.fontScale,
    startNumber: layout.startNumber,
    box: layout.box,
    rule: layout.columnRule,
  }
}
