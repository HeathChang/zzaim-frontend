/** 데이터 모델 — 출처는 기획서 §6.2 하나다. 여기서 창작하지 않는다.
 *
 *  설계의 핵심(§6.1): **문항은 불투명 블록이다.** 내부 구조(발문·선택지 5개)를
 *  모델링하지 않는다. 예외는 둘 — 번호와 배점. 재배치하면 값이 바뀌므로
 *  조판 엔진이 소유한다. */

// ── 문항 본문 ──────────────────────────────────────────────
export type QuestionBody =
  | { kind: 'html'; html: string }
  | { kind: 'image'; blobId: string; naturalWidth: number; naturalHeight: number }

// ── 문항 ───────────────────────────────────────────────────
export interface Question {
  id: string
  body: QuestionBody
  /** 기본 배점. 본문에서 추출한다. 시험지별 재정의는 PaperItem 이 갖는다 */
  points: number | null
  /** 원본 시험지에 적혀 있던 번호. 표시하지 않고 참고만 한다 */
  numberHint: number | null
  /** 번호가 이미지 픽셀에 박혀 있다 → 자동 채번을 끈다 */
  numberBaked: boolean
  /** 본문이 «위 3번과 관련하여»처럼 다른 문항을 가리킨다 → 재배치 시 경고 */
  hasCrossRef: boolean
  /** 종속된 공통 지문. 없으면 독립 문항 */
  passageId: string | null
  tags: string[]
  note: string
  answer?: string
  source?: { kind: 'paste' | 'crop' | 'hwpx'; ref?: string }
  createdAt: number
  updatedAt: number
}

// ── 공통 지문 ──────────────────────────────────────────────
/** «[1~3] 다음 글을 읽고 물음에 답하시오» — 국어·영어 시험지의 절반이 이 구조다 */
export interface Passage {
  id: string
  body: QuestionBody
  instruction: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

// ── 시험지에 놓인 것 ───────────────────────────────────────
/** 지문 묶음의 분할 정책.
 *  ⚠ MVP 는 `together` 만 구현한다 — 스칼라 높이 하나로는 지문 내부의 절단
 *  지점을 계산할 수 없고, 어디서 자를지의 규칙이 기획서에도 없다 (zz-2 D4 · UD-39).
 *  `passage-first` 가 들어오면 `together` 로 강등하고 경고를 남긴다. */
export type SplitPolicy = 'together' | 'passage-first'

export type PaperItem =
  | { kind: 'question'; questionId: string; overridePoints?: number; keepWithNext?: boolean }
  | {
      kind: 'passageGroup'
      passageId: string
      children: { questionId: string; overridePoints?: number }[]
      splitPolicy: SplitPolicy
    }
  /** 서술형 답안 공간 */
  | { kind: 'spacer'; heightMm: number; ruled: boolean }
  | { kind: 'divider' }
  | { kind: 'notice'; html: string }

export type PageSize = 'A4' | 'B4'
export type Orientation = 'portrait' | 'landscape'
export type ColumnCount = 1 | 2

export interface PaperHeader {
  school: string
  grade: string
  subject: string
  examName: string
  duration: string
  teacher: string
  showTotalPoints: boolean
}

export interface PaperLayout {
  pageSize: PageSize
  orientation: Orientation
  columns: ColumnCount
  /** 양면 인쇄 — 홀·짝에서 안쪽/바깥쪽 여백이 뒤집힌다 */
  duplex: boolean
  /** mm */
  margin: { top: number; bottom: number; inner: number; outer: number }
  /** 단 간격 (mm) */
  gutter: number
  columnRule: boolean
  /** ⚠ **퍼센트다** (85~115). 0.85~1.15 가 아니다 —
   *  저장 형식(`FORMAT.md`)·조판 엔진(`fs = 13.6 * fontScale / 100`)이 모두 퍼센트를 쓴다.
   *  한때 이 주석만 «0.85~1.15» 라 기본값이 `1` 로 들어간 적이 있다. 그러면 본문이
   *  **0.136px** 로 그려진다 — 화면이 빈 것처럼 보이고 원인을 찾기 어렵다 */
  fontScale: number
  startNumber: number
  /** 목표 총점. 수행평가·단원평가는 100점이 아닌 경우가 흔하다 (UD-25) */
  targetPoints: number
  /** 지문 상자 모양. 등사기 대응으로 **테두리가 기본**이다 (zz-6 D8) */
  box: 'border' | 'shade'
  /** 쪽 번호 `N / M` (기본 켜짐) */
  folio: boolean
  /** 마무리 문구 «— 수고하셨습니다 —» (기본 꺼짐) */
  closing: boolean
  /** 지문 이어짐 표기.
   *  ⚠ **MVP 에서는 발화하지 않는다** — 배치가 `splitPolicy` 를 `together` 로 고정해
   *  지문이 나뉘지 않기 때문이다 (zz-2 D4 · UD-39). 항목만 두고 v1 에서 켠다 */
  carryMark: boolean
}

export interface Variant {
  label: string
  /** items 인덱스의 순열 */
  order: number[]
  /** 셔플에서 제외할 인덱스 */
  locked: number[]
}

export interface Paper {
  id: string
  title: string
  header: PaperHeader
  layout: PaperLayout
  items: PaperItem[]
  variants?: Variant[]
  createdAt: number
  updatedAt: number
}

// ── 가져오기 중간 상태 ─────────────────────────────────────
export type SegmentRole = 'question' | 'passage' | 'unknown'

export interface ImportSegment {
  start: number
  end: number
  /** 0~1 */
  confidence: number
  guessedNumber: number | null
  guessedPoints: number | null
  role: SegmentRole
}

export interface ImportSession {
  id: string
  /** 정제된 원본 HTML */
  raw: string
  segments: ImportSegment[]
  confirmed: boolean
}
