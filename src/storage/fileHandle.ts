/** 파일 접근 — **정본을 깨뜨리지 않는 것**이 이 파일의 전부다 (zz-1 D8).
 *
 *  ## 왜 그냥 덮어쓰면 안 되는가
 *  `createWritable()` 은 **기존 파일을 절단한 채 연다.** 쓰는 도중 탭이 죽거나
 *  용량이 모자라면 **정본이 잘린 채 남는다.** 이 제품에서 그건 문항 은행 전체
 *  소실이다 — 파일이 정본이기 때문에 되돌릴 데가 없다.
 *
 *  ## 그래서
 *  임시 파일에 먼저 쓰고, 다 된 뒤에 원본을 `.bak` 으로 밀고 임시를 원본 이름으로
 *  바꾼다. 어느 시점에 죽어도 **원본이나 백업 중 하나는 온전하다.**
 *
 *  이러려면 **디렉토리 핸들**이 필요하다(새 파일을 만들어야 하므로). 권한을
 *  거부하면 원자적 쓰기가 불가능하므로 **제한 등급으로 강등**해 다운로드로 간다. */

import { rollingBackupName } from '@/storage/etp/migrate'

/** 브라우저 API 를 그대로 쓰지 않고 이 모양으로 좁힌다.
 *  좁혀 두면 **사고를 주입한 가짜 구현으로 테스트할 수 있다** — 저장 도중
 *  죽는 상황은 실제 브라우저에서 재현하기 어렵다. */
export interface WritableFile {
  write(data: Uint8Array): Promise<void>
  close(): Promise<void>
  abort?(): Promise<void>
}

export interface FileEntry {
  name: string
  createWritable(): Promise<WritableFile>
  read(): Promise<Uint8Array>
  remove(): Promise<void>
  /** Chrome 계열 전용. **대상이 Chrome·Edge 뿐이라 그대로 쓴다** (OD-01) */
  rename(nextName: string): Promise<void>
}

export interface Directory {
  getFile(name: string, options?: { create?: boolean }): Promise<FileEntry>
  removeFile(name: string): Promise<void>
  has(name: string): Promise<boolean>
}

export type SaveOutcome =
  | { kind: 'atomic'; backup: string }
  /** 디렉토리 권한이 없어 다운로드로 저장했다 — 사용자가 파일을 챙겨야 한다 */
  | { kind: 'download' }

export class SaveError extends Error {
  constructor(
    readonly stage: 'write-temp' | 'backup' | 'commit',
    readonly cause: unknown,
  ) {
    super(`save failed at ${stage}`)
    this.name = 'SaveError'
  }
}

const TEMP_SUFFIX = '.tmp'

/** 원자적 저장.
 *
 *  단계마다 «여기서 죽으면 무엇이 남는가»를 적어 둔다 — 이 함수를 고칠 사람이
 *  반드시 알아야 하는 것이다. */
export async function saveAtomic(
  dir: Directory,
  fileName: string,
  bytes: Uint8Array,
): Promise<SaveOutcome> {
  const tempName = `${fileName}${TEMP_SUFFIX}`
  const backupName = rollingBackupName(fileName)

  // ① 임시 파일에 쓴다. 여기서 죽으면 **원본은 손도 안 댔다.**
  let temp: FileEntry
  try {
    temp = await dir.getFile(tempName, { create: true })
    const w = await temp.createWritable()
    try {
      await w.write(bytes)
      await w.close()
    } catch (err) {
      await w.abort?.().catch(() => undefined)
      throw err
    }
  } catch (err) {
    // 임시 파일이 반쯤 남았을 수 있다. 치우되 실패해도 진행에 지장 없다
    await dir.removeFile(tempName).catch(() => undefined)
    throw new SaveError('write-temp', err)
  }

  // ② 원본을 백업으로 민다. 여기서 죽으면 **원본 또는 백업이 온전하다.**
  try {
    if (await dir.has(fileName)) {
      // 이전 백업을 먼저 치운다 — rename 은 대상이 있으면 실패할 수 있다
      await dir.removeFile(backupName).catch(() => undefined)
      const original = await dir.getFile(fileName)
      await original.rename(backupName)
    }
  } catch (err) {
    await dir.removeFile(tempName).catch(() => undefined)
    throw new SaveError('backup', err)
  }

  // ③ 임시를 원본 이름으로. 여기서 죽으면 **백업이 온전하다.**
  try {
    await temp.rename(fileName)
  } catch (err) {
    throw new SaveError('commit', err)
  }

  return { kind: 'atomic', backup: backupName }
}

