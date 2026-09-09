/** 비문항 블록 삽입 — 여백·구분선·안내문 (SS§6.3 A.4).
 *
 *  조판 엔진 입장에서 이것들은 문항과 **똑같은 블록**이다(PP§6.2 `PaperItem` 유니온).
 *  그래서 서술형 답안 공간이 문항과 같이 흐른다.
 *
 *  ## 여백 높이 (zz-5 D11 · PD-06)
 *  30mm 기본 + **mm 직접 입력**. «3줄/6줄» 프리셋을 쓰지 않는 이유는 행간이
 *  `fontScale` 에 따라 변해 **mm 환산이 부정확**하기 때문이다.
 *  상한을 컬럼 높이로 잡는 이유는, 그보다 크면 엔진이 `overflow` 로 처리해
 *  사용자가 이유를 알기 어렵기 때문이다. */
import { useState } from 'react'
import { strings } from '@/app/strings'
import type { PaperItem } from '@/domain/types'

export const SPACER_DEFAULT_MM = 30
export const SPACER_MIN_MM = 5

export function clampSpacerHeight(mm: number, columnHeightMm: number): number {
  return Math.max(SPACER_MIN_MM, Math.min(columnHeightMm, mm))
}

export interface BlockButtonsProps {
  /** 여백 높이의 상한 — 현재 단 높이 */
  columnHeightMm: number
  onInsert(item: PaperItem): void
}

export function BlockButtons({ columnHeightMm, onInsert }: BlockButtonsProps) {
  const [heightMm, setHeightMm] = useState(SPACER_DEFAULT_MM)
  const [ruled, setRuled] = useState(true)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() =>
          onInsert({
            kind: 'spacer',
            heightMm: clampSpacerHeight(heightMm, columnHeightMm),
            ruled,
          })
        }
      >
        {strings.paperEdit.insertSpacer}
      </button>
      <label>
        {strings.paperEdit.spacerHeight}
        <input
          type="number"
          value={heightMm}
          min={SPACER_MIN_MM}
          max={Math.round(columnHeightMm)}
          onChange={(e) => setHeightMm(Number(e.target.value))}
          style={{ width: '4em' }}
        />
      </label>
      <label>
        <input type="checkbox" checked={ruled} onChange={(e) => setRuled(e.target.checked)} />
        {strings.paperEdit.ruled}
      </label>
      <button type="button" onClick={() => onInsert({ kind: 'divider' })}>
        {strings.paperEdit.insertDivider}
      </button>
      <button type="button" onClick={() => onInsert({ kind: 'notice', html: '' })}>
        {strings.paperEdit.insertNotice}
      </button>
    </div>
  )
}
