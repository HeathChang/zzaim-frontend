/** SS§10 다이얼로그 — 저장·충돌 계열.
 *
 *  공통 규칙 셋을 전부 지킨다.
 *  1. **파괴적 선택지를 기본 포커스로 두지 않는다**
 *  2. `Esc` = 취소. 취소가 없는 것(D-03)은 `Esc` 를 막는다
 *  3. 문구는 무엇이·왜·다음에 무엇을 (SS§1.7)
 *
 *  전부 zz-0 의 `Dialog` 하나를 쓴다 — 화면마다 새로 만들면 문서만 일관되고
 *  제품은 일관되지 않는다 (SS부록A). */
import { Dialog } from '@/components/Dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { strings } from '@/app/strings'

const d = strings.dialogs

/** D-01 저장하지 않고 나가기 */
export function D01Unsaved({
  open,
  onSave,
  onDiscard,
  onCancel,
}: {
  open: boolean
  onSave(): void
  onDiscard(): void
  onCancel(): void
}) {
  return (
    <Dialog
      open={open}
      title={d.unsavedTitle}
      onClose={onCancel}
      role="alertdialog"
      footer={
        <>
          <button type="button" onClick={onCancel}>
            {strings.dialog.cancel}
          </button>
          {/* «그냥 나가기»가 파괴적이다. 기본 포커스를 주지 않는다 */}
          <button type="button" onClick={onDiscard}>
            {d.unsavedDiscard}
          </button>
          <button type="button" onClick={onSave}>
            {d.unsavedSave}
          </button>
        </>
      }
    >
      <p>{d.unsavedBody}</p>
    </Dialog>
  )
}

/** D-02 파일이 다른 곳에서 바뀜 — 기본은 «파일 내용 쓰기» (SS§10) */
export function D02FileChanged({
  open,
  onTakeFile,
  onKeepMine,
}: {
  open: boolean
  onTakeFile(): void
  onKeepMine(): void
}) {
  return (
    <Dialog
      open={open}
      title={d.fileChangedTitle}
      dismissable={false}
      onClose={onTakeFile}
      role="alertdialog"
      footer={
        <>
          <button type="button" onClick={onKeepMine}>
            {d.fileChangedKeepMine}
          </button>
          <button type="button" onClick={onTakeFile}>
            {d.fileChangedTakeFile}
          </button>
        </>
      }
    >
      <p>{d.fileChangedBody}</p>
    </Dialog>
  )
}

/** D-03 복구 — **자동 병합하지 않는다.** 취소가 없으므로 `Esc` 를 막는다 */
export function D03Recover({
  open,
  onRecover,
  onOpenFile,
}: {
  open: boolean
  onRecover(): void
  onOpenFile(): void
}) {
  return (
    <Dialog
      open={open}
      title={d.recoverTitle}
      dismissable={false}
      onClose={onOpenFile}
      role="alertdialog"
      footer={
        <>
          <button type="button" onClick={onOpenFile}>
            {d.recoverNo}
          </button>
          <button type="button" onClick={onRecover}>
            {d.recoverYes}
          </button>
        </>
      }
    >
      <p>{d.recoverBody}</p>
    </Dialog>
  )
}

/** D-04 읽기 전용 */
export function D04ReadOnly({
  open,
  onOpenReadOnly,
  onTakeOver,
}: {
  open: boolean
  onOpenReadOnly(): void
  onTakeOver(): void
}) {
  return (
    <Dialog
      open={open}
      title={d.readOnlyTitle}
      dismissable={false}
      onClose={onOpenReadOnly}
      footer={
        <>
          <button type="button" onClick={onTakeOver}>
            {d.readOnlyTakeOver}
          </button>
          <button type="button" onClick={onOpenReadOnly}>
            {d.readOnlyOpen}
          </button>
        </>
      }
    >
      <p>{d.readOnlyBody}</p>
    </Dialog>
  )
}

/** D-07 용량 경고 — 남은 용량과 문항 수를 **숫자로** 적는다 (SS§10) */
export function D07Quota({
  open,
  detail,
  onExport,
  onLater,
}: {
  open: boolean
  detail: string
  onExport(): void
  onLater(): void
}) {
  return (
    <ConfirmDialog
      open={open}
      title={d.quotaTitle}
      body={
        <>
          <p>{d.quotaBody}</p>
          <p>{detail}</p>
        </>
      }
      confirmLabel={d.quotaExport}
      cancelLabel={d.quotaLater}
      onConfirm={onExport}
      onCancel={onLater}
    />
  )
}

/** D-08 저장 실패 — **작업을 막지 않는다.** 편집을 계속할 수 있어야 한다 (SS§6.6) */
export function D08SaveFailed({
  open,
  onRetry,
  onSaveAs,
  onClose,
}: {
  open: boolean
  onRetry(): void
  onSaveAs(): void
  onClose(): void
}) {
  return (
    <Dialog
      open={open}
      title={d.saveFailedTitle}
      onClose={onClose}
      role="alertdialog"
      footer={
        <>
          <button type="button" onClick={onSaveAs}>
            {d.saveFailedAs}
          </button>
          <button type="button" onClick={onRetry}>
            {d.saveFailedRetry}
          </button>
        </>
      }
    >
      {/* 원본이 온전하다는 사실을 알린다 — 모르면 «다 날아갔다»고 믿는다 */}
      <p>{d.saveFailedSafe}</p>
    </Dialog>
  )
}
