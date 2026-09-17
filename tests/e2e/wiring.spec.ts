/** ★ **«부품은 있는데 아무도 안 부른다» 를 브라우저에서 확인한다.**
 *
 *  전체 리뷰가 찾아낸 것들이다 — 로직도 자산도 있었는데 부르는 코드가 없어
 *  기능이 통째로 죽어 있었다. 정적 게이트(`check-dead-exports`)가 «불린다» 까지는
 *  보장하지만 **«제대로 동작한다» 는 여기서만 확인된다.** */
import { expect, test, type Page } from '@playwright/test'
import { openPaper } from './helpers'

test.beforeEach(async ({ page }: { page: Page }) => {
  await openPaper(page)
})

test('★ 키보드로 옮기면 어디로 갔는지 읽어 준다 (SS§6 · PP§10)', async ({ page }) => {
  const live = page.getByTestId('paper-announce')
  await expect(live).toHaveText('')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Alt+ArrowDown')

  // «N번 문항을 N쪽 N단 N번째로 옮겼습니다»
  await expect(live).toContainText('옮겼습니다')
  await expect(live).toContainText('쪽')
  await expect(live).toContainText('단')
})

test('★ 드래그가 가장자리에 닿으면 지면이 스스로 굴러간다 (SS§6.4)', async ({ page }) => {
  // ⚠ `data-print="scroll"` 은 셸에도 있다. **지면을 굴리는 그 요소**를 집는다
  const scroller = page.getByTestId('paper-scroll')
  const before = await scroller.evaluate((el) => el.scrollTop)
  expect(await scroller.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)

  // ⚠ 이 앱은 HTML5 드래그를 쓴다. 마우스 이벤트로는 `dragstart` 가 나지 않아
  // 끌고 있는 상태 자체가 만들어지지 않는다 — 실제 이벤트를 보낸다
  await page.evaluate(() => {
    const item = document.querySelector('.zz-sheet [data-drop-index]') as HTMLElement
    item.dispatchEvent(new DragEvent('dragstart', { bubbles: true }))
  })

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="paper-scroll"]') as HTMLElement
    const r = el.getBoundingClientRect()
    // 아래 가장자리 안쪽(40px)에 머문다
    window.dispatchEvent(new DragEvent('dragover', { bubbles: true, clientY: r.bottom - 8 }))
  })

  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop), { timeout: 4000 })
    .toBeGreaterThan(before)
})

test('측정 캐시가 무한히 자라지 않는다 — 설정을 여러 번 만져도', async ({ page }) => {
  // 글자 크기를 여러 번 바꾸면 측정 키가 매번 새로 생긴다.
  // 지워 주지 않으면 세션 내내 쌓인다
  await page.getByRole('button', { name: '설정', exact: true }).click()
  const font = page.getByLabel('글자 크기')
  await font.focus()
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(120)
  }
  // 숨김 측정기에 남아 있는 노드 수 = 지금 화면의 아이템 수 수준이어야 한다
  const measured = await page.evaluate(() => document.querySelectorAll('[data-mk]').length)
  const items = await page.evaluate(
    () => document.querySelectorAll('.zz-sheet .zz-item').length,
  )
  expect(measured).toBeLessThan(items * 3 + 20)
})

test('★ 지면 위 문항을 끌어서 재배치할 수 있다 — 담은 뒤에도 마우스로 옮긴다', async ({
  page,
}) => {
  // ⚠ 번호로 비교하면 안 된다 — 번호는 **자리에 따라 다시 매겨지므로** 언제나 1,2,3… 이다.
  // 순서가 바뀌었는지는 **본문**으로 봐야 한다
  const order = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.zz-sheet .zz-question')].map((n) =>
        (n as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 24),
      ),
    )
  const before = await order()
  expect(before.length).toBeGreaterThan(2)

  // 지면 아이템이 실제로 끌 수 있는 상태인가 — 이게 빠져 있어 재배치가 죽어 있었다
  expect(
    await page.evaluate(
      () => (document.querySelector('.zz-sheet [data-drop-index]') as HTMLElement).draggable,
    ),
  ).toBe(true)

  // ⚠ 끌기 시작을 **먼저** 알린 뒤 한 틱 쉰다. 같은 틱에 몰아치면 React 가
  // 아직 다시 그리지 않아 드롭 핸들러가 «무엇을 끄는지» 모른다
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('.zz-sheet [data-drop-index]')] as HTMLElement[]
    items[items.length - 1]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true }))
  })
  await page.waitForTimeout(50)
  await page.evaluate(() => {
    const to = document.querySelector('.zz-sheet [data-drop-index]') as HTMLElement
    const r = to.getBoundingClientRect()
    to.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, clientY: r.top + 2 }),
    )
    to.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientY: r.top + 2 }))
  })

  await expect.poll(order).not.toEqual(before)
})
