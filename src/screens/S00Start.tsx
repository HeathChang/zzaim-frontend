/** S-00 시작 — **3분 안에 «어? 되네»로 가는 길목** (PP§7.4 · SS§2).
 *
 *  붙여넣기 영역이 **화면의 8할**이다. 다른 요소보다 크다.
 *  «문항을 등록하세요»라는 빈 상자를 보여 주는 순간 끝이다 — 교사가 이미 가진
 *  것을 가져오게 해야 한다 (PP§7 · 불변1). */
import { PasteZone, type PastePayload } from '@/components/PasteZone'
import { RecentFiles, type RecentFile } from '@/screens/S00/RecentFiles'
import { strings } from '@/app/strings'

export interface S00StartProps {
  recent: RecentFile[]
  publicPc: boolean
  onPaste(payload: PastePayload): void
  onOpenFile(): void
  onOpenRecent(file: RecentFile): void
  onTrySample(): void
  onTogglePublicPc(next: boolean): void
}

export function S00Start({
  recent,
  publicPc,
  onPaste,
  onOpenFile,
  onOpenRecent,
  onTrySample,
  onTogglePublicPc,
}: S00StartProps) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: 'var(--space-8) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1>{strings.app.name}</h1>
        <p>{strings.app.tagline}</p>
      </div>

      {/* 화면의 8할. 진입 시 포커스가 여기 있어 즉시 Ctrl+V 가 먹는다 (SS§2.7) */}
      <PasteZone
        label={strings.start.pasteHere}
        hint={strings.start.pasteHint}
        onPaste={onPaste}
        autoFocus
      />

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
        <button type="button" onClick={onOpenFile}>
          {strings.file.open}
        </button>
        {/* 붙일 것이 없는 방문자용. **기본 동선은 아니다** (PP§7.4) */}
        <button type="button" onClick={onTrySample}>
          {strings.start.trySample}
        </button>
      </div>

      <RecentFiles files={recent} onOpen={onOpenRecent} />

      <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={publicPc}
          onChange={(e) => onTogglePublicPc(e.target.checked)}
        />
        {strings.start.publicPcLabel}
      </label>
    </div>
  )
}
