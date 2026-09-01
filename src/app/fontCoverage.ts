/** zz-0 D7 폴백 — 서브셋 밖 글자를 만나면 전체본을 추가로 받는다.
 *
 *  왜 필요한가: 한글 풀셋 5벌은 벌당 수 MB라 첫 진입을 망친다. 그래서
 *  KS X 1001 2,350자 + 상용 한자로 서브셋한다(PD-10). 그런데 고전 한자·희귀자가
 *  든 시험지를 만나면 **시스템 폰트로 떨어지고 측정이 어긋난다** — 조판이 통째로
 *  틀어진다. 폴백이 없으면 서브셋은 «가끔 조판이 깨지는» 최적화가 된다. */

/** KS X 1001 한글 음절 2,350자의 판정.
 *  완성형 한글 음절 전체(U+AC00–U+D7A3, 11,172자) 중 KS X 1001 에 든 것은
 *  2,350자뿐이다. 표를 코드에 박지 않고, **서브셋 빌드 산출물이 내보낸 목록**을
 *  읽는다 — 두 곳에 같은 목록을 두면 반드시 어긋난다. */
export interface CoverageTable {
  /** 서브셋에 실제로 포함된 코드포인트 */
  codepoints: ReadonlySet<number>
}

export interface CoverageResult {
  covered: boolean
  /** 서브셋 밖 글자. 진단·로그용이며 최대 `sampleLimit` 개만 담는다 */
  missing: string[]
  missingCount: number
}

const SAMPLE_LIMIT = 20

/** 항상 있는 것으로 보는 문자 — 공백·제어문자·기본 라틴.
 *  이걸 «없음»으로 세면 모든 문서가 전체본을 받게 된다. */
function isAlwaysAvailable(cp: number): boolean {
  return cp <= 0x00ff
}

/** 텍스트가 서브셋 안에 전부 들어가는지 본다.
 *  **코드포인트 단위로 순회**한다 — `for...of` 는 서로게이트 쌍을 하나로 다룬다.
 *  한자 확장 B 이상(U+20000~)이 여기 걸리는데, 그게 정확히 «희귀자»다. */
export function checkCoverage(text: string, table: CoverageTable): CoverageResult {
  const missing = new Set<string>()
  let missingCount = 0

  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp === undefined || isAlwaysAvailable(cp)) continue
    if (table.codepoints.has(cp)) continue
    missingCount += 1
    if (missing.size < SAMPLE_LIMIT) missing.add(ch)
  }

  return { covered: missingCount === 0, missing: [...missing], missingCount }
}

/** HTML 본문에서 **화면에 보이는 글자만** 뽑는다.
 *  태그·속성까지 세면 서브셋 밖 글자가 없는데도 전체본을 받게 된다. */
export function visibleTextOf(html: string, doc: Document = document): string {
  const el = doc.createElement('div')
  // 여기서는 DOM 에 붙이지 않으므로 스크립트가 실행되지 않는다.
  // 붙여넣기 정제(DOMPurify)는 zz-3 이 담당한다.
  el.innerHTML = html
  return el.textContent ?? ''
}

export type FullFontLoader = () => Promise<void>

/** 전체본 로드를 **한 번만** 돌린다. 문항마다 부르면 같은 요청이 수십 번 나간다. */
export function createFullFontGate(load: FullFontLoader) {
  let inflight: Promise<void> | null = null
  let loaded = false

  return {
    get loaded() {
      return loaded
    },
    async ensure(): Promise<void> {
      if (loaded) return
      inflight ??= load().then(
        () => {
          loaded = true
          inflight = null
        },
        (err: unknown) => {
          inflight = null // 실패하면 다음 시도를 허용한다
          throw err
        },
      )
      return inflight
    },
  }
}
