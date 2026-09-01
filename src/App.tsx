/** 앱 진입 — 부팅 시 브라우저 등급을 1회 판정하고, 전역 단축키를 건다.
 *
 *  1~4주에 사는 단축키는 **`Cmd/Ctrl+S` 와 `Esc` 둘뿐**이다 (PD-09 컷).
 *  나머지 7종은 5~9주에 이 등록기 위에 얹는다. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNarrowWatcher } from '@/app/AppShell'
import { Header } from '@/app/Header'
import { FileActionsProvider } from '@/app/FileActions'
import { StatusBar } from '@/app/StatusBar'
import { describeShortcut, S10Help } from '@/screens/S10Help'
import { Dialog } from '@/components/Dialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { S04Paper } from '@/screens/S04Paper'
import { S00Start } from '@/screens/S00Start'
import { S01Importing } from '@/screens/S01Importing'
import { useImportFlow } from '@/app/useImportFlow'
import { S02Segments } from '@/screens/S02Segments'
import { useGlobalPaste } from '@/app/useGlobalPaste'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { S07Lock } from '@/screens/S07Lock'
import { useDocumentSession } from '@/app/useDocumentSession'
import {
  D01Unsaved,
  D02FileChanged,
  D03Recover,
  D04ReadOnly,
  D07Quota,
  D08SaveFailed,
} from '@/components/dialogs/StorageDialogs'
import { createShortcutRegistry } from '@/app/shortcuts'
import { decideTier, readEnvironment } from '@/app/browserTier'
import { strings } from '@/app/strings'
import { useUiStore } from '@/app/store/ui'
import { useDerivedStore } from '@/app/store/derived'
import { useDocStore } from '@/app/store/doc'
import { createUndoStack } from '@/app/undo'
import {
  breakMerge,
  changedField,
  pushLayoutChange,
  type LayoutCommand,
} from '@/app/store/layoutOps'
import type {
  Paper,
  PaperHeader as PaperHeaderData,
  PaperItem,
  PaperLayout,
  Passage,
  Question,
} from '@/domain/types'
import { DEFAULT_LAYOUT, EMPTY_HEADER } from '@/domain/defaults'

/** 빈 배열을 매번 새로 만들면 자식이 매번 다시 그린다 */
const EMPTY_ITEMS: PaperItem[] = []
import type { ImportStats } from '@/storage/etp/format'
import { checkCriticalFonts, warnIfMissing } from '@/app/fontGuard'
import { usePrintFlow } from '@/app/usePrintFlow'
import { S06Print } from '@/screens/S06Print'
import { tryPrint } from '@/print/printFlow'
import { preflight } from '@/print/preflight'
import { downloadFile } from '@/storage/fileHandle'

/** «예시로 해보기» — 붙일 것이 없는 방문자용. **기본 동선은 아니다** (PP§7.4) */
async function loadSample(onPaste: (p: { html: string; text: string }) => void): Promise<void> {
  const res = await fetch('/sample-exam.html')
  if (!res.ok) return
  const html = await res.text()
  onPaste({ html, text: '' })
}

/** 좌우 분할이 필요 없는 화면(S-00·S-01)의 껍데기.
 *  헤더와 상태바만 얹는다 — 셸을 쓰면 빈 좌측 패널이 생긴다. */
function PlainScreen({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</main>
      <StatusBar action={action} />
    </div>
  )
}

