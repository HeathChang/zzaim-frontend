/** E2E 공용 진입 경로.
 *
 *  앱은 **붙여넣기 화면에서 시작한다** (S-00). 지면을 보려면 먼저 시험지를
 *  가져와야 한다 — 진입점을 각 스펙에 흩어 두면 흐름이 바뀔 때마다 전부 깨진다.
 *  실제로 zz-3 을 붙였을 때 앞선 영역의 E2E 가 통째로 깨졌다. */
import type { Page } from '@playwright/test'

/** 샘플 시험지를 붙여넣어 지면까지 간다 */
export async function openPaper(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('여기에 붙여넣으세요').waitFor({ timeout: 15000 })

  const html = await (await page.request.get('/sample-exam.html')).text()
  await page.evaluate((payload) => {
    const dt = new DataTransfer()
    dt.setData('text/html', payload)
    dt.setData('text/plain', payload.replace(/<[^>]+>/g, ' '))
    document.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  }, html)

  // 이제 **경계 확정(S-02)** 을 거친다. 담기까지 마쳐야 지면이 나온다
  await page.getByRole('listbox').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /담기/ }).click()
  // 의심 지점이 남아 있으면 «그대로 담기»로 넘어간다 (D-06)
  const anyway = page.getByRole('button', { name: '그대로 담기' })
  if (await anyway.isVisible().catch(() => false)) await anyway.click()

  await page.locator('.zz-sheet').first().waitFor({ timeout: 15000 })
}
