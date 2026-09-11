/** 인쇄 흐름 (zz-6 D4 · HO§인쇄 3단계).
 *
 *  «인쇄 창 열기» → **시험지 화면으로 돌리고 패널을 닫은 뒤** → `@page` 갱신 → `window.print()`
 *
 *  패널을 닫는 이유: 화면과 인쇄가 **같은 DOM** 을 쓰므로(불변1) 열린 패널이
 *  지면 폭을 바꾼 채로 인쇄되면 조판이 달라진다.
 *
 *  ⚠ 점검(`preflight`)은 **여기서** 부른다. 안내 화면을 건너뛰어도 반드시 돈다. */
import { applyPageRule } from '@/print/pageRule'
import { isBlocked, preflight, type PreflightInput, type PreflightIssue } from '@/print/preflight'
import type { Orientation, PageSize } from '@/domain/types'

export interface PrintFlowPorts {
  pageSize: PageSize
  orientation?: Orientation
  /** 지면 화면으로 돌리고 열린 패널을 닫는다 */
  focusPaper(): void
  print(): void
  doc?: Document
}

export interface PrintAttempt {
  issues: PreflightIssue[]
  /** 실제로 인쇄 창을 열었는가 */
  printed: boolean
}

export function tryPrint(input: PreflightInput, ports: PrintFlowPorts): PrintAttempt {
  const issues = preflight(input)
  if (isBlocked(issues)) return { issues, printed: false }

  // ① 지면만 남긴다 — 패널이 열린 채면 폭이 달라져 조판이 바뀐다
  ports.focusPaper()
  // ② 용지 규칙을 갱신한다. `@page` 는 CSS 변수를 못 쓰므로 규칙 자체를 갈아 끼운다
  applyPageRule(ports.pageSize, ports.orientation ?? 'portrait', ports.doc)
  // ③ 브라우저 인쇄 — **PDF도 이 경로다.** 자체 생성기를 만들면 «동일 렌더 경로»가 깨진다
  ports.print()
  return { issues, printed: true }
}
