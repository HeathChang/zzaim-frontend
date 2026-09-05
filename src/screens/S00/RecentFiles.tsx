/** 최근 파일 — 최대 5개 (SS§2.4).
 *
 *  파일 핸들은 **만료된다.** 브라우저를 다시 켜면 권한이 풀려 있을 수 있다.
 *  그때 «열리지 않는 항목»을 그냥 두면 사용자는 파일이 사라진 줄 안다 —
 *  `↻ 다시 선택` 배지로 **무엇을 하면 되는지** 알린다. */
import { strings } from '@/app/strings'

export interface RecentFile {
  name: string
  openedAt: number
  /** 핸들 권한이 살아 있는가 */
  stale: boolean
}

export const MAX_RECENT = 5

export function sortRecent(files: readonly RecentFile[]): RecentFile[] {
  return [...files].sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RECENT)
}

export function RecentFiles({
  files,
  onOpen,
}: {
  files: readonly RecentFile[]
  onOpen(file: RecentFile): void
}) {
  // 첫 방문에는 이 영역이 아예 없다 — «선택지를 늘리지 않는다» (SS§1.3 초기 상태)
  if (files.length === 0) return null

  return (
    <section>
      <h2 style={{ fontSize: 15 }}>{strings.start.recent}</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sortRecent(files).map((f) => (
          <li key={f.name}>
            <button
              type="button"
              onClick={() => onOpen(f)}
              style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', textAlign: 'left' }}
            >
              <span>{f.name}</span>
              {f.stale && (
                <span style={{ color: 'var(--color-accent-700)' }}>{strings.start.reselect}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
