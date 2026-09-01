/** UI 상태 — 커서·패널·검색·선택. 되돌리기 대상이 아니고 저장하지도 않는다. */
import { create } from 'zustand'
import type { BrowserTier } from '@/app/browserTier'

/** zz-0 D9 — HO§Tweaks `statusDensity` 는 `full` | `lean` 두 값뿐이다.
 *  `full` 이 기본이고, 창 폭이 1280 미만일 때만 `lean` 으로 떨어진다. */
export type StatusDensity = 'full' | 'lean'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'readonly' | 'disconnected'

export interface UiState {
  // ⚠ «지금 어느 화면인가»를 여기 두지 않는다. 화면은 App 의 조건부 렌더가
  // 결정하고, 같은 사실을 두 곳에 두면 반드시 갈라진다.
  // (한때 `screen`·`setScreen` 과 전이표가 있었지만 **아무도 읽지 않았다**)
  tier: BrowserTier
  /** 공용 PC 모드. 켜면 **다음 실행 시작 시점에** IndexedDB 를 정리한다 —
   *  `unload` 삭제는 브라우저가 보장하지 않는다 (zz-1 D6) */
  publicPc: boolean
  narrow: boolean
  leftPanelCollapsed: boolean
  saveStatus: SaveStatus
  fileName: string | null
  helpOpen: boolean

  setTier(t: BrowserTier): void
  setPublicPc(v: boolean): void
  setNarrow(v: boolean): void
  setLeftPanelCollapsed(v: boolean): void
  setSaveStatus(s: SaveStatus): void
  setFileName(n: string | null): void
  setHelpOpen(v: boolean): void
}

export const useUiStore = create<UiState>()((set) => ({
  tier: 'full',
  publicPc: false,
  narrow: false,
  leftPanelCollapsed: false,
  saveStatus: 'saved',
  fileName: null,
  helpOpen: false,

  setTier: (tier) => set({ tier }),
  setPublicPc: (publicPc) => set({ publicPc }),
  setNarrow: (narrow) =>
    // HO§반응형 — 좁아지면 좌측 패널을 접는다. 지면을 줄이지 않는다 (SS§6.3)
    set((s) => ({ narrow, leftPanelCollapsed: narrow ? true : s.leftPanelCollapsed })),
  setLeftPanelCollapsed: (leftPanelCollapsed) => set({ leftPanelCollapsed }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setFileName: (fileName) => set({ fileName }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}))

/** zz-0 D9 — 밀도는 창 폭 하나로 정해진다. 사용자 설정이 아니다. */
export function statusDensityFor(narrow: boolean): StatusDensity {
  return narrow ? 'lean' : 'full'
}
