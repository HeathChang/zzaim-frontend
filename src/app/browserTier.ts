/** zz-0 D8 — 브라우저 등급 게이트.
 *
 *  대상은 **Chrome·Edge 뿐이다**(OD-01). 그 안에서 등급을 가르는 축은
 *  **폴더 접근 권한 하나**다. 브라우저만으로 정하면, 크롬에서 권한을 거부한
 *  사용자에게 «같은 파일에 이어서 저장됩니다»가 거짓말이 된다 (SS§13.1).
 *
 *  ⚠ «비대상»이라고 다운로드 폴백 코드를 지우면 안 된다 — 그 경로는
 *  **권한을 거부한 크롬 사용자**에게 여전히 필요하다. */

export type BrowserTier =
  /** Chrome·Edge + 폴더 권한 허용 → 같은 파일에 되쓰기 */
  | 'full'
  /** Chrome·Edge 인데 권한 거부 → 다운로드만 + 저장 상태 상시 강조 */
  | 'limited'
  /** Chrome·Edge 가 아니다 → 같은 경로를 타되 테스트·보장하지 않는다 */
  | 'unsupported'
  /** 조판 자체가 성립하지 않는다 → 진입 차단 */
  | 'blocked'

export type PermissionAxis = 'granted' | 'denied' | 'unknown'

export interface TierInput {
  userAgent: string
  hasFontsApi: boolean
  hasResizeObserver: boolean
  hasFileSystemAccess: boolean
  permission: PermissionAxis
}

/** Chrome·Edge 판별.
 *  Edge 의 UA 에는 `Edg/` 와 `Chrome/` 이 함께 들어 있고, Opera·Brave 등
 *  Chromium 파생도 `Chrome/` 을 넣는다. 여기서는 **크롬·엣지만** 대상으로 본다 —
 *  다른 Chromium 파생은 «비대상»으로 떨어지되 동작은 같은 경로를 탄다. */
export function isTargetBrowser(userAgent: string): boolean {
  const ua = userAgent
  if (/\bEdg\//.test(ua)) return true // Edge (Chromium)
  // 헤드리스 크롬은 **같은 엔진**이다. 대상에서 빼면 E2E 가 «비대상» 안내를
  // 만나 화면이 덮이고, 실제 크롬에서는 나지 않는 실패를 본다.
  if (/\bHeadlessChrome\//.test(ua)) return true
  if (!/\bChrome\//.test(ua)) return false
  // Chrome 을 사칭하는 파생들을 배제한다
  if (/\b(OPR|Opera|Brave|Vivaldi|SamsungBrowser|YaBrowser|Whale)\//i.test(ua)) return false
  // iOS 의 Chrome 은 WebKit 이라 조판이 다르다
  if (/\bCriOS\//.test(ua)) return false
  return true
}

/** 부팅 시 1회 수집한다. 권한 축만 런타임에 바뀐다.
 *
 *  ⚠ `'fonts' in document` 로 보지 않는다 — **속성이 있고 값이 `undefined`** 인
 *  경우가 있고(폴리필 잔재·계측 도구), 그때 `in` 은 참이라 차단을 그냥 통과한다.
 *  실제로 쓸 수 있는지를 물어야 한다. */
export function readEnvironment(win: Window = window): Omit<TierInput, 'permission'> {
  return {
    userAgent: win.navigator.userAgent,
    hasFontsApi: typeof win.document.fonts?.check === 'function',
    hasResizeObserver: typeof (win as Window & { ResizeObserver?: unknown }).ResizeObserver === 'function',
    hasFileSystemAccess: typeof win.showDirectoryPicker === 'function',
  }
}

export function decideTier(input: TierInput): BrowserTier {
  // 차단이 가장 먼저다 — 이 둘이 없으면 측정도 배치도 불가능하다 (SS§13.4)
  if (!input.hasFontsApi || !input.hasResizeObserver) return 'blocked'
  if (!isTargetBrowser(input.userAgent) || !input.hasFileSystemAccess) return 'unsupported'
  return input.permission === 'granted' ? 'full' : 'limited'
}


/** 저장 상태를 상시 강조해야 하는가 (SS§13.2).
 *  되쓰기가 안 되면 사용자가 «저장됐겠지»라고 믿는 것이 가장 위험하다. */
export function needsPersistentSaveWarning(tier: BrowserTier): boolean {
  return tier === 'limited' || tier === 'unsupported'
}
