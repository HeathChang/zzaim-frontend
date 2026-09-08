/** 결과 목록 — **가상 스크롤** (zz-4 D9 · SS부록D 임계값 100개).
 *
 *  50문항이 기본이고 100문항을 넘는 시험지도 있다. 전부 DOM 에 올리면
 *  «카드 100개 스크롤 60fps»(SS§4.10)를 못 지킨다.
 *
 *  ⚠ **임계값 아래에서는 그냥 그린다.** 가상 스크롤은 공짜가 아니다 —
 *  높이를 재는 동안 깜빡이고, 스크린리더가 목록 길이를 잘못 읽을 수 있다.
 *  24문항짜리 시험지에 그 비용을 치를 이유가 없다. */
import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

/** 이보다 많을 때만 가상화한다 (SS부록D) */
export const VIRTUALIZE_ABOVE = 100

/** 카드 하나의 어림 높이(px). 실제 높이는 렌더 후 측정된다 */
const ESTIMATED_ROW = 96

export interface ResultListProps {
  count: number
  /** 현재 커서 — 키보드로 이동하면 **화면 밖이라도 따라가야** 한다 */
  cursor: number
  renderRow(index: number): ReactNode
  label: string
}

export function ResultList({ count, cursor, renderRow, label }: ResultListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (count <= VIRTUALIZE_ABOVE) {
    return (
      <div role="listbox" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {Array.from({ length: count }, (_, i) => renderRow(i))}
      </div>
    )
  }

  return <VirtualList scrollRef={scrollRef} count={count} cursor={cursor} renderRow={renderRow} label={label} />
}

function VirtualList({
  scrollRef,
  count,
  cursor,
  renderRow,
  label,
}: ResultListProps & { scrollRef: React.RefObject<HTMLDivElement> }) {
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW,
    overscan: 6,
  })

  // 커서가 화면 밖으로 나가면 따라간다 — `N` 으로 뛴 곳이 안 보이면 소용없다
  virtualizer.scrollToIndex(cursor, { align: 'auto' })

  return (
    <div ref={scrollRef} style={{ overflow: 'auto', maxHeight: '100%' }}>
      <div
        role="listbox"
        aria-label={label}
        style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${row.start}px)`,
            }}
          >
            {renderRow(row.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
