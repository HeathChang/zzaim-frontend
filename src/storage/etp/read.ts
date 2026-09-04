/** `.etp` 읽기. **파일을 믿지 않는다** — 사용자가 손으로 고쳤을 수도, 다른 버전이
 *  썼을 수도 있다. 그대로 스토어에 넣으면 조판 중에 터진다. */
import { unzipSync, strFromU8 } from 'fflate'
import { ENTRY, SCHEMA_VERSION, type EtpDocument } from '@/storage/etp/format'
import {
  parseManifest,
  parsePaper,
  parsePassage,
  parseQuestion,
  type ParseReport,
} from '@/storage/etp/adapter'
import { migrate } from '@/storage/etp/migrate'

export class EtpReadError extends Error {
  constructor(
    /** 화면이 문구를 고를 수 있게 종류를 준다 (SS§2.4 오류 상태) */
    readonly reason: 'not-a-zip' | 'not-an-etp' | 'too-new',
    message: string,
  ) {
    super(message)
    this.name = 'EtpReadError'
  }
}

export interface ReadResult {
  doc: EtpDocument
  report: ParseReport
  /** 스키마를 올렸는가. 올렸으면 호출자가 `.v<N>.bak` 을 남겨야 한다 */
  migratedFrom: number | null
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return null
  try {
    return JSON.parse(strFromU8(bytes))
  } catch {
    return null
  }
}

export function readEtp(bytes: Uint8Array): ReadResult {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes)
  } catch {
    throw new EtpReadError('not-a-zip', 'not a zip archive')
  }

  const manifest = parseManifest(parseJson(entries[ENTRY.manifest]))
  if (!manifest) {
    // zip 이긴 한데 우리 파일이 아니다. 추측해서 열면 더 나쁘다.
    throw new EtpReadError('not-an-etp', 'manifest.json missing or invalid')
  }
  if (manifest.schemaVersion > SCHEMA_VERSION) {
    // 앞으로 만든 파일이다. 억지로 열면 **모르는 필드를 조용히 버린다** —
    // 그 상태로 저장하면 사용자 데이터가 사라진다.
    throw new EtpReadError('too-new', `schema ${manifest.schemaVersion} > ${SCHEMA_VERSION}`)
  }

  const report: ParseReport = { skipped: [] }
  const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

  const doc: EtpDocument = {
    manifest,
    questions: asArray(parseJson(entries[ENTRY.questions])).flatMap((q) => {
      const parsed = parseQuestion(q, report)
      return parsed ? [parsed] : []
    }),
    passages: asArray(parseJson(entries[ENTRY.passages])).flatMap((p) => {
      const parsed = parsePassage(p, report)
      return parsed ? [parsed] : []
    }),
    papers: asArray(parseJson(entries[ENTRY.papers])).flatMap((p) => {
      const parsed = parsePaper(p, report)
      return parsed ? [parsed] : []
    }),
    blobs: new Map(
      Object.entries(entries)
        .filter(([name]) => name.startsWith(ENTRY.blobDir))
        .map(([name, value]) => [name.slice(ENTRY.blobDir.length), value]),
    ),
  }

  const migratedFrom = manifest.schemaVersion < SCHEMA_VERSION ? manifest.schemaVersion : null
  return { doc: migratedFrom === null ? doc : migrate(doc), report, migratedFrom }
}
