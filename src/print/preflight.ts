/** 인쇄 전 점검 — **잘못된 조판으로 50장을 뽑는 사고를 막는 곳** (zz-6 D6 · SS§8.4).
 *
 *  ⚠ **화면이 아니라 인쇄 흐름이 호출한다.** 안내 화면을 «건너뛰기»로 생략해도
 *  점검은 반드시 돈다 — 점검 시점은 «인쇄 창을 열기 전»이지 «그 화면»이 아니다.
 *
 *  다섯 중 **폰트만 차단**한다. 나머지는 알리고 «그대로»를 허용한다 —
 *  배점이 98점인 시험지도, 한 단에 안 들어가는 문항도 교사가 알고 낼 수 있다. */

export type PreflightCode =
  /** 배점 합계가 목표와 다르다 */
  | 'points'
  /** 지문 없이 담긴 종속 문항이 있다 */
  | 'orphan'
  /** 한 단에 안 들어가는 문항이 있다 */
  | 'overflow'
  /** ★ 웹폰트가 로드되지 않았다 — **유일한 차단 사유** */
  | 'fonts'

export interface PreflightIssue {
  code: PreflightCode
  /** 인쇄를 막는가 */
  blocking: boolean
  /** 몇 건인가 — 숫자를 준다 (SS§1.7) */
  count?: number
}

export interface PreflightInput {
  fontsReady: boolean
  totalPoints: number
  targetPoints: number
  orphanCount: number
  overflowCount: number
}

export function preflight(input: PreflightInput): PreflightIssue[] {
  const issues: PreflightIssue[] = []

  // ★ 폰트만 차단한다. 시스템 폰트로 그려진 지면을 50장 뽑으면 되돌릴 수 없다
  if (!input.fontsReady) issues.push({ code: 'fonts', blocking: true })

  if (input.totalPoints !== input.targetPoints) {
    issues.push({ code: 'points', blocking: false, count: input.totalPoints })
  }
  if (input.orphanCount > 0) {
    issues.push({ code: 'orphan', blocking: false, count: input.orphanCount })
  }
  if (input.overflowCount > 0) {
    issues.push({ code: 'overflow', blocking: false, count: input.overflowCount })
  }

  // ⚠ «마지막 쪽 여백»은 **알리지 않는다.** 시험지에서 흔한 일이고,
  // 매번 경고하면 진짜 경고를 무시하게 된다 (SS§8.4)
  return issues
}

export function isBlocked(issues: readonly PreflightIssue[]): boolean {
  return issues.some((i) => i.blocking)
}