export function App() {
  const { tier, setTier, helpOpen, setHelpOpen } = useUiStore()
  const publicPc = useUiStore((s) => s.publicPc)
  const setPublicPc = useUiStore((s) => s.setPublicPc)
  const setFontsReady = useDerivedStore((s) => s.setFontsReady)
  const fontsReady = useDerivedStore((s) => s.fontsReady)
  const [noticeSeen, setNoticeSeen] = useState(false)
  const session = useDocumentSession()
  const importFlow = useImportFlow()
  const printFlow = usePrintFlow()
  const undoStack = useMemo(() => createUndoStack(), [])
  const upsertQuestion = useDocStore((s) => s.upsertQuestion)
  const upsertPassage = useDocStore((s) => s.upsertPassage)
  const upsertPaper = useDocStore((s) => s.upsertPaper)
  const setActivePaper = useDocStore((s) => s.setActivePaper)
  const docQuestions = useDocStore((s) => s.questions)
  const docPassages = useDocStore((s) => s.passages)
  /** ★ 시험지는 **문서 스토어에만** 산다.
   *
   *  전에는 여기 `useState` 로 따로 들고 있었다. 그러면 문서(.etp)에 담기는 것과
   *  화면에 보이는 것이 **다른 물건**이 되어, 저장하면 빈 시험지가 저장되고
   *  파일을 열면 아무것도 복원되지 않았다. 상태를 하나로 합친다. */
  const activePaper = useDocStore((s) => (s.activePaperId ? s.papers[s.activePaperId] : undefined))
  const paperItems = activePaper?.items ?? EMPTY_ITEMS
  const paperHeader = activePaper?.header ?? EMPTY_HEADER
  const paperSettings = activePaper?.layout ?? DEFAULT_LAYOUT
  const committed = activePaper !== undefined

  const patchPaper = useCallback(
    (patch: Partial<Paper>) => {
      const current = useDocStore.getState()
      const id = current.activePaperId
      const paper = id ? current.papers[id] : undefined
      if (!paper) return
      upsertPaper({ ...paper, ...patch, updatedAt: Date.now() })
    },
    [upsertPaper],
  )
  const setPaperItems = useCallback((items: PaperItem[]) => patchPaper({ items }), [patchPaper])
  const setPaperHeader = useCallback(
    (header: PaperHeaderData) => patchPaper({ header }),
    [patchPaper],
  )
  /** ★ 설정 변경은 **되돌릴 수 있어야 한다** (zz-8 D3).
   *  여백을 잘못 만졌을 때 원래 값을 기억해 주는 것이 이 스택의 존재 이유다. */
  const lastLayoutCommand = useRef<LayoutCommand | null>(null)
  const setPaperLayout = useCallback(
    (layout: PaperLayout) => {
      const before = useDocStore.getState().papers[useDocStore.getState().activePaperId ?? '']
        ?.layout
      if (!before) return
      pushLayoutChange(
        undoStack,
        {
          field: changedField(before, layout),
          label: strings.settings.title,
          before,
          after: layout,
          apply: (next) => patchPaper({ layout: next }),
        },
        Date.now(),
        lastLayoutCommand,
      )
    },
    [patchPaper, undoStack],
  )

  /** 확정 — **되돌릴 수 없는 경계다** (zz-0 D3 · zz-4 D8).
   *  확정 전 되돌리기 대상은 세그먼트, 확정 후에는 문항이라 **대상 자체가 바뀐다.**
   *  여기서 스택을 비우지 않으면 `Cmd+Z` 로 담은 문항 24개가 사라진다. */
  const onCommitSegments = useCallback(
    (result: { questions: Question[]; passages: Passage[]; items: PaperItem[]; stats: ImportStats }) => {
      result.passages.forEach(upsertPassage)
      result.questions.forEach(upsertQuestion)
      // ⚠ 순서를 **여기서 만들지 않는다.** 확정이 원본 순서대로 준 것을 그대로 쓴다 —
      // 제 나름대로 배열하면 교사가 붙여넣은 시험지의 순서가 뒤바뀐다
      const now = Date.now()
      const id = `paper-${now}`
      upsertPaper({
        id,
        title: '',
        header: EMPTY_HEADER,
        layout: DEFAULT_LAYOUT,
        items: result.items,
        createdAt: now,
        updatedAt: now,
      })
      setActivePaper(id)
      // 교정 통계를 문서에 쌓는다 — **서버가 없으므로 이것이 유일한 계측이다**
      session.addStats(result.stats)
      undoStack.clear('import-commit')
    },
    [session, setActivePaper, undoStack, upsertPaper, upsertPassage, upsertQuestion],
  )
  // 붙여넣기 영역에 포커스가 없어도 받는다 (SS§2.5 «전역 Ctrl+V»).
  // 이미 문항이 들어와 있으면 가로채지 않는다 — 편집 중의 붙여넣기는 다른 뜻이다
  useGlobalPaste(importFlow.paste, importFlow.phase.kind === 'idle')
  const registry = useMemo(() => createShortcutRegistry(), [])
  useNarrowWatcher()

  // 등급 판정 — 부팅 시 1회. 권한 축은 zz-1 이 파일을 열 때 갱신한다
  useEffect(() => {
    const env = readEnvironment()
    setTier(decideTier({ ...env, permission: 'unknown' }))
  }, [setTier])

  // 폰트가 실제로 로드됐는지 확인한다. 실패하면 지면을 그리지 않는다 (zz-0 D7).
  // 차단 등급에서는 화면 자체를 안 그리므로 확인하지 않는다.
  useEffect(() => {
    if (tier === 'blocked') return
    let alive = true
    void checkCriticalFonts()
      .then((result) => {
        if (!alive) return
        warnIfMissing(result, import.meta.env.DEV)
        setFontsReady(result.ready)
      })
      .catch(() => {
        // 확인 자체가 실패하면 «준비 안 됨»으로 둔다 — 모르는 채 그리는 것보다 낫다
        if (alive) setFontsReady(false)
      })
    return () => {
      alive = false
    }
  }, [setFontsReady, tier])

  /** 실제 인쇄는 **«안내가 닫힌 렌더»가 커밋된 뒤**에 돈다 (zz-6 D4).
   *  같은 턴에 부르면 안내 화면이 종이에 같이 나간다 — `window.print()` 는 동기다. */
  // ⚠ `session` 은 렌더마다 새 객체다. 전역 단축키 등록 효과에 그대로 넣으면
  // 매 렌더 재등록되고, 빼면 **첫 렌더의 save 를 영영 부른다.** ref 로 잇는다
  const sessionRef = useRef(session)
  sessionRef.current = session

  const printPhase = printFlow.phase
  const printDone = printFlow.done
  useEffect(() => {
    if (printPhase.kind !== 'printing') return
    const req = printPhase.req
    tryPrint(req.input, {
      // ⚠ 용지는 **시험지가 정한다.** 여기서 'A4' 로 굳히면 B4 시험지를
      // A4 규칙으로 인쇄해 조판이 통째로 어긋난다
      pageSize: paperSettings.pageSize,
      orientation: paperSettings.orientation,
      focusPaper: req.focusPaper,
      print: () => window.print(),
    })
    printDone()
  }, [paperSettings.orientation, paperSettings.pageSize, printDone, printPhase])

  useEffect(() => {
    const off = registry.registerGlobal([
      {
        key: 's',
        meta: true,
        description: strings.shortcuts.save,
        run: () => void sessionRef.current.save(),
      },
      {
        key: 'escape',
        description: strings.shortcuts.escape,
        run: () => setHelpOpen(false),
      },
      {
        // ★ 되돌리기 스택은 zz-0 이 만들었는데 **부르는 곳이 없었다** —
        // 쌓기만 하고 꺼내지 않으면 없는 기능이다
        key: 'z',
        meta: true,
        description: strings.shortcuts.undo,
        run: () => {
          undoStack.undo()
          breakMerge(lastLayoutCommand)
        },
      },
    ])
    const onKey = (e: KeyboardEvent) => registry.handle(e)
    window.addEventListener('keydown', onKey)
    return () => {
      off()
      window.removeEventListener('keydown', onKey)
    }
  }, [registry, setHelpOpen, undoStack])

  // 조판이 성립하지 않는 브라우저 — 진입 차단 (SS§13.4)
  if (tier === 'blocked') {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <h1>{strings.tier.blockedTitle}</h1>
        <p>{strings.tier.blockedBody}</p>
      </div>
    )
  }

  const snapshot = registry.snapshot()

  return (
    <FileActionsProvider
      value={{
        openFile: () => void session.openFile(),
        save: () => void session.save(),
        printGuideSkipped: printFlow.skip,
        showPrintGuide: printFlow.showGuideAgain,
      }}
    >
      <ErrorBoundary
        fallback={
          <div style={{ padding: 'var(--space-6)' }}>
            <h1>{strings.error.screen}</h1>
            <p>{strings.error.screenBody}</p>
          </div>
        }
      >
        {/* ★ 공용 PC 정리가 끝나기 전에는 문항을 그리지 않는다 —
            지우기 전에 보이면 공용 PC 모드가 의미를 잃는다 (zz-1 D6) */}
        {/* ⚠ **셸을 여기서 감싸지 않는다.** S-02·S-04 는 좌우 분할과 자기 상태바를
            가진 화면이라 스스로 `AppShell` 을 쓴다 — 여기서 또 감싸면 헤더와
            상태바가 **두 번** 그려진다(실제로 그랬다). 셸이 필요 없는 화면
            (S-00·S-01)은 헤더만 얹어 준다. */}
        {!session.ready ? (
          <div role="status" />
        ) : importFlow.phase.kind === 'working' ? (
          <PlainScreen>
            <S01Importing
              found={importFlow.phase.found}
              progress={importFlow.phase.progress}
              onCancel={importFlow.cancel}
            />
          </PlainScreen>
        ) : committed ? (
          <S04Paper
            questions={docQuestions}
            passages={docPassages}
            items={paperItems}
            onChangeItems={setPaperItems}
            onChangeQuestion={upsertQuestion}
            header={paperHeader}
            onChangeHeader={setPaperHeader}
            layoutSettings={paperSettings}
            onChangeLayout={setPaperLayout}
            readOnly={session.readOnly}
            fontsReady={fontsReady}
            onPrint={printFlow.request}
          />
        ) : importFlow.phase.kind === 'done' ? (
          <S02Segments
            raw={importFlow.phase.result.raw}
            blocks={importFlow.phase.result.blocks}
            segments={importFlow.phase.result.segments}
            onCommit={onCommitSegments}
          />
        ) : (
          <PlainScreen>
            <S00Start
              recent={session.recent}
              publicPc={publicPc}
              onPaste={importFlow.paste}
              onOpenFile={() => void session.openFile()}
              onOpenRecent={() => void session.openFile()}
              onTrySample={() => void loadSample(importFlow.paste)}
              onTogglePublicPc={setPublicPc}
            />
          </PlainScreen>
        )}
      </ErrorBoundary>

      {/* 비대상 브라우저 — 막지 않되 약속도 하지 않는다 (OD-01 · SS§13.3) */}
      <Dialog
        open={tier === 'unsupported' && !noticeSeen}
        title={strings.tier.unsupportedTitle}
        onClose={() => setNoticeSeen(true)}
        footer={
          <button type="button" onClick={() => setNoticeSeen(true)}>
            {strings.tier.unsupportedDismiss}
          </button>
        }
      >
        <p>{strings.tier.unsupportedBody}</p>
      </Dialog>

      {/* 저장·충돌 계열 (SS§10). 여는 순간부터 사용자를 지킨다 */}
      <D01Unsaved
        open={session.pendingOpen}
        onSave={() => void session.confirmOpenSave()}
        onDiscard={() => void session.confirmOpenDiscard()}
        onCancel={session.cancelOpen}
      />
      <D07Quota
        open={session.quotaWarning !== null}
        detail={
          session.quotaWarning
            ? strings.dialogs.quotaDetail(
                Math.round(session.quotaWarning.usage / 1024 / 1024),
                Math.round(session.quotaWarning.quota / 1024 / 1024),
              )
            : ''
        }
        onExport={() => void session.save()}
        onLater={session.dismissQuota}
      />
      <D02FileChanged
        open={session.conflict?.kind === 'file-changed'}
        onTakeFile={session.dismissConflict}
        onKeepMine={session.dismissConflict}
      />
      <D03Recover
        open={session.conflict?.kind === 'cache-newer'}
        onRecover={session.dismissConflict}
        onOpenFile={session.dismissConflict}
      />
      <D04ReadOnly
        open={session.readOnly}
        onOpenReadOnly={() => undefined}
        onTakeOver={() => undefined}
      />
      <D08SaveFailed
        open={session.saveFailed}
        onRetry={() => void session.save()}
        onSaveAs={() => void session.save()}
        onClose={session.dismissSaveError}
      />

      {/* 인쇄 준비 (S-06). **지면 위에 덮되 `data-print="hide"` 를 단다** —
          «인쇄 중» 단계로 넘어가는 사이에도 종이에 나가지 않게 (zz-6 D3) */}
      {printFlow.phase.kind === 'guide' && (
        <div
          data-print="hide"
          role="dialog"
          aria-modal="true"
          aria-label={strings.print.title}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-neutral-0)',
            overflow: 'auto',
            zIndex: 40,
          }}
        >
          <S06Print
            issues={preflight(printFlow.phase.req.input)}
            {...(printFlow.phase.req.hwpx ? { hwpx: printFlow.phase.req.hwpx } : {})}
            // 내려받기로 낸다 — 파일 저장 권한이 없어도 **파일은 손에 쥐어져야 한다**
            saveFile={(bytes, name) => downloadFile(bytes, name)}
            skipNextTime={printFlow.skip}
            onChangeSkip={printFlow.setSkip}
            onPrint={printFlow.confirm}
            onCancel={printFlow.cancel}
          />
        </div>
      )}

      {/* 자리를 비운 사이 시험 문항이 노출되지 않게 한다 (PP§5.4) */}
      <S07Lock open={session.locked} reason="idle" onUnlock={session.unlock} />

      {/* 문항을 하나도 못 찾았다 — **빈손으로 돌려보내지 않는다** (SS§3.6) */}
      <ConfirmDialog
        open={importFlow.phase.kind === 'empty'}
        title={strings.importing.noneTitle}
        body={<p>{strings.importing.noneBody}</p>}
        confirmLabel={strings.importing.noneAsOne}
        cancelLabel={strings.dialog.cancel}
        onConfirm={importFlow.acceptAsOne}
        onCancel={importFlow.reset}
      />
      {/* 서식 없는 텍스트 — 표와 그림이 사라진다는 사실을 알린다 (SS§2.6) */}
      <ConfirmDialog
        open={importFlow.phase.kind === 'plain-notice'}
        title={strings.start.plainTitle}
        body={<p>{strings.start.plainBody}</p>}
        confirmLabel={strings.start.plainProceed}
        cancelLabel={strings.dialog.cancel}
        onConfirm={importFlow.acceptPlain}
        onCancel={importFlow.reset}
      />
      <ConfirmDialog
        open={importFlow.phase.kind === 'no-clipboard'}
        title={strings.start.emptyClipboard}
        body={null}
        confirmLabel={strings.dialog.confirm}
        cancelLabel={strings.dialog.cancel}
        onConfirm={importFlow.reset}
        onCancel={importFlow.reset}
      />

      <S10Help
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        // 화면별 단축키는 각 화면이 push 할 때 설명을 함께 준다.
        // 1~4주에는 전역 2종뿐이라 화면 목록이 비어 있는 것이 정상이다 (PD-09 컷).
        screenEntries={snapshot.screen.map((s) => ({
          keys: describeShortcut(s),
          description: s.description ?? '',
        }))}
        globalEntries={snapshot.global.map((s) => ({
          keys: describeShortcut(s),
          description: s.description ?? '',
        }))}
      />
    </FileActionsProvider>
  )
}
