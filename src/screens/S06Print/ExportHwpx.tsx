/** 한글 파일로 내보내기 (zz-9 D2·D4).
 *
 *  ★ **한계를 먼저 말한다.** 버튼 옆에 «줄바꿈이 조금 달라질 수 있습니다» 를 항상
 *  둔다(UD-49). 이걸 빼면 교사가 한글에서 열어보고 «망가졌다»고 판단하고 —
 *  실제로는 우리가 약속한 그대로인데도 — 도구를 버린다.
 *
 *  ⚠ **실패해도 인쇄 경로는 건드리지 않는다** (검증 항목). 내보내기는 부가 기능이고,
 *  이 제품의 본체는 종이다. */
import { useState } from 'react'
import { strings } from '@/app/strings'

export interface ExportHwpxProps {
  /** 바이트를 만든다. 던지면 실패로 표시한다 */
  build(): Uint8Array
  fileName: string
  save(bytes: Uint8Array, fileName: string): void
  /** 담긴 문항이 없다 */
  empty?: boolean
}

type Phase = 'idle' | 'working' | 'done' | 'failed'

export function ExportHwpx({ build, fileName, save, empty = false }: ExportHwpxProps) {
  const [phase, setPhase] = useState<Phase>('idle')

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <button
        type="button"
        aria-disabled={empty || phase === 'working'}
        aria-describedby="hwpx-caveat"
        onClick={() => {
          if (empty || phase === 'working') return
          setPhase('working')
          try {
            const bytes = build()
            save(bytes, fileName)
            setPhase('done')
          } catch {
            // 사유를 삼키지 않는다 — 다만 인쇄는 계속 된다는 사실을 함께 말한다
            setPhase('failed')
          }
        }}
      >
        {phase === 'working' ? strings.hwpx.working : strings.hwpx.button}
      </button>

      {/* 항상 보인다. «성공했을 때만» 알리면 이미 늦다 */}
      <p id="hwpx-caveat" style={{ color: 'var(--color-neutral-700)' }}>
        {strings.hwpx.caveat}
      </p>

      <p role="status">
        {empty
          ? strings.hwpx.empty
          : phase === 'done'
            ? strings.hwpx.done
            : phase === 'failed'
              ? strings.hwpx.failed
              : ''}
      </p>
    </section>
  )
}
