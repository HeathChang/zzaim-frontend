/** zz-0 D10 — 단축키 중앙 등록.
 *
 *  규칙은 SS§1.5 하나다: «전역과 화면별이 충돌하면 화면별이 이긴다.
 *  단 `Esc` 와 저장은 예외로 항상 전역이 이긴다.»
 *
 *  1~4주에 사는 것은 **`Cmd/Ctrl+S` 와 `Esc` 둘뿐**이다 (PD-09 컷).
 *  나머지 7종은 5~9주에 이 등록기 위에 얹는다. */

export interface Shortcut {
  /** `KeyboardEvent.key` 를 소문자로. 예: 's' 'escape' '?' 'n' */
  key: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
  /** S-10 도움말이 읽는다. 없으면 목록에 키만 나오고 무슨 키인지 알 수 없다 */
  description?: string
  run(e: KeyboardEvent): void
  /** 입력칸에 포커스가 있어도 듣는가. **기본은 false.**
   *  `Esc`·저장은 이 값과 무관하게 언제나 듣는다 (SS§1.5 예외) */
  worksInInput?: boolean
}

/** 항상 전역이 이기는 키 (SS§1.5 예외) */
const ALWAYS_GLOBAL = new Set(['escape', 's'])

/** 입력 중에는 한 글자 키를 삼키지 않는다 (SS§11.3 · HO§키보드).
 *  삼키면 교사가 검색창에 «n» 을 못 친다. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  // 체크박스·라디오·버튼형 input 은 글자를 받지 않으므로 단축키를 막지 않는다
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type)
}

function matches(s: Shortcut, e: KeyboardEvent): boolean {
  if (s.key !== e.key.toLowerCase()) return false
  if (Boolean(s.meta) !== (e.metaKey || e.ctrlKey)) return false
  if (Boolean(s.shift) !== e.shiftKey) return false
  if (Boolean(s.alt) !== e.altKey) return false
  return true
}

export interface ShortcutRegistry {
  /** 전역 등록. 앱 수명 동안 산다 */
  registerGlobal(list: Shortcut[]): () => void
  /** 화면 진입 시 push, 이탈 시 반환된 함수로 pop */
  pushScreen(list: Shortcut[]): () => void
  /** 실제 핸들러. window 에 붙인다 */
  handle(e: KeyboardEvent): void
  /** S-10 도움말이 읽는다 — 현재 화면 것을 위에, 전역을 아래에 (SS§11.2) */
  snapshot(): { screen: Shortcut[]; global: Shortcut[] }
}

export function createShortcutRegistry(): ShortcutRegistry {
  let globals: Shortcut[] = []
  const screens: Shortcut[][] = []

  return {
    registerGlobal(list) {
      globals = [...globals, ...list]
      return () => {
        globals = globals.filter((s) => !list.includes(s))
      }
    },
    pushScreen(list) {
      screens.push(list)
      return () => {
        const i = screens.indexOf(list)
        if (i !== -1) screens.splice(i, 1)
      }
    },
    handle(e) {
      const inInput = isTextEntry(e.target)
      const key = e.key.toLowerCase()

      // 입력 중에 이 단축키를 실행해도 되는가.
      // `Esc`·저장은 **등록 시 무엇을 적었든** 항상 듣는다 — 그것이 SS§1.5 의 예외다.
      const allowed = (s: Shortcut) =>
        !inInput || ALWAYS_GLOBAL.has(s.key) || s.worksInInput === true

      // 1) 항상 전역이 이기는 키를 **먼저** 처리한다 — 화면이 가로채면 안 된다
      if (ALWAYS_GLOBAL.has(key)) {
        const g = globals.find((s) => matches(s, e))
        if (g && allowed(g)) {
          e.preventDefault()
          g.run(e)
          return
        }
      }

      // 2) 화면별이 전역을 이긴다. 가장 나중에 올라온 화면부터
      for (let i = screens.length - 1; i >= 0; i -= 1) {
        const list = screens[i]
        if (!list) continue
        const hit = list.find((s) => matches(s, e))
        if (hit && allowed(hit)) {
          e.preventDefault()
          hit.run(e)
          return
        }
      }

      // 3) 남은 전역
      const hit = globals.find((s) => matches(s, e))
      if (hit && allowed(hit)) {
        e.preventDefault()
        hit.run(e)
      }
    },
    snapshot: () => ({
      screen: screens.at(-1) ?? [],
      global: [...globals],
    }),
  }
}
