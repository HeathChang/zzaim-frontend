/** `.etp` 파일 포맷 — **이 제품에서 데이터의 정본이 사는 곳** (PP§3.2).
 *
 *  두 가지를 지킨다.
 *  1. **사람이 열어볼 수 있게 둔다.** zip 을 풀면 읽을 수 있는 JSON 이 나온다.
 *     서비스가 사라져도 데이터가 남아야 한다 (PP§10 이식성)
 *  2. **포맷 버전이 사용자 데이터를 인질로 잡지 않는다.** 업그레이드만 하고
 *     다운그레이드는 지원하지 않되, 올리기 전에 원본을 남긴다 (PP§6.2) */
import type { Paper, Passage, Question } from '@/domain/types'

/** 올릴 때마다 `migrate.ts` 에 단계를 추가한다. 건너뛰지 않는다. */
export const SCHEMA_VERSION = 1

export const ENTRY = {
  manifest: 'manifest.json',
  questions: 'questions.json',
  passages: 'passages.json',
  papers: 'papers.json',
  /** 이미지 등 — 내용 해시로 이름을 붙여 **추가만** 한다 (v1 증분 저장의 전제) */
  blobDir: 'blobs/',
} as const

/** 교정 통계 — «이 제품의 유일한 자동 계측»이다 (SS§4.12).
 *  서버가 없으므로 휴리스틱 개선 여부를 잴 수 있는 장치가 이것뿐이다. */
export interface ImportStats {
  /** 자동 분리 결과를 사람이 고친 횟수 */
  corrections: number
  /** 번호·배점을 고친 횟수 — 경계 교정과 성격이 다르므로 따로 센다 */
  fieldEdits: number
  /** S-02 진입부터 확정까지(초). 30초 이상 무조작은 뺀다 */
  seconds: number
  questionCount: number
}

export interface Manifest {
  schemaVersion: number
  /** 저장 시각(ms). **정본/캐시 우선순위 판정에 쓴다** (SS§10 D-02·D-03) */
  updatedAt: number
  /** 만든 앱 버전 — 버그 추적용. 동작에 쓰지 않는다 */
  app?: string
  stats?: ImportStats[]
}

/** 파일에 담기는 전부. **런타임 상태가 아니다** — 측정 높이·조판 결과·되돌리기
 *  스택·선택 상태는 파생 데이터라 담지 않는다 (PP§9.3 · SS부록C). */
export interface EtpDocument {
  manifest: Manifest
  questions: Question[]
  passages: Passage[]
  papers: Paper[]
  /** `blobs/<contentHash>` — 키는 해시, 값은 바이트 */
  blobs: Map<string, Uint8Array>
}

export function emptyDocument(now: number): EtpDocument {
  return {
    manifest: { schemaVersion: SCHEMA_VERSION, updatedAt: now },
    questions: [],
    passages: [],
    papers: [],
    blobs: new Map(),
  }
}
