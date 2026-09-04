/** 시험지 머리말 — **첫 쪽에만**. 값은 전부 HO§머리말에서 왔다. */
import type { PaperHeader as HeaderData } from '@/domain/types'

export interface PaperHeaderProps {
  data: HeaderData
  /** 본문 글자 크기(px). 머리말 크기는 여기서 파생된다 */
  fs: number
  questionCount: number
  totalPoints: number
  labels: { minutes: string; questions: string; points: string; klass: string; no: string; name: string }
}

export function PaperHeader({ data, fs, questionCount, totalPoints, labels }: PaperHeaderProps) {
  return (
    <header className="zz-paper-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: fs * 0.82, letterSpacing: '0.22em' }}>
            {data.school} {data.examName}
          </div>
          <div style={{ fontSize: fs * 1.35, letterSpacing: '0.3em' }}>{data.subject}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: fs * 0.82 }}>
          <div
            style={{
              display: 'flex',
              gap: 11,
              justifyContent: 'flex-end',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {/* 빈 값은 라벨도 숨긴다 — 안 그러면 «본» 같은 조각만 남는다 */}
            {data.duration !== '' && (
              <span>
                {data.duration}
                {labels.minutes}
              </span>
            )}
            <span>
              {questionCount}
              {labels.questions}
            </span>
            {data.showTotalPoints && (
              <span>
                {totalPoints}
                {labels.points}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 11, justifyContent: 'flex-end', marginTop: 4 }}>
            <span>
              {labels.klass} <i className="zz-blank" style={{ width: '2.1em' }} />
            </span>
            <span>
              {labels.no} <i className="zz-blank" style={{ width: '2.1em' }} />
            </span>
            <span>
              {labels.name} <i className="zz-blank" style={{ width: '4.8em' }} />
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
