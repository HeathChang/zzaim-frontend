/** 전역 파일 동작 — **어느 화면에서든 파일을 열 수 있어야 한다** (SS§1.2 헤더).
 *
 *  화면마다 버튼을 두면 «시험지 화면에서는 파일을 못 연다» 같은 구멍이 생긴다 —
 *  실제로 셸 구조를 고치다 그렇게 됐다. 헤더가 소유하고, 앱이 실제 동작을 준다.
 *
 *  전역 상태(store)가 아니라 컨텍스트인 이유: **함수는 상태가 아니다.**
 *  스토어에 넣으면 직렬화·되돌리기 대상과 섞인다. */
import { createContext, useContext, type ReactNode } from 'react'

export interface FileActions {
  openFile(): void
  save(): void
  /** 인쇄 안내를 «건너뛰기»로 꺼 놨는가 (zz-6 D5) */
  printGuideSkipped?: boolean
  /** ⚠ 다시 켜는 길이 없으면 **한 번 끄면 영영 못 본다.** 헤더가 그 길이다 */
  showPrintGuide?(): void
}

const noop = (): void => undefined
const FileActionsContext = createContext<FileActions>({ openFile: noop, save: noop })

export function FileActionsProvider({
  value,
  children,
}: {
  value: FileActions
  children: ReactNode
}) {
  return <FileActionsContext.Provider value={value}>{children}</FileActionsContext.Provider>
}

export function useFileActions(): FileActions {
  return useContext(FileActionsContext)
}
