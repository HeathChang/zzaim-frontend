/** S-02 경계 확정 — **제품의 급소** (SS§4 · PP§7.1).
 *
 *  이 화면의 속도가 채택을 결정한다. 목표는 **50문항 5분 = 문항당 6초**이고,
 *  그 숫자는 «전부 검토»가 아니라 «의심스러운 곳만 검토»를 전제한다.
 *  그래서 이 화면의 **유일한 설계 목표는 «어디를 볼지» 좁히는 것**이다. */
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/app/AppShell'
import { StatusBar } from '@/app/StatusBar'
import { SegmentCard } from '@/screens/S02Segments/SegmentCard'
import { ResultList } from '@/screens/S02Segments/ResultList'
import { SplitMode } from '@/screens/S02Segments/SplitMode'
import { isCollapsed, RecoverPanel } from '@/screens/S02Segments/RecoverPanel'
import { useSegmentEditor } from '@/screens/S02Segments/useSegmentEditor'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { strings } from '@/app/strings'
import { resegment, type NumberFormat } from '@/importing/ops'
import { commitSegments, suspectsRemaining } from '@/importing/commit'
import { toManifestStats } from '@/importing/stats'
import type { Block, Segment } from '@/importing/types'
import type { PaperItem, Passage, Question } from '@/domain/types'
import type { ImportStats } from '@/storage/etp/format'

export interface S02SegmentsProps {
  raw: string
  segments: readonly Segment[]
  /** 재분리에 쓸 원본 덩이들 (zz-4 D6) */
  blocks: readonly Block[]
  onCommit(result: {
    questions: Question[]
    passages: Passage[]
    /** **원본 순서**로 놓인 시험지 아이템 */
    items: PaperItem[]
    stats: ImportStats
  }): void
}

