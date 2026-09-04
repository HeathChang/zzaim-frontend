/** 숨김 측정기 — 지면과 **같은 서식으로 한 번 더** 그린 뒤 높이를 읽는다.
 *
 *  화면 밖 컨테이너를 **단 폭과 똑같은 width** 로 두는 것이 핵심이다(HO§measure).
 *  폭이 다르면 줄바꿈이 달라지고, 줄바꿈이 다르면 높이가 달라진다.
 *
 *  한 프레임에 전부 붙였다가 `getBoundingClientRect()` 를 **한 번에 모아 호출**한다
 *  — 아이템마다 읽으면 강제 리플로가 아이템 수만큼 일어난다 (PP§6.3). */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MM } from '@/layout/constants'
import { diffHeights } from '@/layout/measure/measureHeights'

export interface MeasurableItem {
  /** 측정 캐시 키 (`measureKey`) */
  key: string
  node: ReactNode
}

export interface MeasurerProps {
  /** 단 폭(mm). 지면과 똑같아야 한다 */
  columnWidthMm: number
  /** 본문 글자 크기(px) — 지면과 같은 서식으로 그려야 높이가 맞는다 */
  fontPx: number
  items: readonly MeasurableItem[]
  /** 바뀐 높이만 넘어온다. 임계(0.6px) 미만 차이는 오지 않는다 */
  onMeasured(changed: ReadonlyMap<string, number>): void
  /** 상한까지 흔들려 고정된 아이템 — 개발 빌드에서 경고한다 */
  onPinned?(keys: string[]): void
}

export function Measurer({
  columnWidthMm,
  fontPx,
  items,
  onMeasured,
  onPinned,
}: MeasurerProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null)
  const previous = useRef(new Map<string, number>())
  const passes = useRef(new Map<string, number>())
  const lastSignature = useRef('')
  /** 이번 조건에서 더 이상 바뀌는 값이 없다 */
  const settled = useRef(false)
  const [, force] = useState(0)

  // ⚠ **의존성 배열이 없는 것이 의도다.** 측정은 «그려진 뒤»에만 가능하고,
  // 다시 그려질 이유(폰트 로드·폭 변화)를 전부 배열로 적을 수 없다.
  // 대신 `signature`+`settled` 로 스스로 조기 반환해 무한 루프를 막는다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    // 측정 조건이 그대로면 다시 재지 않는다. 부모가 다른 이유로 다시 그릴 때마다
    // `querySelectorAll` + `getBoundingClientRect` 를 도는 것은 낭비다.
    const signature = `${columnWidthMm}|${fontPx}|${items.map((i) => i.key).join(',')}`
    if (signature === lastSignature.current && settled.current) return
    lastSignature.current = signature

    // 읽기를 한 덩어리로 모은다 — 쓰기와 번갈아 하면 리플로가 매번 터진다
    const measured = new Map<string, number>()
    for (const el of host.querySelectorAll<HTMLElement>('[data-mk]')) {
      const key = el.dataset['mk']
      if (key) measured.set(key, el.getBoundingClientRect().height)
    }

    const { changed, pinned } = diffHeights(previous.current, measured, passes.current)
    for (const key of changed.keys()) {
      passes.current.set(key, (passes.current.get(key) ?? 0) + 1)
    }
    // 안정된 아이템은 진동 카운터를 되돌린다 — 안 그러면 오래 산 문항이
    // 정당한 재측정에서도 «고정» 처리된다
    for (const key of measured.keys()) {
      if (!changed.has(key)) passes.current.delete(key)
    }

    if (changed.size > 0) {
      settled.current = false
      changed.forEach((v, k) => previous.current.set(k, v))
      onMeasured(changed)
      // 반영된 높이로 다시 그려진 뒤 한 번 더 잰다 (HO§measure «렌더 후마다»)
      force((n) => n + 1)
    } else {
      settled.current = true
    }
    if (pinned.length > 0) onPinned?.(pinned)
  })

  return (
    <div
      ref={hostRef}
      aria-hidden
      // ⚠ 인쇄에서는 **완전히 없애야 한다.** `visibility: hidden` 은 자리를
      // 차지하므로, 여기 쌓인 측정용 사본이 종이에서 빈 쪽을 여러 장 만든다
      // (3장짜리 시험지가 5쪽으로 나왔다)
      data-print="hide"
      // 화면 밖. `visibility:hidden` 이라 접근성 트리에도 안 들어간다.
      // `display:none` 은 쓸 수 없다 — 레이아웃이 계산되지 않아 높이가 0이 된다.
      style={{
        position: 'absolute',
        left: -99999,
        top: 0,
        visibility: 'hidden',
        contain: 'layout style',
        width: columnWidthMm * MM,
        fontSize: fontPx,
        fontFamily: 'var(--font-paper)',
      }}
    >
      {items.map((item) => (
        <div key={item.key} data-mk={item.key}>
          {item.node}
        </div>
      ))}
    </div>
  )
}
