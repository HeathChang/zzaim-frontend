/** S-06 인쇄 준비 (SS§8).
 *
 *  **체크리스트는 알리되 강제하지 않는다** (zz-6 D5). 체크하지 않아도 인쇄 창을
 *  열 수 있다 — 교사가 이미 설정을 아는 경우가 대부분이고, 매번 막으면 안내를
 *  읽지 않게 된다.
 *
 *  ⚠ 그러나 **점검은 건너뛰지 않는다.** «건너뛰기»는 안내 화면만 생략한다 (D5). */
import { useEffect, useRef, useState } from 'react'
import { strings } from '@/app/strings'
import { detectPrintBrowser, hintImage, type PrintBrowser } from '@/screens/S06Print/browserHints'
import type { PreflightIssue } from '@/print/preflight'
import { ExportHwpx } from '@/screens/S06Print/ExportHwpx'

export interface S06PrintProps {
  issues: readonly PreflightIssue[]
  skipNextTime: boolean
  onChangeSkip(next: boolean): void
  onPrint(): void
  onCancel(): void
  userAgent?: string
  /** 한글 파일로 내보내기 (zz-9). 없으면 그 자리를 비운다 */
  hwpx?: { build(): Uint8Array; fileName: string; empty: boolean }
  saveFile?(bytes: Uint8Array, fileName: string): void
}

const CHECKS = ['margin', 'background', 'headerFooter'] as const
type Check = (typeof CHECKS)[number]

export function S06Print({
  issues,
  skipNextTime,
  onChangeSkip,
  onPrint,
  onCancel,
  userAgent = navigator.userAgent,
  hwpx,
  saveFile,
}: S06PrintProps) {
  const [checked, setChecked] = useState<ReadonlySet<Check>>(new Set())
  const firstRef = useRef<HTMLInputElement>(null)
  const browser: PrintBrowser = detectPrintBrowser(userAgent)

  const blocking = issues.filter((i) => i.blocking)
  const warnings = issues.filter((i) => !i.blocking)

  // 진입 포커스는 첫 체크박스 — 세 항목을 순서대로 읽을 수 있게 (SS§8.7)
  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Enter' && blocking.length === 0) {
          e.preventDefault()
          onPrint()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
      style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <h1>{strings.print.title}</h1>

      {/* 점검 걸림 — 체크리스트 **위에** 경고 카드 (SS§8.5) */}
      {issues.length > 0 && (
        <section
          role="alert"
          style={{
            border: '1px solid var(--color-accent-700)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
          }}
        >
          {blocking.map((i) => (
            <p key={i.code}>⚠ {strings.print.issue[i.code]}</p>
          ))}
          {warnings.map((i) => (
            <p key={i.code} style={{ color: 'var(--color-neutral-700)' }}>
              {strings.print.issue[i.code]}
              {i.count !== undefined && ` (${i.count})`}
            </p>
          ))}
        </section>
      )}

      <section>
        <h2 style={{ fontSize: 15 }}>{strings.print.checklistTitle(browser)}</h2>
        {CHECKS.map((c, i) => (
          <label key={c} style={{ display: 'block' }}>
            <input
              ref={i === 0 ? firstRef : undefined}
              type="checkbox"
              checked={checked.has(c)}
              onChange={() =>
                setChecked((prev) => {
                  const next = new Set(prev)
                  if (next.has(c)) next.delete(c)
                  else next.add(c)
                  return next
                })
              }
            />
            {strings.print.check[c][browser]}
          </label>
        ))}
        {/* 스크린샷은 **자산 제작 작업**이다 (D11). 없으면 문구만 보여 준다 */}
        <img
          src={hintImage(browser)}
          alt={strings.print.hintAlt(browser)}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
          style={{ maxWidth: '100%' }}
        />
      </section>

      {/* 인쇄와 **나란히** 둔다. 제출은 파일로 하고 검토는 종이로 하므로
          둘 중 하나를 고르는 것이 아니라 둘 다 쓴다 (PP§4.3②) */}
      {hwpx && saveFile && (
        <ExportHwpx
          build={hwpx.build}
          fileName={hwpx.fileName}
          empty={hwpx.empty}
          save={saveFile}
        />
      )}

      <label>
        <input
          type="checkbox"
          checked={skipNextTime}
          onChange={(e) => onChangeSkip(e.target.checked)}
        />
        {strings.print.skipNext}
      </label>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button type="button" onClick={onCancel}>
          {strings.dialog.cancel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (blocking.length === 0) onPrint()
          }}
          // ⚠ `disabled` 를 쓰지 않는다. 진짜 `disabled` 버튼은 **포커스를 못 받아**
          // 아래 사유(`aria-describedby`)가 스크린리더에 읽히지 않는다 —
          // 왜 못 누르는지 모르는 채로 막히는 것이 가장 나쁘다
          aria-disabled={blocking.length > 0}
          aria-describedby={blocking.length > 0 ? 'print-blocked' : undefined}
        >
          {strings.print.open}
        </button>
      </div>
      {blocking.length > 0 && (
        <p id="print-blocked">{strings.print.issue[blocking[0]!.code]}</p>
      )}
    </div>
  )
}
