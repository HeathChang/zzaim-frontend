/** 공용 PC 모드 — 출제 중인 문항이 교무실 PC 에 남지 않게 한다 (PP§5.4).
 *
 *  ## 왜 «탭 닫을 때»가 아니라 «다음에 열 때»인가
 *  `unload` 에서의 IndexedDB 삭제는 **브라우저가 보장하지 않는다.** 탭이 그냥
 *  죽거나 배터리가 나가면 삭제가 실행되지 않고, 그러면 문항이 그대로 남는다.
 *  «지웠다고 믿게 하는 것»이 «안 지우는 것»보다 나쁘다.
 *
 *  그래서 **세션 플래그를 남기고 다음 부팅 시작 시 정리**한다. 이것이 유일하게
 *  확실한 방법이다 (zz-1 D6 · SS§9.3). */

const FLAG_KEY = 'zzaim.publicPc.pendingWipe'

export interface FlagStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** 플래그는 **`localStorage`** 에 둔다 — 탭이 죽어도 남아야 하기 때문이다.
 *  `sessionStorage` 는 탭과 함께 사라져서 다음 부팅에 알 방법이 없다. */
function store(custom?: FlagStore): FlagStore | null {
  if (custom) return custom
  try {
    return window.localStorage
  } catch {
    // 시크릿 모드나 저장소 차단. 플래그를 못 남기면 정리도 못 한다
    return null
  }
}

/** 공용 PC 모드를 켠다 — «다음에 열 때 지운다»고 예약하는 것이다 */
export function markForWipe(custom?: FlagStore): void {
  store(custom)?.setItem(FLAG_KEY, '1')
}

export function unmark(custom?: FlagStore): void {
  store(custom)?.removeItem(FLAG_KEY)
}

export function isMarked(custom?: FlagStore): boolean {
  return store(custom)?.getItem(FLAG_KEY) === '1'
}

/** 부팅 **시작 시점**에 부른다. 화면을 그리기 전이어야 한다 —
 *  지우기 전에 문항이 보이면 공용 PC 모드가 의미를 잃는다. */
export async function wipeIfMarked(
  wipe: () => Promise<void>,
  custom?: FlagStore,
): Promise<boolean> {
  if (!isMarked(custom)) return false
  await wipe()
  unmark(custom)
  return true
}
