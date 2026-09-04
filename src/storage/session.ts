/** 문서 세션 — **부품을 조립하는 곳.**
 *
 *  파일 열기·저장·충돌·복구가 각각 있어도 이어 붙이지 않으면 제품이 아니다.
 *  여기가 그 순서를 소유한다.
 *
 *  브라우저 API 를 직접 부르지 않고 **주입받는다.** 그래야 «저장 도중 죽었다»,
 *  «다른 PC 에서 고쳤다» 같은 상황을 테스트로 만들 수 있다 — 실제 브라우저에서는
 *  재현하기 어려운 것들이고, 그게 이 영역에서 가장 중요한 경로다. */

import { buildEtp } from '@/storage/etp/write'
import { readEtp, EtpReadError } from '@/storage/etp/read'
import { type EtpDocument } from '@/storage/etp/format'
import { migrationBackupName } from '@/storage/etp/migrate'
import {
  downloadFile,
  recoverInterrupted,
  saveAtomic,
  SaveError,
  type Directory,
  type SaveOutcome,
} from '@/storage/fileHandle'
import { decideConflict, type ConflictDecision } from '@/storage/conflict'
import type { ParseReport } from '@/storage/etp/adapter'

export interface SessionPorts {
  /** 디렉토리 권한을 받았으면 준다. 없으면 다운로드 경로로 간다 */
  directory: Directory | null
  /** 파일 바이트 읽기 — 디렉토리가 없을 때(파일 하나만 열었을 때)도 가능하다 */
  readFile(name: string): Promise<Uint8Array>
  now(): number
  /** 이 앱이 마지막으로 알던 파일 시각 — 캐시가 준다 */
  lastKnownAt(fileKey: string): Promise<number | null>
  /** 캐시에 남아 있는 작업의 시각 */
  cacheUpdatedAt(fileKey: string): Promise<number | null>
  onDownload?(bytes: Uint8Array, name: string): SaveOutcome
}

export interface OpenResult {
  doc: EtpDocument
  conflict: ConflictDecision
  report: ParseReport
  /** 스키마를 올렸으면 남긴 백업 이름 */
  migrationBackup: string | null
  /** 저장이 중간에 끊겨 있어 되돌렸는가 */
  recovered: boolean
}

export class OpenError extends Error {
  constructor(readonly reason: EtpReadError['reason'] | 'read-failed') {
    super(`open failed: ${reason}`)
    this.name = 'OpenError'
  }
}

/** 파일을 연다. **순서가 중요하다.**
 *
 *  1. 끊긴 저장을 먼저 되돌린다 — 원본이 없는 상태로 읽으려 하면 실패한다
 *  2. 읽고 검증한다
 *  3. 스키마를 올렸으면 **백업을 남긴다.** 올린 뒤에 남기면 이미 늦었다
 *  4. 파일과 캐시 중 어느 쪽이 새로운지 판정한다 — **합치지 않는다** */
export async function openDocument(ports: SessionPorts, fileName: string): Promise<OpenResult> {
  let recovered = false
  if (ports.directory) {
    recovered = await recoverInterrupted(ports.directory, fileName)
  }

  let bytes: Uint8Array
  try {
    bytes = await ports.readFile(fileName)
  } catch {
    throw new OpenError('read-failed')
  }

  let parsed
  try {
    parsed = readEtp(bytes)
  } catch (err) {
    if (err instanceof EtpReadError) throw new OpenError(err.reason)
    throw new OpenError('read-failed')
  }

  // 스키마를 올렸으면 **원본을 먼저 남긴다.** 매 저장의 `.bak` 과 이름이 달라야
  // 첫 자동 저장에 사라지지 않는다 (zz-1 D8)
  let migrationBackup: string | null = null
  if (parsed.migratedFrom !== null && ports.directory) {
    const name = migrationBackupName(fileName, parsed.migratedFrom)
    try {
      const entry = await ports.directory.getFile(name, { create: true })
      const w = await entry.createWritable()
      await w.write(bytes)
      await w.close()
      migrationBackup = name
    } catch {
      // 백업에 실패했으면 **올린 문서를 저장하지 않는다** — 되돌릴 수단 없이
      // 덮어쓰는 것이 가장 나쁘다. 호출자가 읽기 전용으로 다룰 수 있게 알린다
      migrationBackup = null
    }
  }

  const conflict = decideConflict({
    fileUpdatedAt: parsed.doc.manifest.updatedAt,
    knownAt: await ports.lastKnownAt(fileName),
    cacheUpdatedAt: await ports.cacheUpdatedAt(fileName),
  })

  return { doc: parsed.doc, conflict, report: parsed.report, migrationBackup, recovered }
}

export interface SaveResult {
  outcome: SaveOutcome
  savedAt: number
}

/** 저장한다. 디렉토리 권한이 있으면 원자적으로, 없으면 다운로드로.
 *
 *  **실패해도 던지되, 원본이 온전하다는 사실은 `SaveError.stage` 에 남는다** —
 *  화면이 «원본 파일은 그대로 있습니다»를 말할 수 있어야 한다 (D-08). */
export async function saveDocument(
  ports: SessionPorts,
  fileName: string,
  doc: EtpDocument,
  app?: string,
): Promise<SaveResult> {
  const savedAt = ports.now()
  const bytes = buildEtp(doc, { now: savedAt, ...(app ? { app } : {}) })

  if (!ports.directory) {
    const download = ports.onDownload ?? ((b: Uint8Array, n: string) => downloadFile(b, n))
    return { outcome: download(bytes, fileName), savedAt }
  }
  const outcome = await saveAtomic(ports.directory, fileName, bytes)
  return { outcome, savedAt }
}


export { SaveError }
