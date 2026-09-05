/** 가져오기 동선 — 실제 브라우저에서.
 *
 *  «3분 안에 어? 되네»(PP§7.4)가 성립하려면 **첫 화면에서 바로 붙여넣을 수 있어야** 한다. */
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('여기에 붙여넣으세요').waitFor({ timeout: 15000 })
})

test('첫 화면은 붙여넣기 영역이다', async ({ page }) => {
  const zone = page.getByLabel('여기에 붙여넣으세요')
  await expect(zone).toBeVisible()
  // textarea 기반이어야 스크린리더가 «붙여넣을 수 있는 영역»으로 읽는다 (SS§2.7)
  expect(await zone.evaluate((el) => el.tagName)).toBe('TEXTAREA')
})

test('★ 진입 시 포커스가 붙여넣기 영역에 있다 — 즉시 Ctrl+V 가 먹는다', async ({ page }) => {
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  expect(focused).toBe('여기에 붙여넣으세요')
})

test('★ 첫 화면에서 권한 대화상자가 뜨지 않는다 (zz-3 D2)', async ({ page }) => {
  // 여기서 권한을 물으면 «3분 목표»를 첫 화면에서 잃는다.
  // 저장소 지속성은 조용히 요청하고 결과를 알리지도 묻지도 않는다
  const dialogs: string[] = []
  page.on('dialog', (d) => dialogs.push(d.message()))
  await page.waitForTimeout(500)
  expect(dialogs).toEqual([])
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('전역 붙여넣기로 시험지가 들어온다', async ({ page }) => {
  const html = '<p>[1~2] 다음 글을 읽고 물음에 답하시오.</p><table><tr><td><p>지문입니다</p></td></tr></table>' +
    '<p>1. 다음 글의 주제로 가장 적절한 것은? [3점]</p><p>① 하나</p><p>② 둘</p><p>③ 셋</p><p>④ 넷</p><p>⑤ 다섯</p>' +
    '<p>2. 밑줄 친 부분의 뜻으로 알맞은 것은? [3점]</p><p>① 하나</p><p>② 둘</p><p>③ 셋</p><p>④ 넷</p><p>⑤ 다섯</p>'

  await page.evaluate((payload) => {
    const dt = new DataTransfer()
    dt.setData('text/html', payload)
    dt.setData('text/plain', payload.replace(/<[^>]+>/g, ' '))
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, html)

  // 붙여넣으면 **경계 확정 화면**으로 간다 (SS§4). 지면은 담은 뒤다
  await expect(page.getByRole('listbox')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('분리 결과', { exact: false })).toBeVisible()
})

test('★ 문항을 못 찾아도 빈손으로 돌려보내지 않는다 (SS§3.6)', async ({ page }) => {
  await page.evaluate(() => {
    const dt = new DataTransfer()
    dt.setData('text/html', '<p>번호가 하나도 없는 그냥 글입니다</p>')
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.getByText('문항을 찾지 못했습니다.')).toBeVisible()
  await expect(page.getByText('그래도 통째로 하나의 문항으로 담기')).toBeVisible()
})

test('서식 없는 텍스트는 «표와 그림이 사라진다»고 알린다 (SS§2.6)', async ({ page }) => {
  await page.evaluate(() => {
    const dt = new DataTransfer()
    dt.setData('text/plain', '1. 첫 문항입니다 충분히 긴 내용\n2. 둘째 문항입니다 충분히 긴 내용')
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.getByText('표와 그림은 사라집니다', { exact: false })).toBeVisible()
})
