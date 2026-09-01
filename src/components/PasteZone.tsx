/** 붙여넣기 영역 — S-00 의 8할이고, v1 에서 S-03 빈 상태가 같은 것을 쓴다 (SS부록A).
 *
 *  SS§2.7: `role="button"` 이 아니라 **`<textarea>` 기반**이다.
 *  스크린리더가 «붙여넣을 수 있는 영역»으로 읽어야 한다.
 *
 *  ⚠ **textarea 를 `readOnly` 로 두지 않는다.** readOnly 요소는 편집 조작을
 *  막으므로 붙여넣기가 아예 도착하지 않을 수 있다 — 그러면 제품의 첫 동선이
 *  통째로 죽는다. 대신 **값을 즉시 비운다.** 타이핑으로 문항을 만들게 하지
 *  않는다는 뜻은 지키면서(PP§7), 붙여넣기는 확실히 받는다. */
import { useRef } from 'react'

export interface PastePayload {
  /** 한글이 주는 서식 있는 HTML. 없으면 null — 그때는 평문 경로로 간다 (SS§2.6) */
  html: string | null
  text: string
}

export interface PasteZoneProps {
  label: string
  hint?: string
  onPaste(payload: PastePayload): void
  autoFocus?: boolean
}

export function readPaste(data: DataTransfer): PastePayload {
  const html = data.getData('text/html')
  return { html: html === '' ? null : html, text: data.getData('text/plain') }
}

export function PasteZone({ label, hint, onPaste, autoFocus = false }: PasteZoneProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  return (
    <div
      style={{
        border: '1px dashed var(--color-divider)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-8)',
        textAlign: 'center',
        cursor: 'text',
        background: 'var(--color-neutral-100)',
        position: 'relative',
      }}
      onClick={() => ref.current?.focus()}
    >
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        aria-label={label}
        value=""
        onChange={() => {
          /* 타이핑은 무시한다. 값은 언제나 빈 문자열로 유지된다 */
        }}
        onPaste={(e) => {
          e.preventDefault()
          onPaste(readPaste(e.clipboardData))
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          resize: 'none',
          border: 0,
        }}
      />
      <div style={{ fontSize: 18, pointerEvents: 'none' }}>{label}</div>
      {hint && (
        <div
          style={{
            marginTop: 'var(--space-2)',
            color: 'var(--color-neutral-700)',
            pointerEvents: 'none',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
