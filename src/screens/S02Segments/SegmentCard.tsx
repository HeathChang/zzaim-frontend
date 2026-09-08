/** 세그먼트 카드 — zz-0 의 `QuestionCard` 를 **감싸는 래퍼다. 사본이 아니다.**
 *  (zz-0 구현계획: «`SegmentCard` 가 래퍼로 감싼다»)
 *
 *  ⚠ **카드는 편집기가 아니다** (zz-4 불변2). 경계와 메타데이터만 다룬다.
 *  본문 수정은 S-04 편집 패널이 한다 — 여기에 편집 기능을 넣는 순간 6초 목표가 무너진다. */
import { QuestionCard } from '@/components/QuestionCard'
import { InlineEditBadge } from '@/components/InlineEditBadge'
import { ConfidenceBadge } from '@/screens/S02Segments/ConfidenceBadge'
import { strings } from '@/app/strings'
import type { Segment } from '@/importing/types'

export interface SegmentCardProps {
  segment: Segment
  /** 분리 결과에서의 순번 (①②③…) */
  ordinal: number
  selected: boolean
  /** 사용자가 «봤고 문제없다»고 표시했다 (zz-4 D5) */
  confirmed: boolean
  /** 지문에 묶였다 — 지문 없이 담기면 답 없는 문항이 인쇄된다 (PP§6.2) */
  grouped?: boolean
  expanded: boolean
  onSelect(): void
  onChangeNumber(next: number | null): void
  onChangePoints(next: number | null): void
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮'

/** 접힌 카드가 보여 주는 줄 수 (SS§4.3 A.5 «최대 4줄, 넘치면 말줄임»).
 *
 *  ⚠ 첫 줄만 보여 주면 **줄바꿈된 발문이 빈 카드처럼 보인다** — 원본에서
 *  «14.» 와 «다음 중 옳은 것은?» 이 다른 문단으로 오는 경우가 실제로 있다. */
export const PREVIEW_LINES = 4

export function previewOf(lines: readonly string[], expanded: boolean): string {
  return (expanded ? lines : lines.slice(0, PREVIEW_LINES)).join(' ')
}

export function ordinalLabel(n: number): string {
  return CIRCLED[n] ?? `${n + 1}`
}

export function SegmentCard({
  segment,
  ordinal,
  selected,
  confirmed,
  grouped = false,
  expanded,
  onSelect,
  onChangeNumber,
  onChangePoints,
}: SegmentCardProps) {
  const preview = previewOf(segment.lines, expanded)

  return (
    <QuestionCard
      role="option"
      selected={selected}
      density={expanded ? 'low' : 'medium'}
      preview={preview}
      badge={ordinalLabel(ordinal)}
      onClick={onSelect}
    >
      {/* 원본 번호 — 표시용이 아니라 참고용이다 (PP§6.1) */}
      <InlineEditBadge
        value={segment.numberHint}
        emptyLabel={strings.segments.noNumber}
        format={strings.segments.numberFormat}
        ariaLabel={strings.segments.numberLabel}
        onChange={onChangeNumber}
      />
      <InlineEditBadge
        value={segment.points}
        emptyLabel={strings.segments.noPoints}
        format={strings.segments.pointsFormat}
        ariaLabel={strings.segments.pointsLabel}
        onChange={onChangePoints}
      />
      {segment.role === 'passage' && <span>{strings.common.passage}</span>}
      {grouped && <span>{strings.segments.grouped}</span>}
      {segment.hasMissingImage && <span>⚠ {strings.importing.imageMissing}</span>}
      {confirmed ? (
        <span>✓ {strings.segments.confirmed}</span>
      ) : (
        <ConfidenceBadge confidence={segment.confidence} reasons={segment.reasons} />
      )}
    </QuestionCard>
  )
}