export function S02Segments({ raw, segments: initial, blocks, onCommit }: S02SegmentsProps) {
  const [source, setSource] = useState<readonly Segment[]>(initial)
  const editor = useSegmentEditor(source)
  const [splitting, setSplitting] = useState(false)
  const [askCommit, setAskCommit] = useState(false)
  const [dismissedRecover, setDismissedRecover] = useState(false)

  const { segments, cursor, confirmed } = editor
  const current = segments[cursor]

  const doCommit = useCallback(() => {
    const out = commitSegments({ segments, groupings: editor.groupings, now: Date.now() })
    onCommit({
      ...out,
      stats: toManifestStats(editor.stats, out.questions.length),
    })
  }, [segments, editor.groupings, editor.stats, onCommit])

  const tryCommit = useCallback(() => {
    // 의심 지점이 남아 있으면 **묻는다. 막지는 않는다** (D-06)
    if (suspectsRemaining(segments, confirmed) > 0) setAskCommit(true)
    else doCommit()
  }, [segments, confirmed, doCommit])

  // **담지 않은 문항이 있는 채로 나가면 사라진다** (SS§4.7 «작업 중 이탈 시도»)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (segments.length === 0) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [segments.length])

  // 화면별 단축키 — 전역보다 우선한다 (SS§1.5)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (splitting) return // 쪼개기 모드가 자기 키를 갖는다
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.isContentEditable)) {
        return
      }
      const key = e.key.toLowerCase()
      const handlers: Record<string, () => void> = {
        j: () => editor.moveCursor(1),
        arrowdown: () => editor.moveCursor(1),
        k: () => editor.moveCursor(-1),
        arrowup: () => editor.moveCursor(-1),
        n: () => editor.gotoNextSuspect(),
        m: () => editor.mergeUp(),
        s: () => setSplitting(true),
        p: () => editor.togglePassage(),
        d: () => editor.removeCurrent(),
        g: () => editor.makeGroup(),
        e: () => editor.toggleExpanded(),
        ' ': () => editor.toggleConfirmed(),
        enter: () => tryCommit(),
      }
      const run = handlers[key]
      if (!run) return
      e.preventDefault()
      run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, splitting, tryCommit])

  const onRetry = (format: NumberFormat, custom?: string): void => {
    setSource(resegment(blocks, format, custom))
    setDismissedRecover(true)
  }

  const totalPoints = segments.reduce((sum, s) => sum + (s.points ?? 0), 0)

  return (
    <>
      <AppShell
        leftWidth="wide"
        panelLabel={strings.segments.sourceTitle}
        left={
          // B 원본 — 읽기 전용. 커서 위치를 강조한다 (SS§4.3 B)
          <div style={{ padding: 'var(--space-3)', whiteSpace: 'pre-wrap' }}>
            <h2 style={{ fontSize: 15 }}>{strings.segments.sourceTitle}</h2>
            {raw.split('\n').map((line, i) => {
              const inCursor =
                current !== undefined &&
                raw.indexOf(line) >= current.start &&
                raw.indexOf(line) <= current.end
              return (
                <p
                  key={`${i}-${line.slice(0, 8)}`}
                  data-highlighted={inCursor || undefined}
                  style={{
                    margin: 0,
                    background: inCursor ? 'var(--color-accent-100)' : undefined,
                  }}
                >
                  {line}
                </p>
              )
            })}
          </div>
        }
        main={
          <div style={{ padding: 'var(--space-3)', height: '100%' }}>
            <h2 style={{ fontSize: 15 }}>{strings.segments.resultTitle(segments.length)}</h2>

            {/* 분리가 무너졌으면 한 번의 선택으로 되살린다 */}
            {!dismissedRecover && isCollapsed(segments) && (
              <RecoverPanel onRetry={onRetry} onManual={() => setDismissedRecover(true)} />
            )}

            <ResultList
              count={segments.length}
              cursor={cursor}
              label={strings.segments.resultTitle(segments.length)}
              renderRow={(i) => {
                const s = segments[i]
                if (!s) return null
                return splitting && i === cursor ? (
                  <SplitMode
                    key={`split-${i}`}
                    lines={s.lines}
                    onConfirm={(points) => {
                      editor.splitAt(points)
                      setSplitting(false)
                    }}
                    onCancel={() => setSplitting(false)}
                  />
                ) : (
                  <SegmentCard
                    key={`${i}-${s.start}`}
                    segment={s}
                    ordinal={i}
                    selected={i === cursor}
                    confirmed={confirmed.has(i)}
                    grouped={editor.groupings.some((g) => g.childIndexes.includes(i))}
                    expanded={editor.expanded.has(i)}
                    onSelect={() => editor.jumpTo(i)}
                    onChangeNumber={(v) => {
                      editor.jumpTo(i)
                      editor.setNumber(v)
                    }}
                    onChangePoints={(v) => {
                      editor.jumpTo(i)
                      editor.setPoints(v)
                    }}
                  />
                )
              }}
            />

            {/* 조작 결과를 읽어 준다 (SS§4.9) */}
            <p role="status" style={{ position: 'absolute', left: -9999 }}>
              {editor.announce?.kind === 'wrapped'
                ? strings.segments.wrapped
                : editor.announce?.kind === 'none'
                  ? strings.segments.noneLeft
                  : current
                    ? strings.segments.announceCursor(cursor + 1, Math.round(current.confidence * 100))
                    : ''}
            </p>
          </div>
        }
        statusBar={
          <StatusBar
            counts={
              editor.suspects > 0 ? (
                <span>{strings.segments.needAttention(editor.suspects)}</span>
              ) : (
                <span>{strings.segments.noneLeft}</span>
              )
            }
            secondary={
              <>
                <span>{strings.segments.corrections(editor.stats.corrections)}</span>
                <span>{strings.segments.pointsTotal(totalPoints)}</span>
              </>
            }
            warnings={
              editor.suspects > 0 ? (
                <button type="button" onClick={editor.gotoNextSuspect}>
                  [N] {strings.segments.nextSuspect}
                </button>
              ) : null
            }
            action={
              <button type="button" onClick={tryCommit}>
                {strings.segments.commit(segments.filter((s) => s.role === 'question').length)}
              </button>
            }
          />
        }
      />

      <ConfirmDialog
        open={askCommit}
        title={strings.segments.confirmTitle(suspectsRemaining(segments, confirmed))}
        body={<p>{strings.segments.confirmBody}</p>}
        confirmLabel={strings.segments.confirmAnyway}
        cancelLabel={strings.segments.confirmGo}
        onConfirm={() => {
          setAskCommit(false)
          doCommit()
        }}
        onCancel={() => {
          setAskCommit(false)
          editor.gotoNextSuspect()
        }}
      />
    </>
  )
}
