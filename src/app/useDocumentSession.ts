/** 앱과 저장소를 잇는 React 층. **여기서 부품이 실제로 조립된다.**
 *
 *  로직은 전부 `storage/` 에 있고 이 파일은 «언제 부르는가»만 맡는다 —
 *  그래야 로직이 테스트 가능한 채로 남는다. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDocStore } from '@/app/store/doc'
import { useUiStore } from '@/app/store/ui'
import { createAutosave } from '@/storage/cache/autosave'
import { composeDocument } from '@/storage/composeDocument'
import { openDocument, saveDocument, type SessionPorts } from '@/storage/session'
import { emptyDocument, type EtpDocument, type ImportStats } from '@/storage/etp/format'
import { pickDirectory, pickFile, wrapDirectory } from '@/storage/browserPorts'
import { downloadFile } from '@/storage/fileHandle'
import { requestPersistence } from '@/storage/persist'
import { isMarked, markForWipe, unmark, wipeIfMarked } from '@/storage/publicPc'
import { createDexieCache, type CacheStore } from '@/storage/cache/cacheStore'
import { createCacheBlobStore } from '@/storage/cache/db'
import type { BlobStore } from '@/storage/BlobStore'
import { readStorageStatus } from '@/storage/persist'
import { ZzaimCache } from '@/storage/cache/db'
import { acquireTabLock, type TabLock } from '@/storage/conflict'
import { sortRecent, type RecentFile } from '@/screens/S00/RecentFiles'
import { startIdleLock } from '@/app/idleLock'
import { useUnloadGuard } from '@/app/useUnloadGuard'
import { canWriteAtomically, queryWritePermission, requestWritePermission } from '@/storage/dirPermission'
import { decideTier, needsPersistentSaveWarning, readEnvironment } from '@/app/browserTier'
import type { ConflictDecision } from '@/storage/conflict'

export interface DocumentSession {
  fileName: string | null
  /** 확정 시 교정 통계를 누적한다 (zz-4 D7) */
  addStats(stats: ImportStats): void
  /** 최근 파일 최대 5개 */
  recent: RecentFile[]
  /** 저장소가 거의 찼다 — D-07 */
  quotaWarning: { usage: number; quota: number; ratio: number } | null
  /** 저장 안 한 채 파일을 열려 한다 — D-01 */
  pendingOpen: boolean
  confirmOpenSave(): Promise<void>
  confirmOpenDiscard(): Promise<void>
  cancelOpen(): void
  dismissQuota(): void
  /** 다른 탭이 이 파일을 잡고 있다 */
  readOnly: boolean
  ready: boolean
  conflict: ConflictDecision | null
  saveFailed: boolean
  locked: boolean
  /** 지금 열려 있는 문서 */
  doc: EtpDocument
  openFile(): Promise<void>
  save(): Promise<void>
  unlock(): void
  dismissConflict(): void
  dismissSaveError(): void
}

const RECENT_KEY = 'zzaim.recentFiles'

/** 최근 파일 목록은 `localStorage` 에 둔다.
 *  **파일 핸들은 담지 않는다** — 직렬화할 수 없고, 담을 수 있더라도 권한이
 *  만료되므로 «다시 선택»을 거쳐야 한다. 이름과 시각만으로 충분하다. */
function readRecent(): RecentFile[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((f): f is { name: string; openedAt: number } =>
        typeof f === 'object' && f !== null && typeof (f as RecentFile).name === 'string',
      )
      .map((f) => ({ name: f.name, openedAt: f.openedAt, stale: true }))
  } catch {
    return []
  }
}

function writeRecent(files: readonly RecentFile[]): void {
  try {
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(files.map((f) => ({ name: f.name, openedAt: f.openedAt }))),
    )
  } catch {
    // 저장소가 막혀 있어도 작업을 막지 않는다
  }
}

