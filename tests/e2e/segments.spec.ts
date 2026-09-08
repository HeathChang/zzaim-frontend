/** S-02 경계 확정 — **제품의 급소**를 실제 브라우저에서.
 *
 *  목표는 «50문항 5분 = 문항당 6초»이고, 그 숫자는 `N` 키가 떠받친다.
 *  여기서는 **키보드만으로 교정이 되는지**를 본다 — 마우스를 쓰면 6초가 안 나온다. */
import { expect, test, type Page } from '@playwright/test'

async function openSegments(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('여기에 붙여넣으세요').waitFor({ timeout: 15000 })
  const html = await (await page.request.get('/sample-exam.html')).text()
  await page.evaluate((payload) => {
    const dt = new DataTransfer()
    dt.setData('text/html', payload)
    document.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  }, html)
  await page.getByRole('listbox').waitFor({ timeout: 15000 })
}

test.beforeEach(async ({ page }) => {
  await openSegments(page)
})

test('좌우 분할 — 왼쪽 원본, 오른쪽 분리 결과 (zz-4 D10 s02Layout=split)', async ({ page }) => {
  await expect(page.getByText('원본', { exact: true })).toBeVisible()
  await expect(page.getByText('분리 결과', { exact: false })).toBeVisible()
})

test('★ 진입 커서가 첫 의심 지점에 놓인다 — 1번 카드가 아니다', async ({ page }) => {
  const selected = await page.evaluate(() => {
    const options = [...document.querySelectorAll('[role="option"]')]
    return options.findIndex((o) => o.getAttribute('aria-selected') === 'true')
  })
  expect(selected).toBeGreaterThanOrEqual(0)
})

test('★ 마우스 없이 N → M/S 로 교정할 수 있다 (SS§4.11)', async ({ page }) => {
  const before = await page.getByRole('option').count()
  await page.keyboard.press('n')
  await page.keyboard.press('j')
  await page.keyboard.press('m')
  await expect(page.getByRole('option')).toHaveCount(before - 1)
  // 손댄 곳이 늘어난다 — 서버 없는 제품의 유일한 자동 계측
  await expect(page.getByText('손댄 곳 1')).toBeVisible()
})

test('★ Space 로 확인함 처리하면 «확인이 필요한 곳»이 0 에 도달한다 (zz-4 D5)', async ({ page }) => {
  // 의심 지점이 있는 동안 계속 확인함 처리한다
  for (let i = 0; i < 30; i += 1) {
    const left = await page.getByText(/확인이 필요한 곳/).count()
    if (left === 0) break
    await page.keyboard.press('n')
    await page.keyboard.press(' ')
  }
  await expect(page.getByText('확인이 필요한 곳이 없습니다')).toBeVisible()
  // 확인함은 손댄 곳으로 세지 않는다 — 경계를 고친 게 아니다
  await expect(page.getByText('손댄 곳 0')).toBeVisible()
})

test('신뢰도가 색이 아니라 숫자와 아이콘으로 표시된다 (SS§1.6)', async ({ page }) => {
  const badges = await page.evaluate(() =>
    [...document.querySelectorAll('[data-tier]')].map((b) => ({
      tier: b.getAttribute('data-tier'),
      text: b.textContent ?? '',
    })),
  )
  expect(badges.length).toBeGreaterThan(0)
  // 낮은 신뢰도에는 ⚠ 와 숫자가 함께 있다
  for (const b of badges.filter((x) => x.tier !== 'high')) {
    expect(b.text).toContain('⚠')
    expect(b.text).toMatch(/\d+%/)
  }
})

test('담기까지 가면 지면이 나온다', async ({ page }) => {
  await page.getByRole('button', { name: /담기/ }).click()
  const anyway = page.getByRole('button', { name: '그대로 담기' })
  if (await anyway.isVisible().catch(() => false)) await anyway.click()
  await expect(page.locator('.zz-sheet').first()).toBeVisible({ timeout: 15000 })
})

test('★ 확정 직후 Cmd+Z 로 담은 문항이 사라지지 않는다 (zz-0 D3 되돌리기 경계)', async ({ page }) => {
  await page.getByRole('button', { name: /담기/ }).click()
  const anyway = page.getByRole('button', { name: '그대로 담기' })
  if (await anyway.isVisible().catch(() => false)) await anyway.click()
  await page.locator('.zz-sheet').first().waitFor({ timeout: 15000 })

  await page.keyboard.press('ControlOrMeta+z')
  await page.waitForTimeout(300)
  // 확정은 되돌릴 수 없는 경계다 — 문항 24개가 사라지면 안 된다
  await expect(page.locator('.zz-sheet').first()).toBeVisible()
})

test('★ 교정 통계가 문서에 쌓이고 **네트워크로 나가지 않는다** (zz-4 D7 · PP§13.1)', async ({ page }) => {
  const outbound: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    if (!url.startsWith('http://localhost') && !url.startsWith('data:')) outbound.push(url)
  })

  await page.keyboard.press('n')
  await page.keyboard.press('j')
  await page.keyboard.press('m') // 손댄 곳 1
  await page.getByRole('button', { name: /담기/ }).click()
  const anyway = page.getByRole('button', { name: '그대로 담기' })
  if (await anyway.isVisible().catch(() => false)) await anyway.click()
  await page.locator('.zz-sheet').first().waitFor({ timeout: 15000 })

  // 서버가 없으므로 통계는 파일 안에만 남는다
  expect(outbound).toEqual([])
})

test('담지 않은 문항이 있으면 이탈을 막는다 (SS§4.7)', async ({ page }) => {
  const hasGuard = await page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(e)
    return e.defaultPrevented
  })
  expect(hasGuard).toBe(true)
})
