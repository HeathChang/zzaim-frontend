/** IndexedDB 캐시 — **정본이 아니다.**
 *
 *  «파일이 정본, 브라우저는 캐시»(PP§3.2). 여기 있는 것이 전부 사라져도 파일만
 *  있으면 100% 복구된다. 그래서 이 파일의 어떤 실패도 **작업을 막지 않는다** —
 *  캐시가 안 써지면 자동 저장 경고만 뜨고 편집은 계속된다.
 *
 *  하는 일 둘:
 *  1. 크래시 대비 (최대 손실 10초 — PP§10)
 *  2. 다시 열 때 «저장되지 않은 작업»을 되살릴 근거 */
import Dexie, { type Table } from 'dexie'
import type { Paper, Passage, Question } from '@/domain/types'
import type { BlobStore } from '@/storage/BlobStore'

/** 작업 중인 문서의 스냅샷. 파일 한 벌에 하나씩. */
export interface CacheSession {
  /** 파일을 가리키는 키 (이름 + 크기 등으로 만든다) */
  fileKey: string
  updatedAt: number
  /** 이 앱이 마지막으로 알던 **파일**의 시각 — 외부 변경 감지에 쓴다 */
  fileUpdatedAt: number
}

export class ZzaimCache extends Dexie {
  questions!: Table<Question, string>
  passages!: Table<Passage, string>
  papers!: Table<Paper, string>
  blobs!: Table<{ hash: string; bytes: Uint8Array }, string>
  sessions!: Table<CacheSession, string>

  constructor(name = 'zzaim') {
    super(name)
    this.version(1).stores({
      questions: 'id, passageId, updatedAt',
      passages: 'id, updatedAt',
      papers: 'id, updatedAt',
      blobs: 'hash',
      sessions: 'fileKey, updatedAt',
    })
  }
}

export function createCacheBlobStore(db: ZzaimCache): BlobStore {
  return {
    put: async (hash, bytes) => void (await db.blobs.put({ hash, bytes })),
    get: async (hash) => (await db.blobs.get(hash))?.bytes ?? null,
    has: async (hash) => (await db.blobs.get(hash)) !== undefined,
    delete: async (hash) => await db.blobs.delete(hash),
    entries: async () => new Map((await db.blobs.toArray()).map((b) => [b.hash, b.bytes])),
    clear: async () => await db.blobs.clear(),
  }
}

/** 공용 PC 모드가 부른다. **전부 비운다** — 문항이 한 건도 남으면 안 된다 (PP§10 보안) */
export async function wipeCache(db: ZzaimCache): Promise<void> {
  await db.transaction(
    'rw',
    [db.questions, db.passages, db.papers, db.blobs, db.sessions],
    async () => {
      await Promise.all([
        db.questions.clear(),
        db.passages.clear(),
        db.papers.clear(),
        db.blobs.clear(),
        db.sessions.clear(),
      ])
    },
  )
}
