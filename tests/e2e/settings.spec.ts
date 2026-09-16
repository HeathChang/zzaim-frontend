/** zz-8 S-05 레이아웃 설정 — **바꾸면 지면이 실제로 달라지는가.**
 *
 *  이 화면의 전부는 «즉시 반영»이다(불변1). 적용 버튼이 없으므로,
 *  값이 바뀌었는데 지면이 그대로면 사용자는 고장으로 본다. */
import { expect, test, type Page } from '@playwright/test'
import { openPaper } from './helpers'

async function openSettings(page: Page) {
  await page.getByRole('button', { name: '설정', exact: true }).click()
  await expect(page.locator('[data-panel="settings"]')).toBeVisible()
}

const sheetBox = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('.zz-sheet') as HTMLElement
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  })

test.beforeEach(async ({ page }: { page: Page }) => {
  await openPaper(page)
})

test('설정을 열면 지면이 가려지지 않고 배율이 유지된다 (불변2)', async ({ page }) => {
  const before = await sheetBox(page)
  await openSettings(page)
  await expect(page.locator('.zz-sheet').first()).toBeVisible()
  expect(await sheetBox(page)).toEqual(before)
})

test('★ 용지를 B4 로 바꾸면 지면 치수가 즉시 달라진다 — 적용 버튼이 없다 (불변1)', async ({
  page,
}) => {
  await openSettings(page)
  const before = await sheetBox(page)
  await page.getByLabel('용지 크기').selectOption('B4')
  await expect.poll(async () => (await sheetBox(page)).w).toBeGreaterThan(before.w)
})

test('★ 가로로 돌리면 폭과 높이가 뒤바뀐다 (D1)', async ({ page }) => {
  await openSettings(page)
  const before = await sheetBox(page)
  await page.getByLabel('방향').selectOption('landscape')
  await expect.poll(async () => (await sheetBox(page)).w).toBe(before.h)
  expect((await sheetBox(page)).h).toBe(before.w)
})

test('★ 양면을 켜면 여백 라벨이 «안쪽/바깥쪽» 이 된다 (D1)', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByLabel('왼쪽')).toBeVisible()
  await page.getByLabel('양면 인쇄').check()
  await expect(page.getByLabel('안쪽')).toBeVisible()
  await expect(page.getByLabel('바깥쪽')).toBeVisible()
})

test('★ 여백을 최대로 밀어도 단 폭이 40mm 아래로 안 내려간다 — 상한이 움직인다 (D2)', async ({
  page,
}) => {
  await openSettings(page)
  const inner = page.getByLabel('왼쪽')
  const outer = page.getByLabel('오른쪽')
  // 슬라이더가 허용하는 최대치까지 민다
  for (const slider of [inner, outer]) {
    await slider.focus()
    for (let i = 0; i < 80; i += 1) await page.keyboard.press('ArrowRight')
  }
  const colW = await page.evaluate(() => {
    const col = document.querySelector('.zz-sheet [data-column]') as HTMLElement
    return col.getBoundingClientRect().width / 3.7795275591
  })
  expect(colW).toBeGreaterThanOrEqual(39.5)
})

test('단이 1개면 단 사이 간격을 못 만진다 — 나눌 것이 없다', async ({ page }) => {
  await openSettings(page)
  await page.getByLabel('단 개수').selectOption('1')
  await expect(page.getByLabel('단 사이', { exact: true })).toBeDisabled()
})

test('★ 쪽수가 바뀌면 소리 내어 알린다 (D7)', async ({ page }) => {
  await openSettings(page)
  // ⚠ 상태바에도 `aria-live` 가 있다. **설정 패널 안의 것**을 봐야 한다
  const live = page.locator('[data-panel="settings"] [aria-live="polite"]')
  const before = await page.locator('.zz-sheet').count()
  // 2단 → 1단이면 쪽이 반드시 늘어난다
  await page.getByLabel('단 개수').selectOption('1')
  await expect(live).toContainText(`${before} → `, { timeout: 5000 })
  await expect(live).toContainText('쪽')
})

