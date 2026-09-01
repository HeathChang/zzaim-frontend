/** zz-0 D7 폴백의 **실행부**. `fontCoverage.ts` 가 «없다»고 판정한 뒤 여기가 받는다.
 *
 *  ## 왜 3단계인가 — 실측이 정했다 (2026-08-29, Noto Serif KR 400)
 *  | 무엇 | 크기 |
 *  | --- | --- |
 *  | 기호+한글 2,350자 | **336 KB** |
 *  | 한자 4,888자 | 894 KB |
 *  | 전체 | 3,033 KB |
 *
 *  한자를 기본에 넣으면 첫 진입이 **4배**가 된다. 그런데 MVP 대상 과목
 *  (국어·영어·사회)의 본문은 대부분 한자가 없다. 그래서 한자는 **나올 때만** 받고,
 *  그마저도 벗어나는 글자(고전 한자·희귀자)에서만 전체본까지 간다.
 *
 *  ## 왜 `font-family` 이름을 나누는가
 *  같은 이름으로 여러 벌을 선언하면 브라우저가 둘을 합치고 **어느 쪽으로 그릴지
 *  통제할 수 없다.** 통제 못 하면 측정이 어긋난다. 이름을 나누고 **스택을 바꿔 끼운다** —
 *  브라우저는 글자마다 스택에서 그 글자를 가진 첫 폰트를 고른다. */

import { checkCoverage, createFullFontGate, type CoverageTable } from '@/app/fontCoverage'

const BASE_STACK = '"Noto Serif KR", serif'
const HANJA_STACK = '"Noto Serif KR", "Noto Serif KR Hanja", serif'
const FULL_STACK = '"Noto Serif KR", "Noto Serif KR Hanja", "Noto Serif KR Full", serif'

export type FontTier = 'base' | 'hanja' | 'full'

const STACK: Record<FontTier, string> = {
  base: BASE_STACK,
  hanja: HANJA_STACK,
  full: FULL_STACK,
}

export interface PaperCoverage extends CoverageTable {
  /** 한자본이 담고 있는 글자 */
  hanja: ReadonlySet<number>
}

let cached: PaperCoverage | null = null

/** 서브셋에 무엇이 들어 있는지는 **빌드 산출물이 유일한 출처**다.
 *  코드에 목록을 박으면 서브셋을 바꿀 때 조용히 어긋난다 (subset-fonts.mjs). */
export async function loadCoverageTable(
  fetchImpl: typeof fetch = fetch,
  url = '/fonts/coverage.json',
): Promise<PaperCoverage> {
  if (cached) return cached
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`coverage table ${res.status}`)
  const json = (await res.json()) as { codepoints: number[]; hanja?: number[] }
  cached = {
    codepoints: new Set(json.codepoints),
    hanja: new Set(json.hanja ?? []),
  }
  return cached
}

/** 테스트가 상태를 씻어낼 수 있게 둔다 — 모듈 수준 캐시는 테스트 간에 샌다 */
export function resetCoverageCache(): void {
  cached = null
}

/** 서브셋 밖 글자들이 **전부 한자본 안에** 있는가.
 *  하나라도 벗어나면 전체본까지 가야 한다. */
export function tierFor(missing: readonly string[], table: PaperCoverage): FontTier {
  if (missing.length === 0) return 'base'
  return missing.every((ch) => table.hanja.has(ch.codePointAt(0) ?? -1)) ? 'hanja' : 'full'
}

async function loadFaces(doc: Document, family: string): Promise<void> {
  await Promise.all([
    doc.fonts.load(`400 16px "${family}"`),
    doc.fonts.load(`600 16px "${family}"`),
  ])
}

export interface PaperFontController {
  /** 지면에 실제로 걸 폰트 스택 */
  stack(): string
  tier(): FontTier
  /** 이 텍스트를 그릴 수 있는지 확인하고, 없으면 필요한 만큼만 받는다.
   *  @returns 스택이 바뀌었으면 true — 호출자는 **재측정**해야 한다 */
  ensureFor(text: string): Promise<boolean>
}

const RANK: Record<FontTier, number> = { base: 0, hanja: 1, full: 2 }

export function createPaperFontController(
  table: PaperCoverage,
  doc: Document = document,
): PaperFontController {
  let tier: FontTier = 'base'
  const gates = {
    hanja: createFullFontGate(() => loadFaces(doc, 'Noto Serif KR Hanja')),
    full: createFullFontGate(() => loadFaces(doc, 'Noto Serif KR Full')),
  }

  return {
    stack: () => STACK[tier],
    tier: () => tier,
    async ensureFor(text) {
      // 이미 받은 단계 안에서 해결되는지부터 본다 — 매번 전체 텍스트를 훑지만
      // 문자 순회는 싸고, 잘못 판단하면 조판이 깨진다
      const { missing } = checkCoverage(text, table)
      const needed = tierFor(missing, table)
      if (RANK[needed] <= RANK[tier]) return false

      if (needed === 'hanja') await gates.hanja.ensure()
      else {
        // 전체본은 한자본을 포함하므로 한자본을 따로 받지 않는다
        await gates.full.ensure()
      }
      tier = needed
      return true
    },
  }
}
