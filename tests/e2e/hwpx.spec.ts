/** zz-9 한글 파일로 내보내기 — **실제 브라우저에서 파일이 손에 쥐어지는가.**
 *
 *  ⚠ «한글에서 열린다»는 여기서 증명되지 않는다 (D6 — 사람이 확인). 여기서
 *  지키는 것은 그 앞이다: 버튼이 있고, 한계가 적혀 있고, 파일이 실제로 나오고,
 *  그 파일이 **화면과 같은 쪽 수**를 담는가. */
import { expect, test, type Page } from '@playwright/test'
import { openPaper } from './helpers'

test.beforeEach(async ({ page }: { page: Page }) => {
  await openPaper(page)
  await page.evaluate(() => {
    window.print = () => undefined
  })
})

test('인쇄 안내에 «한글 파일로 내보내기»가 있고, 한계를 먼저 알린다 (D4 · UD-49)', async ({
  page,
}) => {
  await page.getByRole('button', { name: '인쇄 →' }).click()
  const dialog = page.getByRole('dialog', { name: '인쇄하기 전에' })
  await expect(dialog.getByRole('button', { name: '한글 파일로 내보내기' })).toBeVisible()
  await expect(dialog).toContainText('줄바꿈이 조금 달라질 수 있습니다')
})

test('★ 누르면 .hwpx 파일이 실제로 나온다', async ({ page }) => {
  await page.getByRole('button', { name: '인쇄 →' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '한글 파일로 내보내기' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.hwpx$/)
  await expect(page.getByRole('dialog')).toContainText('내보냈습니다')
})

test('★ 내보낸 파일의 쪽 나누기 수가 화면의 쪽 수와 맞는다 — 배치를 다시 계산하지 않는다', async ({
  page,
}) => {
  const sheets = await page.locator('.zz-sheet').count()
  expect(sheets).toBeGreaterThan(1)

  await page.getByRole('button', { name: '인쇄 →' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '한글 파일로 내보내기' }).click()
  const path = await (await download).path()

  const { readFileSync } = await import('node:fs')
  const { unzipSync, strFromU8 } = await import('fflate')
  const files = unzipSync(new Uint8Array(readFileSync(path)))
  const section = strFromU8(files['Contents/section0.xml']!)

  // 쪽 나누기는 «쪽 수 - 1» 이다. 첫 쪽에서는 넘기지 않는다
  expect(section.match(/pageBreak="1"/g)?.length ?? 0).toBe(sheets - 1)

  // 단 나누기는 «내용이 있는 두 번째 이후 단»의 수다.
  // ⚠ 상수로 박으면 안 된다 — 마지막 쪽의 둘째 단은 비어 있을 수 있고,
  // 그때 단 나누기는 **생기지 않는 것이 맞다**
  const expected = await page.evaluate(
    () =>
      [...document.querySelectorAll('.zz-sheet')].reduce((n, sheet) => {
        const cols = [...sheet.querySelectorAll('[data-column]')]
        // ⚠ 단 안에는 래퍼 `div` 가 **비어 있어도 하나** 있다. 손자를 세야 한다 —
        // 자식을 세면 빈 단이 «내용 있음»으로 잡힌다
        return n + cols.filter((c, i) => i > 0 && c.querySelectorAll(':scope > div > *').length > 0)
          .length
      }, 0),
  )
  expect(expected).toBeGreaterThan(0)
  expect(section.match(/columnBreak="1"/g)?.length ?? 0).toBe(expected)
  expect(strFromU8(files['mimetype']!)).toBe('application/hwp+zip')
})

test('내보내기가 실패해도 인쇄 경로는 살아 있다', async ({ page }) => {
  await page.getByRole('button', { name: '인쇄 →' }).click()
  // 내보내기 도중 예외를 만든다 — Blob 생성을 막는다
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('boom')
    }
  })
  await page.getByRole('button', { name: '한글 파일로 내보내기' }).click()
  await expect(page.getByRole('dialog')).toContainText('실패')
  // 인쇄는 그대로 눌린다
  await page.getByRole('button', { name: '인쇄 창 열기' }).click()
  await expect(page.getByRole('dialog', { name: '인쇄하기 전에' })).toBeVisible()
})
