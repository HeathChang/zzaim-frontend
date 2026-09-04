/** 지면 본문 서식 — 값은 전부 HO§지면본문서식에서 왔다.
 *
 *  **문항 본문은 불투명 블록이다** (PP§6.1). 여기서 발문·선택지를 구조로 나누지
 *  않는다. 선택지 컴포넌트는 «이미 나뉜 것»을 그릴 뿐, 나누는 일은 하지 않는다. */
import type { ReactNode } from 'react'

export interface QuestionRowProps {
  /** 배치 결과에서 나온 번호. 없으면 번호 칸을 비운다 (numberBaked 등) */
  number: number | null
  points?: number | null
  /** 정제된 본문 HTML. 정제는 zz-3(DOMPurify)이 이미 끝냈다 */
  html: string
  pointsLabel: (n: number) => string
  children?: ReactNode
}

/** 배점을 **발문 끝**에 붙인다.
 *
 *  ⚠ 본문 뒤에 그냥 이어 붙이면 **선택지 다음 줄로 밀린다** — 원본 시험지는
 *  발문 끝에 `[3점]` 이 온다. 번호·배점은 조판 엔진이 소유하므로(PP§6.1)
 *  붙이는 자리도 엔진이 정한다.
 *
 *  발문이 여러 문단으로 줄바꿈된 경우가 있어서(원본이 그렇게 온다) «첫 문단»이
 *  아니라 **«선택지 직전 문단»** 에 붙인다. 선택지는 `①~⑤` 로 시작한다. */
export const CHOICE_START = /^\s*(?:<[^>]+>\s*)*[①②③④⑤⑥⑦⑧⑨⑩]/

export function withPoints(html: string, label: string): string {
  const paragraphs = html.split(/(?<=<\/p>)/)
  const firstChoice = paragraphs.findIndex((p) => CHOICE_START.test(p))
  const target = firstChoice === -1 ? paragraphs.length - 1 : firstChoice - 1
  if (target < 0) {
    // 선택지가 첫 문단이다 — 붙일 발문이 없다. 맨 앞에 둔다
    return `${label} ${html}`
  }
  const chunk = paragraphs[target]
  if (chunk === undefined) return `${html} ${label}`
  const closing = chunk.lastIndexOf('</p>')
  paragraphs[target] =
    closing === -1
      ? `${chunk} ${label}`
      : `${chunk.slice(0, closing)} ${label}${chunk.slice(closing)}`
  return paragraphs.join('')
}

export function QuestionRow({ number, points, html, pointsLabel, children }: QuestionRowProps) {
  const body = points != null ? withPoints(html, pointsLabel(points)) : html
  return (
    <div className="zz-item zz-question">
      <div className="zz-number">{number == null ? '' : `${number}.`}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 본문은 이미 정제된 HTML 이다 — 배점만 발문 끝에 얹는다 */}
        <span dangerouslySetInnerHTML={{ __html: body }} />
        {children}
      </div>
    </div>
  )
}


export interface PassageBoxProps {
  instruction: string
  html: string
  /** 등사기 대응으로 **테두리가 기본**이다. 음영은 선택 (PP§6.4) */
  box: 'border' | 'shade'
  fs: number
}

export function PassageBox({ instruction, html, box, fs }: PassageBoxProps) {
  return (
    <div className="zz-item">
      {instruction && <div className="zz-instruction">{instruction}</div>}
      <div
        className="zz-passage"
        data-box={box}
        style={{ fontSize: fs * 0.96 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
