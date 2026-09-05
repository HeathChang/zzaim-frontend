/** 이미지는 오지 않는다 — 자리표시자로 남긴다 (zz-3 D7 · PP§7.1 «알려진 한계»).
 *
 *  한글 클립보드 HTML 의 이미지는 **`file://` 경로이거나 아예 누락**된다.
 *  브라우저는 그 경로를 읽을 수 없다. 그림이 사라진 것을 **모르게 두면 안 된다** —
 *  교사가 그대로 인쇄해서 그림 없는 시험지를 나눠 준다.
 *
 *  **이것이 MVP 대상 과목을 텍스트 과목으로 좁히는 이유다** (PP§3.1). */

export type ImageStatus =
  /** 브라우저가 읽을 수 있다 (data: 또는 http) */
  | 'usable'
  /** 로컬 경로 — 읽을 수 없다 */
  | 'local-path'
  /** 원본에 이미지가 있었는데 경로조차 없다 */
  | 'missing'

export function classifyImage(src: string | undefined): ImageStatus {
  if (!src) return 'missing'
  if (/^data:/i.test(src)) return 'usable'
  if (/^https?:/i.test(src)) return 'usable'
  // `file://`, 상대 경로, `cid:` 등은 전부 못 읽는다
  return 'local-path'
}

export interface Placeholder {
  status: ImageStatus
  /** 나중에 크롭(v1)으로 대체할 대상인가 */
  needsCrop: boolean
}