/** 저장이 중간에 끊긴 흔적을 찾는다.
 *
 *  ## 왜 필요한가
 *  ③단계(임시 → 원본 이름)를 밟는 **찰나에 죽으면 원본 이름이 비어 있다.**
 *  백업과 임시 파일은 온전한데 **사용자 눈에는 파일이 사라진 것으로 보인다** —
 *  파일 선택기에도 안 뜬다. 그때 «없어졌다»고 믿게 두면 안 된다.
 *
 *  창은 아주 짧지만 0 이 아니고, 이 제품에서 그 대가는 문항 은행 전체다. */
export interface RecoveryReport {
  /** 원본 이름의 파일이 있는가 */
  hasOriginal: boolean
  /** 직전 저장 내용 */
  hasBackup: boolean
  /** 끝내지 못한 저장의 흔적 — 있으면 **저장이 중간에 끊겼다는 증거**다 */
  hasTemp: boolean
  /** 사용자에게 알려야 하는 상태인가 */
  interrupted: boolean
}

export async function inspectRecovery(
  dir: Directory,
  fileName: string,
): Promise<RecoveryReport> {
  const [hasOriginal, hasBackup, hasTemp] = await Promise.all([
    dir.has(fileName),
    dir.has(rollingBackupName(fileName)),
    dir.has(`${fileName}${TEMP_SUFFIX}`),
  ])
  // 원본이 없는데 백업이나 임시가 있다 = 저장이 중간에 끊겼다.
  // 원본이 있는데 임시가 남아 있어도 «지난번에 실패했다»는 신호다.
  return { hasOriginal, hasBackup, hasTemp, interrupted: (!hasOriginal && (hasBackup || hasTemp)) || hasTemp }
}

/** 끊긴 저장을 되돌린다. **임시본을 믿지 않고 백업을 택한다** —
 *  임시본은 «다 쓰였는지» 알 수 없지만 백업은 온전한 이전 상태다.
 *  잃는 것은 마지막 저장 한 번이고, 얻는 것은 «확실히 열리는 파일»이다. */
export async function recoverInterrupted(dir: Directory, fileName: string): Promise<boolean> {
  const report = await inspectRecovery(dir, fileName)
  if (report.hasOriginal) {
    // 원본이 멀쩡하다. 임시 찌꺼기만 치운다
    if (report.hasTemp) await dir.removeFile(`${fileName}${TEMP_SUFFIX}`).catch(() => undefined)
    return false
  }
  if (!report.hasBackup) return false

  const backup = await dir.getFile(rollingBackupName(fileName))
  await backup.rename(fileName)
  await dir.removeFile(`${fileName}${TEMP_SUFFIX}`).catch(() => undefined)
  return true
}

/** 원자적 쓰기가 불가능할 때의 경로. **새 파일이 생기므로 절단 위험이 없다.**
 *  대신 사용자가 내려받은 파일을 직접 챙겨야 한다 — 그래서 화면이
 *  «저장 안 됨 ⚠» 을 상시 강조한다 (SS§13.2). */
export function downloadFile(
  bytes: Uint8Array,
  fileName: string,
  doc: Document = document,
): SaveOutcome {
  // `Uint8Array` 를 그대로 넘기면 TS 가 ArrayBufferLike 를 걸고 넘어진다.
  // 복사본을 만들어 소유권을 명확히 한다.
  const copy = new Uint8Array(bytes)
  const blob = new Blob([copy], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = doc.createElement('a')
  a.href = url
  a.download = fileName
  doc.body.appendChild(a)
  a.click()
  a.remove()
  // 즉시 해제하면 다운로드가 시작되기 전에 사라질 수 있다
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return { kind: 'download' }
}
