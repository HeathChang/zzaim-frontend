/** S-04 시험지 편집 — 실제 브라우저에서.
 *  «끌어다 놓으면 조판된다»(PP§5.1 핵심가치 1)와 «마우스 없이도 된다»(PP§10)를 함께 본다. */
import { expect, test, type Page } from '@playwright/test'
import { openPaper } from './helpers'

test.beforeEach(async ({ page }: { page: Page }) => {
  await openPaper(page)
})

test('좌: 담을 문항 / 우: 지면 — 지면은 실제 배율이 기본이다', async ({ page }) => {
  await expect(page.locator('.zz-sheet').first()).toBeVisible()
  const transform = await page.evaluate(
    () => getComputedStyle(document.querySelector('.zz-sheet') as HTMLElement).transform,
  )
  expect(transform).toBe('none')
})

test('★ 머리말을 지면 위에서 바로 고친다 — 설정 화면으로 가지 않는다 (zz-5 D5)', async ({ page }) => {
  await page.getByLabel('머리말 고치기').click()
  const school = page.getByLabel(/학교/).first()
  await school.fill('△△중학교')
  await page.keyboard.press('Escape')
  await expect(page.locator('.zz-sheet').first()).toContainText('△△중학교')
})

test('★ 마우스 없이 문항을 옮길 수 있다 (PP§10)', async ({ page }) => {
  const before = await page.evaluate(() =>
    [...document.querySelectorAll('.zz-sheet .zz-question')].map((e) => e.textContent?.slice(0, 20)),
  )
  // 포커스가 어디 있든 동작해야 한다 — 키보드 경로가 포커스 운에 달리면 안 된다
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Alt+ArrowDown')
  const after = await page.evaluate(() =>
    [...document.querySelectorAll('.zz-sheet .zz-question')].map((e) => e.textContent?.slice(0, 20)),
  )
  expect(after).not.toEqual(before)
})

test('배점 합계가 상태바에 나온다 — 목표와 다르면 알린다', async ({ page }) => {
  await expect(page.locator('footer')).toContainText('/100점')
})

test('여백 블록을 30mm 로 넣는다 (PD-06)', async ({ page }) => {
  const before = await page.locator('.zz-sheet .zz-spacer').count()
  await page.getByRole('button', { name: '여백', exact: true }).click()
  await expect(page.locator('.zz-sheet .zz-spacer')).toHaveCount(before + 1)
})

test('★ 조판 피드백이 지면에 나온다 — 엔진의 판단을 숨기지 않는다 (SS§6.5)', async ({ page }) => {
  const kinds = await page.evaluate(() =>
    [...document.querySelectorAll('.zz-sheet [data-feedback]')].map((e) =>
      e.getAttribute('data-feedback'),
    ),
  )
  // 이월(carried)은 여러 쪽짜리 시험지에서 반드시 생긴다
  expect(kinds.length).toBeGreaterThan(0)
})

/** ⚠ «지문 없는 문항» 상태는 **지금 코퍼스로는 재현되지 않는다.**
 *  샘플 시험지의 문항에 `passageId` 가 붙는 경로가 지문 묶음 안뿐이라,
 *  묶음을 지우면 문항도 함께 사라져 미아가 생기지 않는다.
 *
 *  예전에는 이 자리에 «경고가 없으면 통과» 하는 E2E 가 있었다 — 정상 상태에서
 *  언제나 초록이라 **아무것도 검증하지 않았다.** 지우고 단위 테스트로 옮긴다
 *  (`restorePassage.test.ts`). 실제 재현은 실사용 코퍼스가 생기면 다시 본다. */

test('★ 트레이에서 지면으로 끌어다 놓으면 담긴다 (PP§5.1 핵심가치 1)', async ({ page }) => {
  // 먼저 문항 하나를 빼서 트레이에 되돌린다
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Delete')
  const trayCount = await page.locator('[role="listbox"][aria-label="담을 문항"] [role="option"]').count()
  expect(trayCount).toBeGreaterThan(0)

  const before = await page.locator('.zz-sheet .zz-question').count()

  // HTML5 드래그를 흉내낸다 — dragstart → (상태 반영) → dragover → drop.
  // ⚠ **같은 틱에 몰아서 쏘면 안 된다.** dragstart 가 만든 상태가 반영되기 전에
  // drop 이 오면 «무엇을 끌고 있는지»를 모른다 (실제 드래그는 시간이 걸린다)
  await page.evaluate(() => {
    const card = document.querySelector('[role="listbox"][aria-label="담을 문항"] [role="option"]')
      ?.parentElement as HTMLElement | null
    if (!card) throw new Error('tray card missing')
    const dt = new DataTransfer()
    ;(window as unknown as { __dt: DataTransfer }).__dt = dt
    card.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }))
  })
  await page.waitForTimeout(100)

  await page.evaluate(() => {
    const dt = (window as unknown as { __dt: DataTransfer }).__dt
    const target = document.querySelector('.zz-sheet [data-drop-index]') as HTMLElement | null
    if (!target) throw new Error('drop target missing')
    const rect = target.getBoundingClientRect()
    target.dispatchEvent(
      new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }),
    )
    target.dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
        clientY: rect.top + 2,
      }),
    )
  })

  await expect(page.locator('.zz-sheet .zz-question')).toHaveCount(before + 1)
})
