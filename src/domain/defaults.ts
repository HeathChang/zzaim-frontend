/** 시험지 기본값 — **한 곳에서만 정한다.**
 *
 *  `S04Paper` 의 조판 설정과 문서에 저장되는 `PaperLayout` 이 따로 놀면
 *  «화면에서 본 것»과 «파일에 담긴 것»이 달라진다. 둘의 출처를 여기로 모은다.
 *  값의 근거는 PP§6.2(A4 2단·여백 20/20/20/15mm)이며, 사용자가 고치는 길은
 *  14~16주 S-05 가 연다 (UD-51). */
import type { PaperHeader, PaperLayout } from '@/domain/types'

export const DEFAULT_LAYOUT: PaperLayout = {
  pageSize: 'A4',
  orientation: 'portrait',
  columns: 2,
  duplex: false,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  gutter: 8,
  columnRule: false,
  // ⚠ **퍼센트다.** `1` 을 넣으면 본문이 0.136px 로 그려진다
  fontScale: 100,
  startNumber: 1,
  targetPoints: 100,
  box: 'border',
  folio: true,
  closing: false,
  carryMark: true,
}

export const EMPTY_HEADER: PaperHeader = {
  school: '',
  grade: '',
  subject: '',
  examName: '',
  duration: '',
  teacher: '',
  showTotalPoints: true,
}
