/** 앱 헤더 — SS§1.2. height 40 (SS부록D).
 *  🔒 배지는 **상시 노출**이다. 공용 PC 모드는 잊으면 안 되는 상태다. */
import { strings } from '@/app/strings'
import { needsPersistentSaveWarning } from '@/app/browserTier'
import { useUiStore, type SaveStatus } from '@/app/store/ui'
import { useFileActions } from '@/app/FileActions'

/** 상태를 하나라도 빠뜨리면 타입이 잡는다 — 빈 문자열이 조용히 나가면 안 된다 */
const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: strings.save.savedJustNow,
  saving: strings.save.saving,
  unsaved: strings.save.unsaved,
  readonly: strings.save.readonly,
  disconnected: strings.save.disconnected,
}

export function Header() {
  // 셀렉터로 구독한다 — 통째로 구독하면 UI 상태가 바뀔 때마다 헤더가 다시 그려진다
  const fileName = useUiStore((s) => s.fileName)
  const saveStatus = useUiStore((s) => s.saveStatus)
  const publicPc = useUiStore((s) => s.publicPc)
  const tier = useUiStore((s) => s.tier)
  const { openFile, printGuideSkipped, showPrintGuide } = useFileActions()
  // 되쓰기가 안 되는 등급에서는 «저장됨»이 거짓말이 된다 (SS§13.2)
  const warn = needsPersistentSaveWarning(tier) || saveStatus === 'unsaved'

  return (
    <header
      // 화면 전용 — 인쇄물에 앱 헤더가 나가면 안 된다
      data-print="hide"
      style={{
        height: 'var(--size-header)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '0 var(--space-4)',
        borderBottom: '1px solid var(--color-divider)',
        background: 'var(--color-surface)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-heading)' }}>{strings.app.name}</span>
      <span>{fileName ?? ''}</span>
      <span
        aria-live="polite"
        style={{
          color: warn ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
          fontWeight: warn ? 700 : 400,
        }}
      >
        {SAVE_LABEL[saveStatus]}
        {warn ? ' ⚠' : ''}
      </span>
      {publicPc && <span>🔒 {strings.common.publicPc}</span>}
      {/* 안내를 끈 사람에게 **되돌릴 길**을 남긴다 (zz-6 D5) */}
      {printGuideSkipped && showPrintGuide && (
        <button type="button" onClick={showPrintGuide} style={{ marginLeft: 'auto' }}>
          {strings.print.again}
        </button>
      )}
      {/* 어느 화면에서든 파일을 열 수 있어야 한다 (SS§1.2) */}
      <button
        type="button"
        onClick={openFile}
        style={printGuideSkipped && showPrintGuide ? undefined : { marginLeft: 'auto' }}
      >
        {strings.file.open}
      </button>
    </header>
  )
}
