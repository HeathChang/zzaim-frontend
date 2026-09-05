/** 가져오기 중간 상태.
 *
 *  **`raw` 는 불변이다** (zz-3 D9). 세그먼트의 `start`/`end` 가 `raw` 를 가리키므로,
 *  확정 전에 본문을 건드리면 **원본 강조와 양방향 점프가 깨진다**(zz-4 가 그것을 쓴다).
 *  번호·배점 토큰 제거는 **확정 시점**에만 한다. */
import type { ReasonCode } from '@/importing/confidence'

/** 정제가 뽑아낸 한 덩이. 문단·표칸·목록 항목 또는 이미지 */
export interface Block {
  /** 보이는 글자만. 태그는 벗겨져 있다 */
  text: string
  tag: 'p' | 'td' | 'li' | 'img'
  /** 이 덩이가 이미지를 품고 있는가 (또는 이미지 자체인가) */
  hasImage: boolean
  /** 브라우저가 그 이미지를 읽을 수 있는가. 못 읽으면 **자리표시자**가 된다 */
  imageStatus?: 'usable' | 'local-path' | 'missing'
  /** 이미지 원본 경로. 한글 클립보드는 `file://` 로 준다 — 브라우저가 못 읽는다 */
  imageSrc?: string
  /** 선택지로 판정됐다 — `1)~5)` 형식일 때만 쓴다 */
  isChoice?: boolean
  /** `raw` 안에서의 위치. zz-4 의 원본 강조가 쓴다 */
  start: number
  end: number
}

export type SegmentRole = 'question' | 'passage' | 'unknown'

/** 세그먼트 하나 — 아직 `Question` 이 아니다. 확정해야 도메인 객체가 된다 */
export interface Segment {
  role: SegmentRole
  lines: string[]
  start: number
  end: number
  /** 원본 시험지의 번호 */
  numberHint: number | null
  points: number | null
  hasCrossRef: boolean
  /** 묶음 지시문의 범위 `[1~3]` */
  range?: { from: number; to: number }
  hasImage: boolean
  /** ★ 그림이 있었는데 **가져오지 못했다.** 모르게 두면 교사가 그림 없는
   *  시험지를 그대로 인쇄한다 (zz-3 D7) */
  hasMissingImage: boolean
  /** 0~1 */
  confidence: number
  /** 왜 그 점수인지 — 숫자만 보여 주면 사용자가 판단할 근거가 없다 (SS§4.5).
   *  **코드**다. 사람이 읽는 문구는 `strings.confidence` 가 소유한다 */
  reasons: ReasonCode[]
}

export interface ImportResult {
  /** 정제된 원본. **이후 불변** */
  raw: string
  /** 정제가 뽑은 덩이들. **재분리(zz-4 D6)가 이걸 다시 쓴다** —
   *  없으면 «형식을 골라 다시 나누기»를 할 수 없다 */
  blocks: Block[]
  segments: Segment[]
  /** 서식 없는 텍스트로 들어왔는가 — 표와 그림이 사라졌다는 뜻이다 */
  plainTextOnly: boolean
}

