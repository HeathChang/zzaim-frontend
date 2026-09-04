/** 시트 — **실제 mm 크기의 px 박스**다. 미리보기가 아니라 결과다 (SS§6.1).
 *
 *  배율은 `transform: scale()` 로만 준다. 시트 안의 값은 배율과 무관하게 언제나
 *  실제 크기다 — 그래야 인쇄에서 `transform` 만 지우면 1:1이 된다 (zz-2 불변4). */
import { MM } from '@/layout/constants'
import { effectivePage } from '@/layout/pageSize'
import type { Orientation, PageSize } from '@/domain/types'
import { PRINT_ATTR } from '@/print/pageRule'

export interface SheetProps {
  pageSize: PageSize
  /** ⚠ **반드시 함께 넘긴다.** 기하 계산만 방향을 알고 지면은 모르면
   *  «단 폭은 가로로 재고 종이는 세로로 그리는» 상태가 된다 (실제로 그랬다) */
  orientation?: Orientation
  /** 1 = 100%. 0.72 = 폭 맞춤, 0.46 = 두 쪽 (HO§배율) */
  scale: number
  /** mm */
  margin: { top: number; bottom: number; inner: number; outer: number }
  /** 본문 글자 크기(px). `fs = 13.6 * fontScale / 100` (HO§지면본문서식).
   *
   *  ⚠ **필수다.** 이 값을 안 주면 지면이 앱 기본 크기(15px)로 그려지는데
   *  측정기는 `fs` 로 재므로 **측정과 렌더가 어긋난다** — 이 엔진의 전제가
   *  통째로 무너진다. 실제로 브라우저에서 15px 로 그려지고 있었다. */
  fontPx: number
  /** 홀수 쪽인가. 양면에서 안쪽/바깥쪽 여백이 뒤집힌다 (PP§6.5②) */
  odd?: boolean
  duplex?: boolean
  children: React.ReactNode
}

export function Sheet({
  pageSize,
  orientation = 'portrait',
  scale,
  margin,
  fontPx,
  odd = true,
  duplex = false,
  children,
}: SheetProps) {
  const { w, h } = effectivePage(pageSize, orientation)
  const wpx = w * MM
  const hpx = h * MM

  // 여백은 **시트가 직접 그린다.** `@page :left/:right` 를 쓰지 않는 이유는
  // 브라우저가 어느 쪽을 :left 로 볼지 인쇄 설정에 따라 달라지기 때문이다.
  // 조판 엔진은 이미 쪽 번호를 알고 있다 (PP§6.5②).
  const mirror = duplex && !odd
  const left = mirror ? margin.outer : margin.inner
  const right = mirror ? margin.inner : margin.outer

  return (
    // 바깥 래퍼가 문서 흐름의 크기를 잡는다 — transform 은 흐름을 바꾸지 않는다
    // 바깥 래퍼가 문서 흐름의 크기를 잡는다. 인쇄에서는 그 제한을 푼다
    <div data-print="pageouter" style={{ width: wpx * scale, height: hpx * scale }}>
      <div
        className="zz-sheet"
        {...{ [PRINT_ATTR]: 'sheet' }}
        style={{
          width: wpx,
          height: hpx,
          // ⚠ **세로 플렉스여야 한다.** 첫 쪽에는 머리말이 단 위에 오는데,
          // 단이 `height: 100%` 로 콘텐츠 박스를 통째로 차지하면 머리말 높이만큼
          // 넘쳐서 **한 장이 두 쪽으로 인쇄된다**(3장짜리가 5쪽으로 나왔다)
          display: 'flex',
          flexDirection: 'column',
          transform: scale === 1 ? undefined : `scale(${scale})`,
          paddingTop: margin.top * MM,
          paddingBottom: margin.bottom * MM,
          paddingLeft: left * MM,
          paddingRight: right * MM,
          fontSize: fontPx,
        }}
      >
        {children}
      </div>
    </div>
  )
}
