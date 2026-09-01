/** E2E 하네스 존재 증명 — zz-0 은 «빈 스위트로라도 통과»가 검증 항목이다.
 *  실제 조판 시나리오(30문항 → PDF → 페이지 수)는 zz-2 이후가 채운다. */
import { expect, test } from '@playwright/test'

test('앱이 뜨고 외부 요청을 하지 않는다', async ({ page }) => {
  const external: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    if (!url.startsWith('http://localhost') && !url.startsWith('data:')) external.push(url)
  })

  await page.goto('/')
  await expect(page.locator('#root')).toBeVisible()

  // 학교 망은 외부를 막는 경우가 있다 (PP§6.4). 요청이 하나라도 나가면 실패다.
  expect(external).toEqual([])
})
