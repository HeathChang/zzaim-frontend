/** S-04 시험지 편집 — **미리보기가 아니라 결과다** (SS§6.1).
 *
 *  좌: 담을 문항 / 우: 지면. 지면은 **실제 배율**이 기본이다 — 이 도구가 파는 것이
 *  «인쇄하면 화면 그대로»라는 신뢰이고, 축소된 미리보기는 그 신뢰를 검증할 수 없다. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/app/AppShell'
import { StatusBar } from '@/app/StatusBar'
import { QuestionCard } from '@/components/QuestionCard'
import { PaperPreview, type SheetItem } from '@/components/sheet/PaperPreview'
import { HeaderInline } from '@/screens/S04Paper/HeaderInline'
import { Closing, Folio } from '@/components/sheet/Folio'
import { PassageBox, QuestionRow } from '@/components/sheet/QuestionRow'
import { ZoomTabs } from '@/components/sheet/ZoomTabs'
import { BlockButtons } from '@/screens/S04Paper/BlockButtons'
import { QuestionEditPanel } from '@/screens/S04Paper/QuestionEditPanel'
import { Feedback, PageFill, shouldWarnPageFill } from '@/screens/S04Paper/feedback/Feedback'
import { applyAction, describePlacement, resolveKey } from '@/screens/S04Paper/keyboardOps'
import {
  isAlreadyPlaced,
  insertAt,
  moveItem,
  orphanQuestions,
  removeAt,
  setOverridePoints,
  totalPoints,
} from '@/app/store/paperOps'
import { isBefore, resolveDrop } from '@/screens/S04Paper/dnd'
import { restorePassage } from '@/screens/S04Paper/restorePassage'
import { useAutoScroll } from '@/screens/S04Paper/useAutoScroll'
import { deriveGeometry } from '@/layout/geometry'
import { formatRange } from '@/layout/numbering'
import type { ZoomKey } from '@/layout/constants'
import type { LayoutConfig, LayoutResult } from '@/layout/types'
import { toLayoutConfig } from '@/layout/fromPaperLayout'
import { warnIfEngineClamped } from '@/layout/guards'
import { S05Settings } from '@/screens/S05Settings'
import { exportHwpx, hwpxFileName, type ExportItem } from '@/export/hwpx'
import type {
  PaperHeader as PaperHeaderData,
  PaperItem,
  PaperLayout,
  Passage,
  Question,
} from '@/domain/types'
import type { PrintRequest } from '@/app/usePrintFlow'

import { strings } from '@/app/strings'
import { useFontGate } from '@/layout/measure/useFontsReady'
import { usePaperFont } from '@/app/usePaperFont'

export interface S04PaperProps {
  questions: Record<string, Question>
  passages: Record<string, Passage>
  items: readonly PaperItem[]
  onChangeItems(next: PaperItem[]): void
  onChangeQuestion(q: Question): void
  /** 이 시험지의 머리말 (D5 — 인라인으로 고친다) */
  header: PaperHeaderData
  onChangeHeader(next: PaperHeaderData): void
  /** ★ 조판 설정. **문서에서 온다** — 예전에는 이 파일에 상수로 박혀 있어서
   *  «저장된 설정»과 «그려진 설정»이 아예 다른 물건이었다 (zz-8) */
  layoutSettings: PaperLayout
  onChangeLayout(next: PaperLayout): void
  /** 다른 탭이 파일을 잡고 있다 — 설정을 바꿀 수 없다 (D6 상태4) */
  readOnly?: boolean
  /** 다른 시험지들 — «다른 시험지 N개에 반영» 고지에 쓴다 (PD-07) */
  otherPapers?: readonly { items: readonly PaperItem[] }[]
  /** 인쇄 요청. **점검 입력을 여기서 만든다** — 넘침·미아 건수는 이 화면만 안다 */
  onPrint?(req: PrintRequest): void
  /** 폰트 준비 여부. 준비 안 됐으면 점검이 인쇄를 막는다 (zz-6 D6) */
  fontsReady?: boolean
}

