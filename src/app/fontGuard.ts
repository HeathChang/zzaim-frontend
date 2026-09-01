/** 폰트가 실제로 로드됐는지 확인한다.
 *
 *  이게 왜 필요한가: `@font-face` 가 404 여도 브라우저는 **조용히 시스템 폰트로
 *  떨어진다.** 그러면 줄바꿈이 달라지고 측정이 어긋나 조판이 전부 틀어진다 —
 *  «인쇄하면 화면 그대로»가 깨진 줄도 모른 채 깨진다 (zz-0 D7 · PP§6.4).
 *
 *  개발 빌드에서 크게 경고하고, 조판 엔진(zz-2)은 `fontsReady` 를 보고 지면을
 *  그릴지 정한다. */

/** 지면 조판이 걸린 폰트. UI 폰트는 틀어져도 인쇄물이 바뀌지 않는다. */
export const CRITICAL_FACES = ['Noto Serif KR'] as const

export interface FontCheckResult {
  ready: boolean
  missing: string[]
}

/** 확인용 표본 글자 — U+AC00 «가», 한글 음절의 첫 글자.
 *  문자 그대로 쓰지 않고 코드포인트로 두는 이유: 이건 **사용자에게 보이는 문구가
 *  아니라 데이터**라서 문구 사전(strings.ts)에 올릴 것이 아니다. */
export const HANGUL_PROBE = String.fromCodePoint(0xac00)

/** `document.fonts.check()` 는 «이 폰트로 이 글자를 그릴 수 있나»를 답한다.
 *  한글 글자를 함께 물어야 한다 — 라틴만 물으면 한글이 빠진 서브셋도 통과한다. */
export async function checkCriticalFonts(
  doc: Document = document,
  sample: string = HANGUL_PROBE,
): Promise<FontCheckResult> {
  // `document.fonts` 자체가 없는 브라우저가 있다 — 그건 차단 대상이지만(SS§13.4),
  // 여기서 던지면 **처리되지 않은 거부**가 되어 차단 화면조차 못 그린다.
  if (!doc.fonts) return { ready: false, missing: [...CRITICAL_FACES] }

  // ⚠ **먼저 로드를 시켜야 한다.** `check()` 는 «지금 쓸 수 있나»를 답할 뿐
  // 다운로드를 시작하지 않는다. 그런데 폰트를 쓰는 요소는 지면뿐이고, 지면은
  // 폰트가 준비돼야 그린다 — 그냥 기다리면 **아무도 폰트를 요청하지 않아
  // 영원히 준비되지 않는다.** 실제로 이 교착이 브라우저에서 재현됐다.
  await Promise.all(
    CRITICAL_FACES.map((family) =>
      doc.fonts.load(`16px "${family}"`, sample).catch(() => []),
    ),
  )
  await doc.fonts.ready

  const missing = CRITICAL_FACES.filter((family) => !doc.fonts.check(`16px "${family}"`, sample))
  return { ready: missing.length === 0, missing }
}

/** 개발 빌드에서만 시끄럽게 운다. 운영에서는 조용히 상태만 넘긴다. */
export function warnIfMissing(result: FontCheckResult, isDev: boolean): void {
  if (result.ready || !isDev) return
  // 개발자 콘솔용 진단 — UI 문구가 아니므로 문구 사전 대상이 아니다 (main.tsx 와 같은 기준)
  console.error(
    [
      `[zzaim] paper font not loaded: ${result.missing.join(', ')}`,
      '  Falling back to a system font changes line breaking, which breaks layout.',
      '  Run `npm run fonts:subset` to populate public/fonts/ (zz-0 D7).',
    ].join('\n'),
  )
}
