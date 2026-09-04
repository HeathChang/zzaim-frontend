/** 지면 미리보기 — measure -> layout -> render 를 잇는 곳.
 *
 *  «미리보기»라는 이름이지만 **미리보기가 아니라 결과다** (SS§6.1).
 *  화면과 인쇄가 같은 DOM·같은 CSS 를 쓴다 — 별도 인쇄용 렌더러를 만들지 않는다.
 *  이 원칙을 어기는 순간 «인쇄하면 화면 그대로»가 검증 불가능해진다 (PP§6.4). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MM, ZOOM, type ZoomKey } from '@/layout/constants'
import { deriveGeometry } from '@/layout/geometry'
import { layoutPages } from '@/layout/layoutPages'
import { Measurer } from '@/layout/measure/Measurer'
import { measureKey, type RenderInput } from '@/layout/measure/measureKey'
import { pruneCache } from '@/layout/measure/measureHeights'
import type { LayoutConfig, LayoutItem, LayoutResult, Page, PlacedItem } from '@/layout/types'
import { applyPageRule } from '@/print/pageRule'
import { Sheet } from '@/components/sheet/Sheet'
import { ColumnLayout } from '@/components/sheet/ColumnRule'
import { shouldAutoFit } from '@/components/sheet/ZoomTabs'

/** 한 아이템을 그리는 데 필요한 전부.
 *
 *  ⚠ **노드를 미리 만들어 두지 않는다.** 번호는 배치 결과에서 나오므로
 *  (HO§문항번호) 배치가 끝나기 전에는 무엇을 그릴지 알 수 없다.
 *  측정용 노드만 미리 만들고, 지면용은 `render(placed)` 로 그때 만든다.
 *
 *  측정에는 번호가 무엇이든 상관없다 — 번호 폭이 `2.5em` 고정이기 때문이다
 *  (zz-2 D5). 그래서 측정 노드와 지면 노드의 번호가 달라도 높이는 같다. */
export interface SheetItem {
  item: LayoutItem
  input: RenderInput
  /** 숨김 측정기가 그릴 것 */
  measureNode: React.ReactNode
  /** 지면이 그릴 것. 배치 결과(번호·경고)를 받는다 */
  render(placed: PlacedItem): React.ReactNode
}

export interface PaperPreviewProps {
  items: readonly SheetItem[]
  config: LayoutConfig
  zoom: ZoomKey
  /** 자동 폭맞춤 판정에 쓸 가용 폭(px).
   *  주지 않으면 **스스로 잰다** — 판정 로직만 있고 아무도 폭을 넘겨주지 않아
   *  자동 강등이 영영 돌지 않던 적이 있다. 기본값이 «작동함»이어야 한다. */
  availableWidthPx?: number
  onAutoFit?(auto: boolean): void
  /** ★ 자동 폭맞춤 판정을 **멈춘다**.
   *
   *  설정 패널이 열려 좁아진 것은 **창이 좁아진 것과 다르다.** 패널을 열었다고
   *  지면이 축소되면 «폭이 줄되 배율은 유지»(SS§7.4)가 깨지고, 무엇보다
   *  «지금 보고 있는 크기»가 도구를 열 때마다 달라진다 */
  autoFitFrozen?: boolean
  header?: React.ReactNode
  /** 쪽 번호·마무리. **배치 결과(`page`)를 함께 준다** — «이 쪽이 얼마나 비었나»
   *  같은 정보는 배치를 알아야 답할 수 있다 */
  folio?: (index: number, total: number, page: Page) => React.ReactNode
  /** 배치 결과 요약. **인쇄 전 점검이 이 값을 쓴다** — 넘침은 배치를 해 봐야 안다 */
  onLayoutStats?(stats: { overflowCount: number; pageCount: number }): void
  /** ★ 배치 결과 자체. **HWPX 내보내기가 이 값을 쓴다** —
   *  내보내기가 배치를 다시 계산하면 «쪽 수가 화면과 같다»가 깨진다 (zz-9 D3) */
  onLayout?(result: LayoutResult): void
}

