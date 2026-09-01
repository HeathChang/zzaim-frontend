/** 지면 폰트 단계 폴백을 **실제로 돌리는 곳** (zz-0 D7).
 *
 *  ★ 이 파일이 없어서 3단계 폰트 전략이 통째로 죽어 있었다.
 *  `fontFallback.ts` 도 `fontCoverage.ts` 도 자산(`coverage.json`·한자본·전체본)도
 *  다 있었는데 **부르는 코드가 없었다.** 결과: 한자가 든 시험지를 열면 한자본을
 *  영영 받지 못하고 글자가 깨진 채로 그려진다 — 그런데 화면은 «폰트 준비됨»이라
 *  말한다. 첫 진입을 1.16MB 로 줄인 이유가 바로 이 폴백인데, 그 대가만 치르고
 *  이득은 못 받고 있던 셈이다.
 *
 *  스택을 바꾸는 방법은 **CSS 변수 교체**다 — 지면(`sheet.css`)과 측정기가 모두
 *  `--font-paper` 를 보므로, 한 곳만 바꾸면 둘이 함께 움직인다. 둘이 갈라지면
 *  측정과 렌더가 어긋나 조판의 전제가 무너진다. */
import { useCallback, useRef } from 'react'
import { visibleTextOf } from '@/app/fontCoverage'
import {
  createPaperFontController,
  loadCoverageTable,
  type PaperFontController,
} from '@/app/fontFallback'

export const PAPER_FONT_VAR = '--font-paper'

export function usePaperFont(doc: Document = document) {
  const controller = useRef<PaperFontController | null>(null)
  const failed = useRef(false)

  /** 이 지면을 그릴 수 있는지 보고, 모자라면 필요한 만큼만 받는다.
   *  @returns 스택이 바뀌었으면 true — 호출자는 다시 재야 한다 */
  return useCallback(
    async (html: string): Promise<boolean> => {
      // 표를 한 번 못 받았으면 다시 시도하지 않는다 — 매 렌더마다 실패하는
      // 네트워크 요청을 쌓는 것이 폰트가 조금 어긋나는 것보다 나쁘다
      if (failed.current) return false
      if (!controller.current) {
        try {
          controller.current = createPaperFontController(await loadCoverageTable(), doc)
        } catch {
          failed.current = true
          return false
        }
      }
      // ⚠ 태그를 빼고 **보이는 글자만** 센다. HTML 을 그대로 넘기면 태그 이름이
      // 글자로 잡혀 «없는 글자»가 늘 0이 아니게 된다
      const changed = await controller.current.ensureFor(visibleTextOf(html, doc))
      if (changed) {
        doc.documentElement.style.setProperty(PAPER_FONT_VAR, controller.current.stack())
      }
      return changed
    },
    [doc],
  )
}
