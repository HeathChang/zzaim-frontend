/** 접근성 자동 검사 — «명도 대비 WCAG 2.1 AA»(PP§10)를 **주장이 아니라 스캔**으로.
 *
 *  단위 테스트의 대비 계산은 토큰 조합만 본다. 실제로 그려진 화면에서 어떤 조합이
 *  쓰였는지는 브라우저에서만 알 수 있다 — 그래서 여기서 한 번 더 훑는다. */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openPaper } from './helpers'

test.beforeEach(async ({ page }) => {
  await openPaper(page)
})

test('앱 화면에 심각한 접근성 위반이 없다', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  // 실패하면 무엇이 걸렸는지 바로 보이게 남긴다
  expect(
    serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}곳)`),
    JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })), null, 2),
  ).toEqual([])
})

test('명도 대비 위반이 0건이다 — 계산이 아니라 실제 렌더에서', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
  expect(results.violations).toEqual([])
})

test('잠금 화면도 접근성 위반이 없다 — 여기서 막히면 빠져나갈 수 없다', async ({ page }) => {
  // 잠금은 화면 전체를 덮으므로 여기가 막히면 사용자가 갇힌다
  const results = await new AxeBuilder({ page }).include('body').withTags(['wcag2a']).analyze()
  expect(results.violations.filter((v) => v.impact === 'critical')).toEqual([])
})
