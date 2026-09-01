/** S-10 단축키 도움말 — SS§11.
 *  «키보드 중심 제품에서 도움말은 부가 기능이 아니다. `N`·`M`·`S` 를 모르면
 *   S-02 는 느린 화면이 된다.»
 *
 *  규칙 둘: **현재 화면 것을 위에, 전역을 아래에.** 전체 목록을 나열하지 않는다. */
import { useCallback, useEffect, useRef } from 'react'
import { strings } from '@/app/strings'
import type { Shortcut } from '@/app/shortcuts'

export interface HelpEntry {
  keys: string
  description: string
  /** 아직 써 본 적 없는 키 — 옅은 `NEW` 배지 (SS§11.2) */
  unused?: boolean
}

export function describeShortcut(s: Shortcut): string {
  const parts: string[] = []
  if (s.meta) parts.push('⌘/Ctrl')
  if (s.shift) parts.push('⇧')
  if (s.alt) parts.push('Alt')
  parts.push(s.key === 'escape' ? 'Esc' : s.key.toUpperCase())
  return parts.join('+')
}

export interface S10HelpProps {
  open: boolean
  onClose(): void
  screenEntries: HelpEntry[]
  globalEntries: HelpEntry[]
  screenTitle?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function S10Help({ open, onClose, screenEntries, globalEntries }: S10HelpProps) {
  const ref = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  // Dialog 와 같은 동작이어야 한다 — 한쪽만 트랩이면 키보드 사용자가 새는 곳이 생긴다
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      if (nodes.length === 0) {
        e.preventDefault() // 안에 초점 대상이 없으면 밖으로 새지 않게 막는다
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => restoreTo.current?.focus()
  }, [open])

  if (!open) return null

  const section = (title: string, entries: HelpEntry[]) =>
    entries.length > 0 && (
      <section>
        <h3 style={{ fontSize: 15 }}>{title}</h3>
        <dl style={{ margin: 0 }}>
          {entries.map((e) => (
            <div key={e.keys} style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ minWidth: 96 }}>
                <kbd>{e.keys}</kbd>
              </dt>
              <dd style={{ margin: 0 }}>
                {e.description}
                {e.unused && (
                  <span style={{ color: 'var(--color-neutral-700)', fontSize: 12 }}>
                    {' '}
                    {strings.help.newBadge}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--color-neutral-900) 30%, transparent)',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={strings.help.title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={{
          width: 'var(--size-help)',
          maxWidth: 'calc(100vw - var(--space-8))',
          maxHeight: 'var(--size-help-max-h)',
          overflow: 'auto',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-6)',
        }}
      >
        <h2 style={{ fontSize: 20 }}>{strings.help.title}</h2>
        {section(strings.help.screenSection, screenEntries)}
        {section(strings.help.globalSection, globalEntries)}
      </div>
    </div>
  )
}