export function S04Paper({
  questions,
  passages,
  items,
  onChangeItems,
  onChangeQuestion,
  header,
  onChangeHeader,
  layoutSettings,
  onChangeLayout,
  readOnly = false,
  otherPapers = [],
  onPrint,
  fontsReady = true,
}: S04PaperProps) {
  const [zoom, setZoom] = useState<ZoomKey>('100')
  const [auto, setAuto] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  /** 설정 패널. **편집 패널과 동시에 열리지 않는다** (zz-5 D6 · zz-8 불변4) */
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [trayIndex, setTrayIndex] = useState(0)
  /** 드래그 중인 것 — 트레이 문항 id 또는 지면 아이템 인덱스 */
  const [dragging, setDragging] = useState<{ trayId: string } | { index: number } | null>(null)
  /** 되돌리기 직후 강조 (SS§6.6 «무엇이 되돌아갔는지 보여준다») */
  const [flash, setFlash] = useState<number | null>(null)
  const CONFIG = useMemo<LayoutConfig>(() => toLayoutConfig(layoutSettings), [layoutSettings])
  // ★ UI 가드(40mm)가 새면 엔진 하한(20mm)에 닿는다. 정상 경로에서는 없어야 하고,
  // 닿았다면 **가드에 구멍이 있다는 뜻**이라 개발 빌드에서 알린다 (zz-8 D2)
  useEffect(() => {
    warnIfEngineClamped(
      {
        pageSize: layoutSettings.pageSize,
        orientation: layoutSettings.orientation,
        columns: layoutSettings.columns,
        gutter: layoutSettings.gutter,
        margin: layoutSettings.margin,
      },
      import.meta.env.DEV,
    )
  }, [layoutSettings])
  const geometry = useMemo(() => deriveGeometry(CONFIG), [CONFIG])
  const TARGET_POINTS = layoutSettings.targetPoints

  const all = useMemo(() => Object.values(questions), [questions])
  const tray = useMemo(
    () => all.filter((q) => !isAlreadyPlaced(items, q.id)),
    [all, items],
  )

  const text = useMemo(
    () => all.map((q) => (q.body.kind === 'html' ? q.body.html : '')).join(''),
    [all],
  )
  // ★ 한자가 든 시험지면 한자본을 **여기서** 받는다. 안 걸면 3단계 폰트 전략이
  // 통째로 죽고 한자가 깨진 채 그려진다 (zz-0 D7)
  const ensureFont = usePaperFont()
  const gate = useFontGate({ text, ensureFor: ensureFont })

  /** 배치를 해 봐야 아는 값. `PaperPreview` 가 알려 준다 */
  const [overflowCount, setOverflowCount] = useState(0)
  /** 요청대로 못 한 아이템들 — 조용히 넘어가지 않는다 (zz-2 D4) */
  const [downgraded, setDowngraded] = useState<ReadonlySet<string>>(new Set())
  /** 방금 옮긴 아이템의 자리. 배치가 끝나야 «몇 쪽 몇 단»을 알 수 있다 */
  const [movedIndex, setMovedIndex] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  /** ★ 배치 결과 자체. **한글 내보내기가 이 값을 쓴다** — 내보내기가 배치를 다시
   *  계산하면 «쪽 수가 화면과 같다»는 약속이 깨진다 (zz-9 D3) */
  const [layout, setLayout] = useState<LayoutResult | null>(null)

  const orphans = useMemo(
    () => new Set(orphanQuestions(items, (id) => questions[id]?.passageId ?? null)),
    [items, questions],
  )

  /** 드롭 — 규칙은 `dnd.ts` 가 정한다. 여기서는 **적용만** 한다 */
  const onDropAt = useCallback(
    (e: React.DragEvent, overIndex: number | null) => {
      e.preventDefault()
      if (!dragging) return
      const rect = e.currentTarget.getBoundingClientRect()
      const verdict = resolveDrop({
        items,
        overIndex,
        before: overIndex === null ? true : isBefore(e.clientY, rect),
        fromTrayQuestionId: 'trayId' in dragging ? dragging.trayId : null,
      })
      setDragging(null)
      if (verdict.kind === 'blocked') return
      if (verdict.kind === 'remove') {
        if ('index' in dragging) onChangeItems(removeAt(items, dragging.index))
        return
      }
      if ('trayId' in dragging) {
        onChangeItems(insertAt(items, verdict.index, { kind: 'question', questionId: dragging.trayId }))
      } else {
        onChangeItems(moveItem(items, dragging.index, verdict.index))
      }
      // 무엇이 움직였는지 잠깐 강조한다
      setFlash(verdict.index)
      window.setTimeout(() => setFlash(null), 600)
    },
    [dragging, items, onChangeItems],
  )

  const insert = useCallback(
    (item: PaperItem) => onChangeItems(insertAt(items, items.length, item)),
    [items, onChangeItems],
  )

  // 키보드 등가물 8종 — **드래그가 유일 경로가 아니다** (PP§10)
  // ⚠ **`window` 에 건다.** 특정 요소에 걸면 포커스가 거기 없을 때 아무 일도
  // 안 일어난다 — «마우스 없이도 된다»(PP§10)가 포커스 운에 달리면 안 된다
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const action = resolveKey(e, { cursor, itemCount: items.length, trayFocused: false })
      if (!action) return
      e.preventDefault()
      if (action.kind === 'cursor') {
        setCursor(action.next)
        return
      }
      if (action.kind === 'openEditor') {
        setEditing(action.index)
        // 둘이 같이 열리면 지면 폭이 두 번 줄어 조판이 흔들린다
        setSettingsOpen(false)
        return
      }
      const next = applyAction(items, action)
      // 옮겼으면 **어디로 갔는지 읽어 준다.** 배치가 끝난 뒤에 자리를 알 수 있으므로
      // 여기서는 «누구를» 만 기억한다 (SS§6 · PP§10)
      if (action.kind === 'move') setMovedIndex(action.to)
      else if (action.kind === 'movePage') setMovedIndex(null)
      if (next !== items) {
        onChangeItems(next)
        if (action.kind === 'move') {
          setCursor(Math.max(0, Math.min(next.length - 1, action.to)))
          setFlash(action.to)
          window.setTimeout(() => setFlash(null), 600)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cursor, items, onChangeItems])

  const sheetItems: SheetItem[] = useMemo(
    () =>
      items.flatMap((item, index): SheetItem[] => {
        if (item.kind === 'question') {
          const q = questions[item.questionId]
          if (!q || q.body.kind !== 'html') return []
          const html = q.body.html
          const points = item.overridePoints ?? q.points
          const node = (number: number | null) => (
            <QuestionRow number={number} points={points} html={html} pointsLabel={strings.paper.points}>
              {orphans.has(q.id) && (
                <Feedback
                  kind="missingPassage"
                  // ★ 경고는 **고칠 방법과 함께** 나와야 한다. 이걸 안 주면
                  // 버튼 자체가 그려지지 않아 «어떻게 고치지»에 답이 없다
                  {...(q.passageId
                    ? {
                        onAction: () =>
                          onChangeItems(restorePassage(items, index, q.passageId as string)),
                      }
                    : {})}
                />
              )}
              {q.hasCrossRef && <Feedback kind="crossRef" />}
              {item.keepWithNext && <Feedback kind="keepWith" />}
            </QuestionRow>
          )
          return [
            {
              item: { key: `i${index}`, kind: 'question', numbered: !q.numberBaked, ...(item.keepWithNext ? { keepWithNext: true } : {}) },
              input: { kind: 'question', html, points, numberWidthEm: 2.5 },
              measureNode: node(0),
              render: (placed) => (
                <div
                  data-drop-index={index}
                  data-flash={flash === index || undefined}
                  // ★ 지면 위 문항도 **끌 수 있어야 한다.**
                  // 드롭 규칙(`resolveDrop`)은 «지면 아이템을 끄는» 경우를 이미
                  // 다루는데 `draggable` 이 없어 그 경로가 통째로 죽어 있었다 —
                  // 트레이에서 담을 수만 있고 담은 뒤에는 마우스로 못 옮겼다
                  draggable
                  onDragStart={() => setDragging({ index })}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropAt(e, index)}
                  style={{
                    // 되돌리기 직후 **무엇이 되돌아갔는지 보여준다** (SS§6.6)
                    outline: flash === index ? '2px solid var(--color-accent-700)' : undefined,
                  }}
                >
                  {node(placed.number)}
                  {placed.overflow && <Feedback kind="overflow" />}
                  {placed.carried && <Feedback kind="carried" />}
                  {downgraded.has(placed.key) && <Feedback kind="downgraded" />}
                </div>
              ),
            },
          ]
        }
        if (item.kind === 'passageGroup') {
          const p = passages[item.passageId]
          if (!p || p.body.kind !== 'html') return []
          const html = p.body.html
          return [
            {
              item: {
                key: `i${index}`,
                kind: 'group',
                numbered: true,
                childCount: item.children.length,
                splitPolicy: item.splitPolicy,
              },
              input: {
                kind: 'group',
                passageHtml: html,
                instruction: p.instruction,
                childrenHtml: [],
              },
              measureNode: (
                <PassageBox instruction={p.instruction} html={html} box={CONFIG.box} fs={geometry.fontPx} />
              ),
              render: (placed) => (
                <PassageBox
                  instruction={
                    placed.numberRange
                      ? `${formatRange(placed.numberRange)} ${p.instruction}`
                      : p.instruction
                  }
                  html={html}
                  box={CONFIG.box}
                  fs={geometry.fontPx}
                />
              ),
            },
          ]
        }
        if (item.kind === 'spacer') {
          const box = (
            <div
              className="zz-item zz-spacer"
              data-ruled={item.ruled}
              style={{ height: `${item.heightMm}mm` }}
            />
          )
          return [
            {
              item: { key: `i${index}`, kind: 'spacer' },
              input: { kind: 'spacer', heightMm: item.heightMm, ruled: item.ruled },
              measureNode: box,
              render: () => box,
            },
          ]
        }
        if (item.kind === 'divider') {
          const line = <hr className="zz-item zz-divider" />
          return [
            {
              item: { key: `i${index}`, kind: 'divider' },
              input: { kind: 'divider' },
              measureNode: line,
              render: () => line,
            },
          ]
        }
        const notice = (
          <div className="zz-item" dangerouslySetInnerHTML={{ __html: item.html }} />
        )
        return [
          {
            item: { key: `i${index}`, kind: 'notice' },
            input: { kind: 'notice', html: item.html },
            measureNode: notice,
            render: () => notice,
          },
        ]
      }),
    // ⚠ `onDropAt`·`flash` 를 빼면 **첫 렌더의 클로저가 굳는다** — 드롭 핸들러가
    // «무엇을 끌고 있는지» 영영 모르게 된다. 실제로 그렇게 돼서 드래그가 죽었다
    [
      items,
      questions,
      passages,
      geometry.fontPx,
      CONFIG.box,
      orphans,
      downgraded,
      onChangeItems,
      onDropAt,
      flash,
    ],
  )

  const sum = totalPoints(items, (id) => questions[id]?.points ?? null)
  const editingQuestion =
    editing !== null && items[editing]?.kind === 'question'
      ? questions[(items[editing] as Extract<PaperItem, { kind: 'question' }>).questionId]
      : undefined

  /** 지면 스크롤 영역 — 드래그가 가장자리에 닿으면 여기를 굴린다 */
  const scrollRef = useRef<HTMLDivElement>(null)
  useAutoScroll(dragging !== null, scrollRef)

  /** 배치 결과가 오면 그때 자리를 찾아 문장을 만든다 */
  useEffect(() => {
    if (movedIndex === null || !layout) return
    const key = `i${movedIndex}`
    for (const page of layout.pages) {
      for (let c = 0; c < page.columns.length; c += 1) {
        const order = page.columns[c]!.items.findIndex((i) => i.key === key)
        if (order === -1) continue
        setAnnounce(
          describePlacement({
            number: page.columns[c]!.items[order]!.number,
            page: page.index,
            column: c + 1,
            order: order + 1,
          }),
        )
        setMovedIndex(null)
        return
      }
    }
  }, [layout, movedIndex])

  const [pageCount, setPageCount] = useState(1)
  const onLayoutStats = useCallback((stats: { overflowCount: number; pageCount: number }) => {
    setOverflowCount(stats.overflowCount)
    setPageCount(stats.pageCount)
  }, [])

  /** 조판 아이템의 키(`i0`, `i1`…)에 본문을 이어 준다.
   *  **조판 엔진은 본문을 모른다**(PP§6.1) — 이어 주는 일은 화면 몫이다 */
  const exportItems = useMemo<ExportItem[]>(
    () =>
      items.flatMap((item, index): ExportItem[] => {
        const key = `i${index}`
        if (item.kind === 'question') {
          const q = questions[item.questionId]
          if (!q || q.body.kind !== 'html') return []
          return [
            {
              key,
              kind: 'question',
              html: q.body.html,
              points: item.overridePoints ?? q.points,
            },
          ]
        }
        if (item.kind === 'passageGroup') {
          const p = passages[item.passageId]
          if (!p || p.body.kind !== 'html') return []
          return [{ key, kind: 'group', html: p.body.html, instruction: p.instruction }]
        }
        if (item.kind === 'spacer') return [{ key, kind: 'spacer' }]
        if (item.kind === 'divider') return [{ key, kind: 'divider' }]
        return [{ key, kind: 'notice', html: '' }]
      }),
    [items, passages, questions],
  )

  /** 배점 일괄 대상은 **지면에 담긴 문항**이다 — 트레이에 남은 것까지 바꾸면
   *  «이 시험지의 총점»이라는 말이 성립하지 않는다 */
  const bulkQuestions = useMemo(
    () =>
      items.flatMap((item) => {
        if (item.kind !== 'question') return []
        const q = questions[item.questionId]
        return q ? [{ id: q.id, points: item.overridePoints ?? q.points, tags: q.tags }] : []
      }),
    [items, questions],
  )

  const headerLines = useMemo(
    () =>
      [
        [header.school, header.grade, header.subject].filter(Boolean).join(' '),
        [header.examName, header.duration && `${header.duration}`, header.teacher]
          .filter(Boolean)
          .join(' · '),
      ].filter((line) => line !== ''),
    [header],
  )

  const buildHwpx = useCallback(() => {
    if (!layout) throw new Error('layout not ready')
    return exportHwpx({
      layout,
      config: CONFIG,
      items: exportItems,
      headerLines,
      title: [header.school, header.examName].filter(Boolean).join(' '),
      fontPx: geometry.fontPx,
      // 조판이 쓰는 간격 그대로 (HO§지면본문서식)
      lineHeightPx: geometry.fontPx * 1.6,
      now: new Date(),
    })
  }, [CONFIG, exportItems, geometry.fontPx, header, headerLines, layout])

  /** 인쇄 요청 — **패널을 먼저 닫는다.** 열린 패널이 지면 폭을 바꾸면
   *  화면과 인쇄가 달라진다 (zz-6 불변1) */
  const requestPrint = useCallback(() => {
    setEditing(null)
    onPrint?.({
      input: {
        fontsReady,
        totalPoints: sum,
        targetPoints: TARGET_POINTS,
        orphanCount: orphans.size,
        overflowCount,
      },
      focusPaper: () => setEditing(null),
      hwpx: {
        build: buildHwpx,
        fileName: hwpxFileName(
          [header.school, header.examName].filter(Boolean).join(' '),
          new Date(),
        ),
        empty: items.length === 0 || layout === null,
      },
    })
  }, [
    TARGET_POINTS,
    buildHwpx,
    fontsReady,
    header,
    items.length,
    layout,
    onPrint,
    orphans.size,
    overflowCount,
    sum,
  ])

  /** ★ `Cmd/Ctrl+P` 를 **반드시 가로챈다.**
   *
   *  그냥 두면 브라우저가 자기 인쇄 창을 여는데, 그때는 편집 패널이 열린 채이고
   *  점검도 `@page` 갱신도 돌지 않는다 — 화면과 다른 것이 종이에 나간다. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'p') return
      e.preventDefault()
      requestPrint()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestPrint])

  // **폰트 로드 전에는 지면을 그리지 않는다** (zz-5 D7 · SS§6.6)
  if (gate.status !== 'ready') {
    return (
      <div style={{ padding: 'var(--space-6)' }} role="status">
        <p>{gate.status === 'missing' ? strings.paper.fontMissing : strings.paper.fontLoading}</p>
      </div>
    )
  }

  return (
    <AppShell
      panelLabel={strings.paperEdit.trayTitle}
      left={
        <div style={{ padding: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 15 }}>{strings.paperEdit.trayTitle}</h2>
          <BlockButtons columnHeightMm={geometry.colHmm} onInsert={insert} />
          {/* ⚠ `listbox` 안에는 `option` 만 들어가야 한다. 빈 상태 문구를 안에 넣으면
              스크린리더가 목록 구조를 잘못 읽는다 (axe `aria-required-children`) */}
          {tray.length === 0 ? (
            <p style={{ marginTop: 'var(--space-2)' }}>{strings.paperEdit.emptyTray}</p>
          ) : (
            <div
              role="listbox"
              aria-label={strings.paperEdit.trayTitle}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {tray.map((q, i) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => setDragging({ trayId: q.id })}
                  onDragEnd={() => setDragging(null)}
                >
                  <QuestionCard
                    role="option"
                    selected={i === trayIndex}
                    preview={q.body.kind === 'html' ? q.body.html.replace(/<[^>]+>/g, ' ') : ''}
                    points={q.points}
                    onClick={() => setTrayIndex(i)}
                    onDoubleClick={() => insert({ kind: 'question', questionId: q.id })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      }
      main={
        <div data-print="app" style={{ display: 'flex', height: '100%' }}>
          <div
            ref={scrollRef}
            data-print="scroll"
            data-testid="paper-scroll"
            style={{ flex: 1, minWidth: 0, overflow: 'auto' }}
          >
            {/* 배율 탭은 화면 도구다. 인쇄에 남으면 **첫 시트를 밀어내** 한 장이
                두 쪽으로 흐른다 (zz-6 D3) */}
            <div data-print="hide" style={{ padding: 'var(--space-2) var(--space-4)' }}>
              <ZoomTabs
                value={zoom}
                onChange={setZoom}
                auto={auto}
                labels={{
                  '100': strings.paper.zoom100,
                  fit: strings.paper.zoomFit,
                  spread: strings.paper.zoomSpread,
                  autoBadge: strings.paper.zoomAuto,
                }}
              />
            </div>
            {/* ★ 키보드로 옮긴 결과를 읽어 준다. 없으면 «옮겼는지 알 수 없다» 가 된다 */}
            <p
              aria-live="polite"
              data-testid="paper-announce"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap',
              }}
            >
              {announce}
            </p>
            {items.length === 0 ? (
              <p style={{ padding: 'var(--space-6)' }}>{strings.paperEdit.emptyPaper}</p>
            ) : (
              <PaperPreview
                items={sheetItems}
                config={CONFIG}
                zoom={zoom}
                onAutoFit={setAuto}
                autoFitFrozen={settingsOpen || editingQuestion !== undefined}
                onLayoutStats={onLayoutStats}
                onLayout={(r) => {
                  setLayout(r)
                  setDowngraded((prev) => {
                    const next = new Set(r.downgradedKeys)
                    if (prev.size === next.size && [...next].every((k) => prev.has(k))) return prev
                    return next
                  })
                }}
                header={
                  <HeaderInline
                    data={header}
                    fs={geometry.fontPx}
                    questionCount={items.length}
                    totalPoints={sum}
                    onChange={onChangeHeader}
                  />
                }
                folio={(index, total, page) => (
                  <>
                    <Folio index={index} total={total} fs={geometry.fontPx} mb={CONFIG.margin.bottom} />
                    {index === total && (
                      <>
                        <Closing
                          text={strings.paper.closing}
                          fs={geometry.fontPx}
                          mb={CONFIG.margin.bottom}
                        />
                        {/* 마지막 쪽이 많이 비었다 — **정보 제공만 한다** (SS§6.5) */}
                        {page &&
                          shouldWarnPageFill(
                            Math.max(...page.columns.map((c) => c.used), 0),
                            page.capacity,
                          ) && (
                            <PageFill
                              ratio={
                                Math.max(...page.columns.map((c) => c.used), 0) /
                                Math.max(1, page.capacity)
                              }
                            />
                          )}
                      </>
                    )}
                  </>
                )}
              />
            )}
          </div>

          {/* 편집 패널과 설정 패널은 동시에 열리지 않는다 (zz-5 D6 · zz-8 불변4) */}
          {settingsOpen && !editingQuestion && (
            <S05Settings
              layout={layoutSettings}
              onChange={onChangeLayout}
              questions={bulkQuestions}
              onApplyPoints={(points) => {
                Object.entries(points).forEach(([id, value]) => {
                  const q = questions[id]
                  if (q) onChangeQuestion({ ...q, points: value })
                })
              }}
              pageCount={pageCount}
              readOnly={readOnly}
              onClose={() => setSettingsOpen(false)}
            />
          )}
          {editingQuestion && (
            <QuestionEditPanel
              question={editingQuestion}
              overridePoints={
                (items[editing ?? -1] as Extract<PaperItem, { kind: 'question' }> | undefined)
                  ?.overridePoints ?? null
              }
              usedByOthers={
                // 이 문항을 쓰는 **다른** 시험지 수 (PD-07)
                otherPapers.filter((p) => isAlreadyPlaced(p.items, editingQuestion.id)).length
              }
              onChangeBody={(html) => onChangeQuestion({ ...editingQuestion, body: { kind: 'html', html } })}
              onChangePoints={(points) => onChangeQuestion({ ...editingQuestion, points })}
              onChangeOverride={(points) => {
                if (editing === null) return
                onChangeItems(setOverridePoints(items, editing, points))
              }}
              onChangeTags={(tags) => onChangeQuestion({ ...editingQuestion, tags })}
              onChangeNote={(note) => onChangeQuestion({ ...editingQuestion, note })}
              onChangeAnswer={(answer) => onChangeQuestion({ ...editingQuestion, answer })}
              onClose={() => setEditing(null)}
            />
          )}
        </div>
      }
      statusBar={
        <StatusBar
          counts={
            <>
              <span>{strings.paperEdit.itemCount(items.length)}</span>
              {/* ⚠ 배점 합계는 **보조 수치가 아니다.** «번호와 배점이 알아서 맞는다»가
                  핵심 가치 2번이고(PP§5.1), 좁은 화면에서 사라지면 그 값을 못 본다 */}
              <span
                style={{ color: sum === TARGET_POINTS ? undefined : 'var(--color-accent-700)' }}
              >
                {strings.paperEdit.pointsStatus(sum, TARGET_POINTS)}
                {sum === TARGET_POINTS ? '' : ' ⚠'}
              </span>
            </>
          }
          warnings={orphans.size > 0 ? <Feedback kind="missingPassage" /> : null}
          action={
            <>
              <button
                type="button"
                aria-expanded={settingsOpen}
                onClick={() => {
                  setSettingsOpen((v) => !v)
                  setEditing(null)
                }}
              >
                {strings.settings.open}
              </button>
              <button type="button" onClick={requestPrint}>
                {strings.paperEdit.print}
              </button>
            </>
          }
        />
      }
    />
  )
}
