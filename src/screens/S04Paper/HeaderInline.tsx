/** 머리말 인라인 편집 (zz-5 D5 · SS§6.3 B.2).
 *
 *  **머리말을 고치려고 설정 화면으로 가지 않는다.** 지면 위에서 바로 고친다 —
 *  학교명·과목·시험명은 시험지를 만들 때마다 손대는 것이라 왕복 비용이 크다. */
import { useState } from 'react'
import { PaperHeader } from '@/components/sheet/PaperHeader'
import { strings } from '@/app/strings'
import type { PaperHeader as HeaderData } from '@/domain/types'

export interface HeaderInlineProps {
  data: HeaderData
  fs: number
  questionCount: number
  totalPoints: number
  onChange(next: HeaderData): void
}

type Field = keyof Omit<HeaderData, 'showTotalPoints'>

const FIELDS: { key: Field; label: string }[] = [
  { key: 'school', label: strings.paperEdit.headerSchool },
  { key: 'subject', label: strings.paperEdit.headerSubject },
  { key: 'examName', label: strings.paperEdit.headerExam },
  { key: 'grade', label: strings.paperEdit.headerGrade },
  { key: 'duration', label: strings.paperEdit.headerDuration },
]

export function HeaderInline({
  data,
  fs,
  questionCount,
  totalPoints,
  onChange,
}: HeaderInlineProps) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        // 지면 위의 요소이므로 **인쇄에는 이 상호작용이 남지 않는다** —
        // 클릭 영역일 뿐 시각적으로는 머리말 그대로다
        style={{ cursor: 'text' }}
        role="button"
        tabIndex={0}
        aria-label={strings.paperEdit.headerEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setEditing(true)
        }}
      >
        <PaperHeader
          data={data}
          fs={fs}
          questionCount={questionCount}
          totalPoints={totalPoints}
          labels={strings.paper.headerLabels}
        />
      </div>
    )
  }

  return (
    <div
      className="zz-paper-header"
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.stopPropagation()
          setEditing(false)
        }
      }}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', paddingBottom: 6 }}
    >
      {FIELDS.map((f) => (
        <label key={f.key} style={{ fontSize: fs * 0.82 }}>
          {f.label}
          <input
            value={data[f.key]}
            onChange={(e) => onChange({ ...data, [f.key]: e.target.value })}
            style={{ width: '7em' }}
          />
        </label>
      ))}
      <label style={{ fontSize: fs * 0.82 }}>
        <input
          type="checkbox"
          checked={data.showTotalPoints}
          onChange={(e) => onChange({ ...data, showTotalPoints: e.target.checked })}
        />
        {strings.paperEdit.headerShowPoints}
      </label>
      <button type="button" onClick={() => setEditing(false)}>
        {strings.paperEdit.close}
      </button>
    </div>
  )
}
