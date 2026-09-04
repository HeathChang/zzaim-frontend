/** 캐시 저장소 — **인터페이스 뒤에 둔다.**
 *
 *  이유 둘.
 *  1. 크래시 복구 경로를 **IndexedDB 없이 테스트**할 수 있어야 한다.
 *     «저장 후 죽었다»를 실제 브라우저에서 재현하기는 어렵다
 *  2. 캐시 실패가 **작업을 막으면 안 된다**(정본은 파일이다). 인터페이스로
 *     두면 «실패하는 캐시»를 주입해 그 성질을 확인할 수 있다 */
import type { EtpDocument } from '@/storage/etp/format'
import { wipeCache, type ZzaimCache } from '@/storage/cache/db'

export interface CacheSnapshot {
  fileKey: string
  /** 캐시에 담긴 작업의 시각 */
  updatedAt: number
  /** 이 앱이 마지막으로 알던 **파일**의 시각 — 외부 변경 감지의 기준 */
  fileUpdatedAt: number
  doc: EtpDocument
}

export interface CacheStore {
  put(snapshot: CacheSnapshot): Promise<void>
  get(fileKey: string): Promise<CacheSnapshot | null>
  /** 공용 PC 모드가 부른다. **한 건도 남으면 안 된다** */
  wipe(): Promise<void>
}

export function createMemoryCache(): CacheStore {
  const map = new Map<string, CacheSnapshot>()
  return {
    put: async (s) => void map.set(s.fileKey, s),
    get: async (k) => map.get(k) ?? null,
    wipe: async () => map.clear(),
  }
}

/** Dexie 구현. **여기서만 IndexedDB 를 안다.** */
export function createDexieCache(db: ZzaimCache): CacheStore {
  return {
    async put(snapshot) {
      await db.transaction(
        'rw',
        [db.questions, db.passages, db.papers, db.sessions],
        async () => {
          await Promise.all([db.questions.clear(), db.passages.clear(), db.papers.clear()])
          await db.questions.bulkPut(snapshot.doc.questions)
          await db.passages.bulkPut(snapshot.doc.passages)
          await db.papers.bulkPut(snapshot.doc.papers)
          await db.sessions.put({
            fileKey: snapshot.fileKey,
            updatedAt: snapshot.updatedAt,
            fileUpdatedAt: snapshot.fileUpdatedAt,
          })
        },
      )
    },
    async get(fileKey) {
      const session = await db.sessions.get(fileKey)
      if (!session) return null
      const [questions, passages, papers] = await Promise.all([
        db.questions.toArray(),
        db.passages.toArray(),
        db.papers.toArray(),
      ])
      return {
        fileKey,
        updatedAt: session.updatedAt,
        fileUpdatedAt: session.fileUpdatedAt,
        doc: {
          manifest: { schemaVersion: 1, updatedAt: session.updatedAt },
          questions,
          passages,
          papers,
          blobs: new Map(),
        },
      }
    },
    async wipe() {
      await wipeCache(db)
    },
  }
}
