/** 문항 편집 패널 — **첫 버전에서 본문을 고칠 수 있는 유일한 곳이다** (OD-02 · zz-5 불변5).
 *
 *  ## 구조화하지 않는다 (zz-5 D9 · PD-02)
 *  «문항 = 불투명 블록»이 이 제품의 1번 원칙이다(PP§6.1). 선택지 5칸·정답 지정 같은
 *  구조화 UI를 만들면 **가져오기 경로가 전부 막힌다** — 붙여넣은 HTML 도, 잘라낸
 *  이미지도 그 틀에 안 들어간다. 국어·영어는 4지선다도 쓰고 서술형은 선택지가 없다.
 *
 *  그래서 본문은 **리치 텍스트 한 영역**이고, 나머지(배점·태그·메모·정답)는
 *  블록 **바깥의 필드**다. */
import { useEffect, useRef } from 'react'
import { strings } from '@/app/strings'
import type { Question } from '@/domain/types'

export interface QuestionEditPanelProps {
  question: Question
  /** 이 시험지에서만 쓰는 배점 */
  overridePoints: number | null
  /** 이 문항을 쓰는 **다른** 시험지 수 (PD-07) */
  usedByOthers: number
  onChangeBody(html: string): void
  onChangePoints(points: number | null): void
  onChangeOverride(points: number | null): void
  onChangeTags(tags: string[]): void
  onChangeNote(note: string): void
  onChangeAnswer(answer: string): void
  onClose(): void
}

/** HO§도구UI크기:156 — SS 에 대응 항목이 없어 HO 를 채택한다 (zz-5 D10) */
export const PANEL_WIDTH = 326

export function QuestionEditPanel({
  question,
  overridePoints,
  usedByOthers,
  onChangeBody,
  onChangePoints,
  onChangeOverride,
  onChangeTags,
  onChangeNote,
  onChangeAnswer,
  onClose,
}: QuestionEditPanelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('textarea, input')?.focus()
  }, [])

  const bodyText = question.body.kind === 'html' ? question.body.html : ''

  return (
    <aside
      ref={ref}
      // 인쇄 시 열려 있으면 안 되는 것 — E2E 가 이 표식으로 확인한다 (zz-6 D4)
      data-panel="edit"
      data-print="hide"
      aria-label={strings.paperEdit.editTitle}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      style={{
        width: PANEL_WIDTH,
        flex: `0 0 ${PANEL_WIDTH}px`,
        borderLeft: '1px solid var(--color-divider)',
        padding: 'var(--space-3)',
        overflow: 'auto',
      }}
    >
      <h2 style={{ fontSize: 15 }}>{strings.paperEdit.editTitle}</h2>

      {/* ⚠ 본문 수정은 **보관함 원본**을 바꾼다 (PD-07).
          모르고 고치면 다른 시험지가 함께 바뀐다 */}
      {usedByOthers > 0 && (
        <p role="note" style={{ color: 'var(--color-accent-700)', fontSize: 12 }}>
          ⚠ {strings.paperEdit.sharedWarning(usedByOthers)}
        </p>
      )}

      <label style={{ display: 'block' }}>
        {strings.paperEdit.bodyLabel}
        {/* **한 영역이다.** 선택지 5칸을 만들지 않는다 */}
        <textarea
          value={bodyText}
          rows={8}
          onChange={(e) => onChangeBody(e.target.value)}
          style={{ width: '100%' }}
        />
      </label>

      <label style={{ display: 'block' }}>
        {strings.paperEdit.pointsLabel}
        <input
          type="number"
          value={question.points ?? ''}
          onChange={(e) => onChangePoints(e.target.value === '' ? null : Number(e.target.value))}
        />
      </label>

      <label style={{ display: 'block' }}>
        {strings.paperEdit.overrideLabel}
        <input
          type="number"
          value={overridePoints ?? ''}
          onChange={(e) => onChangeOverride(e.target.value === '' ? null : Number(e.target.value))}
        />
      </label>

      <label style={{ display: 'block' }}>
        {strings.paperEdit.tagsLabel}
        {/* 태그는 `그룹:값` 문자열이다. 구조화하지 않는다 (PD-03) */}
        <input
          value={question.tags.join(' ')}
          onChange={(e) => onChangeTags(e.target.value.split(/\s+/).filter(Boolean))}
        />
      </label>

      <label style={{ display: 'block' }}>
        {strings.paperEdit.noteLabel}
        <textarea value={question.note} rows={2} onChange={(e) => onChangeNote(e.target.value)} />
      </label>

      <label style={{ display: 'block' }}>
        {strings.paperEdit.answerLabel}
        <input value={question.answer ?? ''} onChange={(e) => onChangeAnswer(e.target.value)} />
      </label>

      <button type="button" onClick={onClose}>
        {strings.paperEdit.close}
      </button>
    </aside>
  )
}