export function PaperPreview({
  items,
  config,
  zoom,
  availableWidthPx,
  onAutoFit,
  autoFitFrozen = false,
  header,
  folio,
  onLayoutStats,
  onLayout,
}: PaperPreviewProps) {
  const geometry = useMemo(() => deriveGeometry(config), [config])
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(new Map())
  const pinnedRef = useRef<string[]>([])

  // 용지 크기가 바뀌면 @page 를 다시 주입한다. 정적 CSS 로는 A4/B4 전환을
  // 표현할 수 없다 (zz-2 D9)
  useEffect(() => {
    applyPageRule(config.pageSize, config.orientation)
  }, [config.pageSize, config.orientation])

  const measurables = useMemo(
    () =>
      items.map((s) => ({
        key: measureKey(s.input, {
          columnWidthMm: geometry.colWmm,
          fontScale: config.fontScale,
          box: config.box,
        }),
        node: s.measureNode,
      })),
    [items, geometry.colWmm, config.fontScale, config.box],
  )

  /** 배치가 쓰는 키는 «아이템 키», 측정이 쓰는 키는 «렌더 입력 해시»다.
   *  둘을 이어 준다 — 같은 본문이면 측정을 공유하고, 배치는 아이템별로 한다 */
  const layoutItems = useMemo(() => items.map((s) => s.item), [items])
  const heightByItemKey = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach((s, i) => {
      const mk = measurables[i]?.key
      const h = mk ? heights.get(mk) : undefined
      if (h !== undefined) map.set(s.item.key, h)
    })
    return map
  }, [items, measurables, heights])

  const result = useMemo(
    () => layoutPages(layoutItems, heightByItemKey, config),
    [layoutItems, heightByItemKey, config],
  )

  // 넘침 건수는 배치 결과에서만 나온다. 점검이 이걸 쓰므로 위로 올린다
  const overflowCount = useMemo(
    () =>
      result.pages.reduce(
        (n, page) => n + page.columns.reduce((m, c) => m + c.items.filter((i) => i.overflow).length, 0),
        0,
      ),
    [result],
  )
  const pageCount = result.pages.length
  useEffect(() => {
    onLayoutStats?.({ overflowCount, pageCount })
  }, [onLayoutStats, overflowCount, pageCount])
  useEffect(() => {
    onLayout?.(result)
  }, [onLayout, result])

  /** 살아 있는 측정 키. 글자 크기·단 폭을 바꿀 때마다 키가 새로 생기므로,
   *  지워 주지 않으면 캐시가 **세션 내내 자란다** */
  const liveKeys = useMemo(() => new Set(measurables.map((m) => m.key)), [measurables])
  const liveRef = useRef(liveKeys)
  liveRef.current = liveKeys

  const onMeasured = useCallback((changed: ReadonlyMap<string, number>) => {
    setHeights((prev) => {
      const next = new Map(prev)
      changed.forEach((v, k) => next.set(k, v))
      // ⚠ 지금 화면에 없는 키를 버린다. 이걸 빼면 슬라이더를 몇 번 끄는 것만으로
      // 수천 개가 쌓인다 — 새 값이 들어올 때 함께 치우는 것이 가장 싸다
      pruneCache(next, liveRef.current)
      return next
    })
  }, [])

  const onPinned = useCallback((keys: string[]) => {
    pinnedRef.current = keys
    if (import.meta.env.DEV && keys.length > 0) {
      // 측정이 수렴하지 않았다는 뜻이다 — 조판이 미세하게 흔들릴 수 있다
      console.warn(`[zzaim] measurement did not settle for ${keys.length} item(s)`, keys)
    }
  }, [])

  // 가용 폭을 스스로 잰다. 임계는 **창 폭이 아니라 «가용 지면 폭 < 시트 폭»** 이다 —
  // 1280px 에서는 좌패널을 빼도 들어가고, 그 아래에서는 좌패널이 접혀 오히려
  // 넓어지기 때문이다 (zz-2 D7 · UD-41)
  const hostRef = useRef<HTMLDivElement>(null)
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host || availableWidthPx !== undefined) return
    const update = () => setMeasuredWidth(host.getBoundingClientRect().width)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(host)
    return () => ro.disconnect()
  }, [availableWidthPx])

  const sheetWidthPx = geometry.pageWmm * MM
  const available = availableWidthPx ?? measuredWidth
  const live = available !== null && zoom === '100' && shouldAutoFit(available, sheetWidthPx)
  // 얼어 있으면 **직전 판정을 그대로 쓴다** — 패널이 여닫힐 때마다 배율이 튀지 않게
  const frozenRef = useRef(live)
  if (!autoFitFrozen) frozenRef.current = live
  const auto = autoFitFrozen ? frozenRef.current : live
  useEffect(() => {
    onAutoFit?.(auto)
  }, [auto, onAutoFit])
  const scale = auto ? ZOOM.fit : ZOOM[zoom]

  const renderByKey = new Map(items.map((s) => [s.item.key, s.render]))

  return (
    <>
      <Measurer
        columnWidthMm={geometry.colWmm}
        fontPx={geometry.fontPx}
        items={measurables}
        onMeasured={onMeasured}
        onPinned={onPinned}
      />
      <div
        ref={hostRef}
        // 인쇄에서 두 쪽 배열·간격을 푼다 (zz-6 D3)
        data-print="spread"
        style={{
          display: 'flex',
          flexWrap: zoom === 'spread' ? 'wrap' : 'nowrap',
          flexDirection: zoom === 'spread' ? 'row' : 'column',
          gap: zoom === 'spread' ? 20 : 24,
          padding: '26px 0 60px',
        }}
      >
        {result.pages.map((page) => (
          <Sheet
            key={page.index}
            pageSize={config.pageSize}
            orientation={config.orientation ?? 'portrait'}
            duplex={config.duplex ?? false}
            scale={scale}
            margin={config.margin}
            fontPx={geometry.fontPx}
            odd={page.index % 2 === 1}
          >
            {page.first && header}
            <ColumnLayout
              columns={config.columns}
              gutterMm={config.gutter}
              rule={config.rule ?? false}
            >
              {page.columns.map((column, ci) => (
                <div key={ci}>
                  {column.items.map((placed) => (
                    <div key={placed.key} data-overflow={placed.overflow || undefined}>
                      {renderByKey.get(placed.key)?.(placed)}
                    </div>
                  ))}
                </div>
              ))}
            </ColumnLayout>
            {folio?.(page.index, result.pages.length, page)}
          </Sheet>
        ))}
      </div>
    </>
  )
}
