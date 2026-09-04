/** 디렉토리 권한 — **원자적 쓰기의 전제**다 (zz-1 D8).
 *
 *  파일 하나만으로는 임시 파일·백업을 만들 수 없어 저장 중 죽으면 정본이 잘린다.
 *  그래서 파일을 열 때 **디렉토리 권한을 함께 요청**하고, 거부하면
 *  **제한 등급으로 강등**해 다운로드 방식으로 저장한다.
 *
 *  ⚠ 강등은 «브라우저 탓»이 아니다. 문구가 달라야 한다 (SS§13.3 권한 거부 블록). */
import type { PermissionAxis } from '@/app/browserTier'

export type PermissionState = 'granted' | 'denied' | 'prompt'

export interface DirectoryHandleLike {
  queryPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

/** 이미 가진 권한을 **묻기만** 한다. 사용자 제스처 없이 요청하면 거부된다. */
export async function queryWritePermission(
  handle: DirectoryHandleLike | null,
): Promise<PermissionAxis> {
  if (!handle?.queryPermission) return 'unknown'
  try {
    const state = await handle.queryPermission({ mode: 'readwrite' })
    return state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'unknown'
  } catch {
    return 'unknown'
  }
}

/** **사용자 행동에 이어서만** 부른다 (SS§2.3 «사용자의 행동에 이어진 요청만 이해된다») */
export async function requestWritePermission(
  handle: DirectoryHandleLike | null,
): Promise<PermissionAxis> {
  if (!handle?.requestPermission) return 'unknown'
  try {
    const state = await handle.requestPermission({ mode: 'readwrite' })
    return state === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** 권한이 없으면 원자적 쓰기가 **불가능**하다 — 그 사실을 이름으로 남긴다 */
export function canWriteAtomically(permission: PermissionAxis): boolean {
  return permission === 'granted'
}