test('★ 글자 크기를 키우면 지면 글자가 실제로 커진다 — 슬라이더가 놀지 않는다 (D3)', async ({
  page,
}) => {
  await openSettings(page)
  const size = () =>
    page.evaluate(() => getComputedStyle(document.querySelector('.zz-sheet')!).fontSize)
  const before = await size()
  const font = page.getByLabel('글자 크기')
  await font.focus()
  // ⚠ 좌우 방향키로도 움직인다. 위/아래만 처리하면 여기서 값이 영영 반영되지 않는다
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight')
  await expect.poll(size).not.toBe(before)
  expect(await font.inputValue()).toBe('115')
})

test('편집 패널을 열면 설정 패널이 닫힌다 (불변4)', async ({ page }) => {
  await openSettings(page)
  const panel = page.locator('[data-panel="edit"]')
  for (let i = 0; i < 8 && !(await panel.isVisible()); i += 1) {
    await page.keyboard.press('e')
    if (await panel.isVisible()) break
    await page.keyboard.press('ArrowDown')
  }
  await expect(panel).toBeVisible()
  await expect(page.locator('[data-panel="settings"]')).toHaveCount(0)
})

test('Esc 로 설정을 닫는다 (D5)', async ({ page }) => {
  await openSettings(page)
  await page.getByLabel('용지 크기').focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-panel="settings"]')).toHaveCount(0)
})

test('★ 배점 일괄 «균등» 이 총점을 목표에 맞춘다 (D4)', async ({ page }) => {
  await openSettings(page)
  await page.getByRole('button', { name: '균등' }).click()
  await expect(page.locator('footer')).toContainText('100/100점')
})

test('★ 난이도가 없으면 «난이도별» 을 잠그고 사유를 말한다 (PD-04)', async ({ page }) => {
  await openSettings(page)
  const btn = page.getByRole('button', { name: '난이도별' })
  await expect(btn).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('#bulk-missing')).toContainText('난이도가 없는 문항')
})

test('★ 설정을 바꾸고 Cmd+Z 로 되돌린다 (D3)', async ({ page }) => {
  await openSettings(page)
  const before = await sheetBox(page)
  await page.getByLabel('용지 크기').selectOption('B4')
  await expect.poll(async () => (await sheetBox(page)).w).toBeGreaterThan(before.w)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(async () => (await sheetBox(page)).w).toBe(before.w)
})

test('그룹마다 이름이 있어 탭으로 옮길 때 어디인지 알 수 있다 (D5)', async ({ page }) => {
  await openSettings(page)
  const panel = page.locator('[data-panel="settings"]')
  for (const name of ['용지', '단', '여백', '글자', '마무리']) {
    await expect(panel.getByRole('region', { name, includeHidden: false })).toHaveCount(1)
  }
})

test('★ Shift+↑ 는 10단위로 움직인다 (D5)', async ({ page }) => {
  await openSettings(page)
  const top = page.getByLabel('위')
  await top.focus()
  const before = Number(await top.inputValue())
  await page.keyboard.press('ArrowUp')
  expect(Number(await top.inputValue())).toBe(before + 1)
  await page.keyboard.press('Shift+ArrowUp')
  expect(Number(await top.inputValue())).toBe(before + 11)
})

test('★ 양면을 켜면 짝수 쪽 여백이 뒤집힌다 (zz-6 D7)', async ({ page }) => {
  await openSettings(page)
  // 안쪽 20 · 바깥쪽 15 이므로 홀수 쪽은 왼쪽이 더 넓다
  const padding = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.zz-sheet')].slice(0, 2).map((el) => {
        const cs = getComputedStyle(el as HTMLElement)
        return `${Math.round(parseFloat(cs.paddingLeft))}/${Math.round(parseFloat(cs.paddingRight))}`
      }),
    )
  const before = await padding()
  // 단면에서는 모든 쪽이 같다
  expect(before[0]).toBe(before[1])

  await page.getByLabel('양면 인쇄').check()
  await expect
    .poll(async () => {
      const after = await padding()
      return after[0] === after[1]
    })
    .toBe(false)
  const after = await padding()
  // 짝수 쪽은 좌우가 뒤집힌 값이다
  expect(after[1]).toBe(after[0]!.split('/').reverse().join('/'))
})
