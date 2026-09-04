/** 저장소 권한과 용량.
 *
 *  **`storage.persist()` 에 의존하지 않는다** (PP§9.2 · zz-1 불변3).
 *  브라우저 재량이고 공용 PC 에서는 무의미하다. 안전망은 파일이다.
 *  그래서 **조용히 한 번 부르고 결과를 사용자에게 알리지 않는다** — 여기서
 *  권한 대화상자를 띄우면 «3분 안에 어? 되네» 목표를 첫 화면에서 잃는다 (SS§2.3). */

/** 용량 경고 임계. 넘으면 D-07 로 «파일로 내보내기»를 권한다 (SS§10) */
export const QUOTA_WARN_RATIO = 0.8

export interface StorageStatus {
  persisted: boolean
  usage: number
  quota: number
  ratio: number
  shouldWarn: boolean
}

export async function requestPersistence(
  storage: StorageManager | undefined = navigator.storage,
): Promise<boolean> {
  if (!storage?.persist) return false
  try {
    return await storage.persist()
  } catch {
    // 거부돼도 잃는 것이 없다 — 정본은 파일이다
    return false
  }
}

export async function readStorageStatus(
  storage: StorageManager | undefined = navigator.storage,
): Promise<StorageStatus> {
  const empty: StorageStatus = {
    persisted: false,
    usage: 0,
    quota: 0,
    ratio: 0,
    shouldWarn: false,
  }
  if (!storage?.estimate) return empty
  try {
    const { usage = 0, quota = 0 } = await storage.estimate()
    const persisted = (await storage.persisted?.()) ?? false
    const ratio = quota > 0 ? usage / quota : 0
    return { persisted, usage, quota, ratio, shouldWarn: ratio >= QUOTA_WARN_RATIO }
  } catch {
    return empty
  }
}
