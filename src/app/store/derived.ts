/** 파생 상태 — 조판 결과와 측정 높이.
 *
 *  **직렬화하지 않는다.** 저장하지 않는 것: 측정 높이, 조판 결과(페이지 배열),
 *  신뢰도, 되돌리기 스택, 선택 상태 (SS부록C · PP§9.3).
 *  되돌리기도 여기 걸지 않는다 — 문서가 되돌아가면 이건 다시 계산된다.
 *
 *  ⚠ 실제 페이지 타입과 측정기는 **zz-2(조판 엔진)가 소유**한다.
 *  zz-0 은 «어디에 두는가»만 정한다. */
import { create } from 'zustand'

export interface DerivedState {
  /** 측정 캐시. 키 = hash(renderInput) + columnWidthMm + fontScale + box (zz-2 D2) */
  heights: Map<string, number>
  /** 폰트가 준비되기 전에는 지면을 그리지 않는다 (PP§6.4 · zz-2 불변3).
   *  «로드 실패»도 준비 안 됨으로 본다 — 시스템 폰트로 그린 지면은 거짓이다 */
  fontsReady: boolean
  /** 서브셋 밖 글자를 만나 전체본을 받는 중 */
  loadingFullFont: boolean
  setFontsReady(v: boolean): void
  setLoadingFullFont(v: boolean): void
  putHeight(key: string, px: number): void
  clearHeights(): void
}

export const useDerivedStore = create<DerivedState>()((set) => ({
  heights: new Map(),
  fontsReady: false,
  loadingFullFont: false,
  setFontsReady: (v) => set({ fontsReady: v }),
  setLoadingFullFont: (v) => set({ loadingFullFont: v }),
  putHeight: (key, px) =>
    set((s) => {
      const next = new Map(s.heights)
      next.set(key, px)
      return { heights: next }
    }),
  clearHeights: () => set({ heights: new Map() }),
}))
