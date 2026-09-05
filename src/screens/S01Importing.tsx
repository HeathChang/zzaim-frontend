/** S-01 붙여넣기 처리 — **화면이라기보다 거쳐 가는 상태다.**
 *  오래 머무르면 실패다 (SS§3).
 *
 *  진행률보다 **«문항 N개를 찾았습니다»의 실시간 증가**가 안심을 준다.
 *  0.3초 미만이면 이 화면을 아예 건너뛴다 (SS§1.3 — 깜빡임이 더 나쁘다). */
import { useEffect, useRef, useState } from 'react'
import { strings } from '@/app/strings'

/** 이보다 짧으면 화면을 띄우지 않는다 */
export const SKIP_BELOW_MS = 300
/** 스크린리더 갱신 간격 — 개수가 오를 때마다 읽으면 시끄럽다 (SS§3.5) */
export const ANNOUNCE_INTERVAL_MS = 2000

export interface S01ImportingProps {
  found: number
  progress: number
  onCancel(): void
}

export function S01Importing({ found, progress, onCancel }: S01ImportingProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [announced, setAnnounced] = useState(found)

  // [취소]에 포커스를 두어 Enter 로 즉시 중단할 수 있게 한다 (SS§3.5)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // 2초 간격으로만 읽어 준다
  useEffect(() => {
    const t = setInterval(() => setAnnounced(found), ANNOUNCE_INTERVAL_MS)
    return () => clearInterval(t)
  }, [found])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        minHeight: 320,
      }}
    >
      <p>{strings.importing.reading}</p>
      <progress value={progress} max={1} aria-label={strings.importing.reading} />
      {/* 화면에는 실시간, 스크린리더에는 2초 간격 */}
      <p aria-hidden>{strings.importing.found(found)}</p>
      <p role="status" style={{ position: 'absolute', left: -9999 }}>
        {strings.importing.found(announced)}
      </p>
      <button type="button" ref={cancelRef} onClick={onCancel}>
        {strings.dialog.cancel}
      </button>
    </div>
  )
}