export function useDocumentSession(): DocumentSession {
  const [fileName, setFileName] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ConflictDecision | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [locked, setLocked] = useState(false)
  const [doc, setDoc] = useState<EtpDocument>(() => emptyDocument(Date.now()))
  const dirRef = useRef<ReturnType<typeof wrapDirectory> | null>(null)
  const lockRef = useRef<TabLock | null>(null)
  /** 파일을 여는 중 — 이때의 스토어 변경은 «교사의 편집»이 아니다 */
  const loadingRef = useRef(false)
  const [readOnly, setReadOnly] = useState(false)
  const [wiped, setWiped] = useState(false)
  const [quotaWarning, setQuotaWarning] = useState<Awaited<
    ReturnType<typeof readStorageStatus>
  > | null>(null)
  /** 저장하지 않은 채 파일을 열려고 한다 — D-01 로 묻는다 */
  const [pendingOpen, setPendingOpen] = useState(false)
  /** 최근 파일 (SS§2.4). 핸들은 만료되므로 **다시 선택**이 필요할 수 있다 */
  const [recent, setRecent] = useState<RecentFile[]>(() => readRecent())
  // 캐시는 브라우저에만 있다. 실패해도 작업을 막지 않는다 — 정본은 파일이다
  const cache = useRef<CacheStore | null>(null)
  const blobs = useRef<BlobStore | null>(null)
  if (cache.current === null) {
    try {
      const db = new ZzaimCache()
      cache.current = createDexieCache(db)
      blobs.current = createCacheBlobStore(db)
    } catch {
      cache.current = null
      blobs.current = null
    }
  }

  const setSaveStatus = useUiStore((s) => s.setSaveStatus)
  const setTier = useUiStore((s) => s.setTier)
  const setUiFileName = useUiStore((s) => s.setFileName)
  const publicPc = useUiStore((s) => s.publicPc)
  const load = useDocStore((s) => s.load)

  // 저장소 지속성을 **조용히** 한 번 요청한다. 결과를 묻거나 알리지 않는다 —
  // 여기서 권한 대화상자를 띄우면 «3분 안에 어? 되네»를 첫 화면에서 잃는다
  useEffect(() => {
    void requestPersistence()
  }, [])

  // ★ 공용 PC 정리는 **부팅 시작 시점**에. 화면을 그리기 전이어야 한다 —
  // 지우기 전에 문항이 보이면 공용 PC 모드가 의미를 잃는다 (zz-1 D6)
  useEffect(() => {
    const store = cache.current
    if (!store) {
      setWiped(true)
      return
    }
    void wipeIfMarked(() => store.wipe())
      .catch(() => undefined)
      .finally(() => setWiped(true))
  }, [])

  const ports: SessionPorts = useMemo(
    () => ({
      get directory() {
        return dirRef.current
      },
      readFile: async () => {
        throw new Error('readFile is provided per-open')
      },
      now: () => Date.now(),
      lastKnownAt: async () => null,
      cacheUpdatedAt: async () => null,
      onDownload: (bytes, name) => downloadFile(bytes, name),
    }),
    [],
  )

  /** ★ 저장할 문서를 **저장 시점에 조립한다.**
   *
   *  전에는 `doc` 상태를 그대로 저장했는데, 그 값은 파일을 열 때와 통계를 쌓을
   *  때만 바뀐다. 교사가 만든 문항·지문·시험지는 문서 스토어에 있어서
   *  **저장하면 빈 문서가 저장됐다.** 정본은 스토어다. */
  const composeDoc = useCallback(
    (): EtpDocument => composeDocument(latest.current.doc, useDocStore.getState(), Date.now()),
    [],
  )

  const save = useCallback(async () => {
    if (!fileName) return
    // ★ 다른 탭이 이 파일을 잡고 있다. 저장하면 **그 탭의 작업을 덮는다** —
    // 읽기 전용으로 연 이유가 바로 이것이다 (PP§9.2)
    if (readOnly) return
    setSaveStatus('saving')
    try {
      // 이미지는 **저장 시점에** 캐시에서 파일로 옮긴다. 안 실으면 다른 PC 에서
      // 열었을 때 그림 자리가 빈다 (SS§5.4 «이미지 누락»)
      const composed = composeDoc()
      const withBlobs = {
        ...composed,
        blobs: (await blobs.current?.entries()) ?? composed.blobs,
      }
      await saveDocument(ports, fileName, withBlobs, 'zzaim')
      setSaveStatus(dirRef.current ? 'saved' : 'unsaved')
      setSaveFailed(false)
      // 저장 직후가 용량을 볼 가장 정확한 시점이다 — 방금 늘어난 뒤다
      const status = await readStorageStatus()
      setQuotaWarning(status.shouldWarn ? status : null)
    } catch {
      // 저장 실패는 **작업을 막지 않는다.** 원본은 온전하다 (D-08)
      setSaveStatus('unsaved')
      setSaveFailed(true)
    }
  }, [composeDoc, fileName, ports, readOnly, setSaveStatus])

  /** 자동 저장은 **한 번 만들고 끝까지 쓴다.** 문서가 바뀔 때마다 새로 만들면
   *  `dispose` 가 직전 인스턴스의 대기 타이머를 죽여 «2초 뒤 캐시 저장»이
   *  영영 오지 않는다. 최신 값은 ref 로 읽는다. */
  const latest = useRef({ doc, fileName, save, composeDoc })
  latest.current = { doc, fileName, save, composeDoc }

  const autosave = useMemo(
    () =>
      createAutosave({
        saveToCache: async () => {
          // 크래시 대비 — 최대 손실 10초가 요구다 (PP§10).
          // 실패해도 던지지 않는다: 정본은 파일이고, 캐시는 보조다
          const store = cache.current
          const name = latest.current.fileName
          if (!store || !name) return
          const current = latest.current.composeDoc()
          await store.put({
            fileKey: name,
            updatedAt: Date.now(),
            fileUpdatedAt: current.manifest.updatedAt,
            doc: current,
          })
        },
        saveToFile: async () => {
          await latest.current.save()
        },
      }),
    [],
  )

  useEffect(() => () => autosave.dispose(), [autosave])

  /** ★ 문서가 바뀌면 자동 저장을 깨운다.
   *
   *  **이걸 부르는 곳이 아예 없었다.** 그래서 2초 캐시 저장도, 5초 파일 저장도
   *  한 번도 돌지 않았고 — 더 나쁘게 — `isDirty()` 가 언제나 거짓이라
   *  «저장 안 하고 나가시겠습니까»(SS§13.2)와 D-01 이 뜨지 않았다.
   *
   *  파일을 **여는 순간**의 변경은 제외한다. 열자마자 «변경됨»이 되면
   *  아무것도 안 했는데 나갈 때 경고가 뜬다. */
  useEffect(
    () =>
      useDocStore.subscribe(() => {
        if (loadingRef.current) return
        autosave.touch()
      }),
    [autosave],
  )

  const doOpen = useCallback(async () => {
    const picked = await pickFile()
    if (!picked) return

    // **디렉토리 권한을 함께 요청한다** — 없으면 원자적 쓰기가 불가능하고,
    // 거부하면 제한 등급으로 강등해 다운로드로 저장한다 (zz-1 D8)
    const dirHandle = await pickDirectory()

    // ★ **고르는 것과 권한이 있는 것은 다르다.**
    // 예전에는 고르기만 하고 권한을 확인하지 않아, 거부해도 등급이 «완전»으로 남았다.
    // 그러면 «저장됨»이 거짓말이 되는데 경고(SS§13.2)는 뜨지 않는다 —
    // 교사는 디스크에 있다고 믿고 창을 닫는다.
    let permission = await queryWritePermission(dirHandle)
    if (permission !== 'granted' && dirHandle) {
      // 파일 고르기라는 **사용자 행동에 이어진** 요청이라 여기서 물어도 된다 (SS§2.3)
      permission = await requestWritePermission(dirHandle)
    }
    const writable = canWriteAtomically(permission)
    dirRef.current = dirHandle && writable ? wrapDirectory(dirHandle) : null
    setTier(decideTier({ ...readEnvironment(), permission }))

    // ★ 같은 파일을 두 탭에서 열면 한쪽 작업이 사라진다 (PP§9.2).
    // 잠금을 못 잡으면 **읽기 전용**으로 연다
    lockRef.current?.release()
    const lock = await acquireTabLock(picked.name)
    lockRef.current = lock
    setReadOnly(!lock.acquired)

    const localPorts: SessionPorts = {
      ...ports,
      readFile: async () => picked.bytes,
      lastKnownAt: async () => (await cache.current?.get(picked.name))?.fileUpdatedAt ?? null,
      cacheUpdatedAt: async () => (await cache.current?.get(picked.name))?.updatedAt ?? null,
    }
    const result = await openDocument(localPorts, picked.name)

    setDoc(result.doc)
    loadingRef.current = true
    load({
      questions: Object.fromEntries(result.doc.questions.map((q) => [q.id, q])),
      passages: Object.fromEntries(result.doc.passages.map((p) => [p.id, p])),
      papers: Object.fromEntries(result.doc.papers.map((p) => [p.id, p])),
      activePaperId: result.doc.papers[0]?.id ?? null,
    })
    // zustand 의 구독은 `load` 안에서 **동기로** 불린다. 여기서 바로 내린다
    loadingRef.current = false
    setFileName(picked.name)
    setUiFileName(picked.name)
    setConflict(result.conflict.kind === 'open' ? null : result.conflict)
    setSaveStatus(!lock.acquired ? 'readonly' : dirRef.current ? 'saved' : 'unsaved')

    // 최근 파일에 남긴다. 핸들 자체는 저장하지 않는다 — 다음에 열 때
    // **다시 선택**을 거쳐야 하고, 그 사실을 배지로 알린다 (SS§2.4)
    setRecent((prev) => {
      const next = sortRecent([
        { name: picked.name, openedAt: Date.now(), stale: false },
        ...prev.filter((f) => f.name !== picked.name),
      ])
      writeRecent(next)
      return next
    })
  }, [load, ports, setSaveStatus, setTier, setUiFileName])

  /** 저장하지 않은 변경이 있으면 **먼저 묻는다** — 다른 파일을 열면 지금 작업이
   *  사라진다. 탭을 닫는 경우는 브라우저 경고가 맡고, 앱 안에서의 이동은 여기다 */
  const openFile = useCallback(async () => {
    if (autosave.isDirty()) {
      setPendingOpen(true)
      return
    }
    await doOpen()
  }, [autosave, doOpen])

  // 탭을 닫을 때 잠금을 놓는다 — 안 놓으면 다음 탭이 영영 못 연다
  useEffect(() => () => lockRef.current?.release(), [])

  // 저장되지 않은 채 나가려 하면 경고한다. **되쓰기가 안 되는 등급에서는 항상** —
  // 내려받기를 안 했으면 작업이 통째로 사라진다 (SS§13.2)
  const tier = useUiStore((s) => s.tier)
  useUnloadGuard({
    isDirty: () => autosave.isDirty(),
    alwaysWarn: needsPersistentSaveWarning(tier) && fileName !== null,
  })

  // 자동 잠금 (SS§9). 공용 PC 모드면 5분
  useEffect(() => {
    return startIdleLock({
      onLock: () => setLocked(true),
      isPublicPc: () => publicPc,
    })
  }, [publicPc])

  // 공용 PC 모드를 켜면 «다음에 열 때 지운다»고 예약한다 (zz-1 D6)
  useEffect(() => {
    if (publicPc) markForWipe()
    else if (isMarked()) unmark()
  }, [publicPc])

  return {
    fileName,
    recent,
    /** 교정 통계를 문서에 쌓는다. **서버로 보내지 않는다** — `.etp` 안에만 남는다 (PP§13.1) */
    addStats: (stats: ImportStats) =>
      setDoc((prev) => ({
        ...prev,
        manifest: { ...prev.manifest, stats: [...(prev.manifest.stats ?? []), stats] },
      })),
    quotaWarning,
    pendingOpen,
    /** D-01 의 세 갈래 */
    confirmOpenSave: async () => {
      setPendingOpen(false)
      await autosave.flush()
      await doOpen()
    },
    confirmOpenDiscard: async () => {
      setPendingOpen(false)
      await doOpen()
    },
    cancelOpen: () => setPendingOpen(false),
    dismissQuota: () => setQuotaWarning(null),
    readOnly,
    /** 공용 PC 정리가 끝났는가. **끝나기 전에 문항을 그리면 안 된다** */
    ready: wiped,
    conflict,
    saveFailed,
    locked,
    doc,
    openFile,
    save: async () => autosave.flush(),
    unlock: () => setLocked(false),
    dismissConflict: () => setConflict(null),
    dismissSaveError: () => setSaveFailed(false),
  }
}
