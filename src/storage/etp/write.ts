/** `.etp` 쓰기 — 문서를 zip 바이트로 만든다. **순수 함수다** (DOM 을 모른다).
 *
 *  순수하게 둔 이유: 저장 경로에서 가장 위험한 것은 «쓰다가 죽는 것»인데,
 *  그 시나리오를 테스트하려면 바이트를 만드는 일과 파일에 쓰는 일이 나뉘어
 *  있어야 한다. */
import { zipSync, strToU8 } from 'fflate'
import { ENTRY, SCHEMA_VERSION, type EtpDocument } from '@/storage/etp/format'

/** 사람이 열어볼 수 있어야 한다 — **압축해도 읽히게 들여쓴다** (PP§3.2 이식성).
 *  들여쓰기가 붙는 만큼 커지지만 zip 이 대부분 회수한다. */
function json(value: unknown): Uint8Array {
  return strToU8(JSON.stringify(value, null, 2))
}

export interface WriteOptions {
  /** 저장 시각. **주입한다** — `Date.now()` 를 안에서 부르면 테스트가 시각을 못 잡는다 */
  now: number
  app?: string
}

export function buildEtp(doc: EtpDocument, options: WriteOptions): Uint8Array {
  const files: Record<string, Uint8Array> = {
    [ENTRY.manifest]: json({
      ...doc.manifest,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: options.now,
      ...(options.app ? { app: options.app } : {}),
    }),
    [ENTRY.questions]: json(doc.questions),
    [ENTRY.passages]: json(doc.passages),
    [ENTRY.papers]: json(doc.papers),
  }
  for (const [hash, bytes] of doc.blobs) {
    // 이름이 내용 해시라 **추가만** 하면 된다. 같은 이미지를 두 번 담지 않는다
    files[`${ENTRY.blobDir}${hash}`] = bytes
  }
  // 이미지는 이미 압축돼 있다(PNG). 다시 압축하면 시간만 쓰고 줄지 않는다
  return zipSync(files, { level: 6 })
}

/** 내용 해시 — blob 이름. 같은 이미지는 한 번만 담긴다.
 *  FNV-1a 64비트 상당(32비트 두 벌). 암호용이 아니라 **중복 제거용**이다. */
export function contentHash(bytes: Uint8Array): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i] as number
    h1 = Math.imul(h1 ^ b, 0x01000193)
    h2 = Math.imul(h2 ^ b, 0x85ebca6b)
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}.${bytes.length.toString(36)}`
}
