/** 실제 브라우저에서만 확인되는 것들. jsdom 은 레이아웃을 계산하지 않는다. */
import { expect, test } from '@playwright/test'

test.describe('앱 셸 골격 (SS§1.1 · SS부록D)', () => {
  test('1280px 에서 헤더 40 · 상태바 32 로 그려진다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    const header = page.locator('header')
    const footer = page.locator('footer')
    await expect(header).toBeVisible()
    expect((await header.boundingBox())?.height).toBe(40)
    expect((await footer.boundingBox())?.height).toBe(32)
  })

  test('지면 폭의 전제 — 1280 에서 좌패널 320 을 빼도 A4 794px 가 들어간다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    const main = page.locator('main')
    const width = (await main.boundingBox())?.width ?? 0
    // SS§6.3 «배율 규칙» 이 서 있는 근거를 실제 렌더로 확인한다
    expect(width).toBeGreaterThanOrEqual(794)
  })
})

test.describe('지원 등급 (OD-01 · SS§13)', () => {
  test('조판이 불가능하면 진입을 막는다', async ({ page }) => {
    // document.fonts 를 지운 채로 앱을 띄운다
    await page.addInitScript(() => {
      Object.defineProperty(document, 'fonts', { value: undefined, configurable: true })
    })
    await page.goto('/')
    await expect(page.getByText('크롬 또는 엣지로 열어 주세요.')).toBeVisible()
  })
})
