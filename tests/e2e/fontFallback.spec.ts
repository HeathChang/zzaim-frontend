/** zz-0 D7 — 한자 폰트 폴백이 **실제로 도는가.**
 *
 *  ★ 이 검사가 없어서 3단계 폰트 전략이 통째로 죽어 있었다. 자산도 로직도 다 있었는데
 *  부르는 코드가 없었고, 화면은 «폰트 준비됨»이라 말했다.
 *  한자가 든 시험지에서 **스택이 바뀌고 한자본이 실제로 받아지는지**를 본다. */
import { expect, test, type Page } from '@playwright/test'

const HANJA_EXAM = `
<p>1. 다음 漢字語의 뜻으로 알맞은 것은?</p>
<p>① 學問 ② 敎育 ③ 讀書 ④ 硏究 ⑤ 思想</p>
<p>2. 밑줄 친 부분의 독음으로 옳은 것은?</p>
<p>① 가 ② 나 ③ 다 ④ 라 ⑤ 마</p>
`

async function pasteExam(page: Page, html: string) {
  await page.goto('/')
  await page.getByLabel('여기에 붙여넣으세요').waitFor({ timeout: 15000 })
  await page.evaluate((payload) => {
    const dt = new DataTransfer()
    dt.setData('text/html', payload)
    dt.setData('text/plain', payload.replace(/<[^>]+>/g, ' '))
    document.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    )
  }, html)
  await page.getByRole('listbox').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /담기/ }).click()
  const anyway = page.getByRole('button', { name: '그대로 담기' })
  if (await anyway.isVisible().catch(() => false)) await anyway.click()
  await page.locator('.zz-sheet').first().waitFor({ timeout: 15000 })
}

const stack = (page: Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-paper').trim(),
  )

test('★ 한자가 있으면 한자본을 받고 폰트 스택이 바뀐다', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/fonts/')) requested.push(r.url().split('/').pop() ?? '')
  })

  await pasteExam(page, HANJA_EXAM)
  await expect.poll(() => stack(page), { timeout: 15000 }).toContain('Hanja')

  // 자산을 **실제로** 받았는가 — 스택만 바꾸고 안 받으면 여전히 깨진다
  expect(requested.some((n) => n.includes('hanja'))).toBe(true)
  // 전체본까지 갈 이유는 없다 — 상용 한자는 한자본 안에 있다
  expect(requested.some((n) => n.includes('full'))).toBe(false)
})

test('한자가 없으면 기본 스택 그대로다 — 첫 진입을 1.16MB 로 만든 이유다', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/fonts/')) requested.push(r.url().split('/').pop() ?? '')
  })

  await page.goto('/')
  const html = await (await page.request.get('/sample-exam.html')).text()
  await pasteExam(page, html)
  await expect(page.locator('.zz-sheet').first()).toBeVisible()

  expect(await stack(page)).not.toContain('Hanja')
  expect(requested.some((n) => n.includes('hanja') || n.includes('full'))).toBe(false)
})
