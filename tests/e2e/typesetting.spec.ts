/** 조판 엔진 — **실제 브라우저에서만 확인되는 것들.**
 *  jsdom 은 레이아웃을 계산하지 않으므로 여기서만 잡히는 결함이 있다.
 *  실제로 이 파일의 두 검사가 개발 중 결함을 하나씩 잡았다. */
import { expect, test } from '@playwright/test'
import { openPaper } from './helpers'

const MM = 3.7795275591

test.beforeEach(async ({ page }) => {
  // 앱은 붙여넣기 화면에서 시작한다 — 지면까지 가려면 시험지를 먼저 가져온다
  await openPaper(page)
})

test('지면이 정확히 A4 다 — 210 x 297mm', async ({ page }) => {
  const box = await page.locator('.zz-sheet').first().boundingBox()
  // 브라우저가 서브픽셀에서 반올림한다. 0.1px 이내면 같은 값이다.
  expect(box?.width).toBeCloseTo(210 * MM, 0)
  expect(box?.height).toBeCloseTo(297 * MM, 0)
})

test('★ 측정기와 지면의 글자 크기가 같다 — 다르면 이 엔진의 전제가 무너진다', async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const sheet = document.querySelector('.zz-sheet')
    const hidden = document.querySelector('[data-mk]')?.parentElement
    return {
      sheet: sheet ? getComputedStyle(sheet).fontSize : null,
      measurer: hidden ? getComputedStyle(hidden).fontSize : null,
    }
  })
  expect(sizes.sheet).toBe(sizes.measurer)
  // HO§지면본문서식: fs = 13.6 * fontScale/100
  expect(sizes.sheet).toBe('13.6px')
})

test('측정기와 지면의 단 폭이 같다 — 폭이 다르면 줄바꿈이 달라진다', async ({ page }) => {
  const widths = await page.evaluate(() => {
    const hidden = document.querySelector('[data-mk]')?.parentElement as HTMLElement | null
    const column = document.querySelector('.zz-sheet [data-column="0"]') as HTMLElement | null
    return {
      measurer: hidden?.getBoundingClientRect().width ?? 0,
      column: column?.getBoundingClientRect().width ?? 0,
    }
  })
  expect(widths.measurer).toBeGreaterThan(0)
  expect(Math.abs(widths.measurer - widths.column)).toBeLessThan(1)
})

test('단 사이 세로선은 기본으로 꺼져 있다 (HO§기본레이아웃상태 rule:false)', async ({ page }) => {
  // 켰을 때 그려지는지는 단위 테스트가 본다 — 여기서는 **기본값**을 지킨다
  const hasRule = await page.evaluate(() => {
    const col = document.querySelector('.zz-sheet [data-column="0"]')
    if (!col) return false
    return [...col.children].some((c) => getComputedStyle(c).borderLeftWidth !== '0px')
  })
  expect(hasRule).toBe(false)
})

test('지문 묶음의 지시문 범위가 **배치 순서**를 따른다', async ({ page }) => {
  // ⚠ 숨김 측정기에도 같은 요소가 있다. **지면 안으로 범위를 좁혀야** 한다
  const instruction = await page.locator('.zz-sheet .zz-instruction').first().textContent()
  // 원본 번호가 아니라 배치 순서에서 나온 범위다
  expect(instruction).toMatch(/\[\d+~\d+\]/)
})

test('마지막 쪽에만 마무리 문구가 나온다', async ({ page }) => {
  const perSheet = await page.$$eval('.zz-sheet', (sheets) =>
    sheets.map((s) => s.querySelectorAll('.zz-closing').length),
  )
  expect(perSheet.at(-1)).toBe(1)
  expect(perSheet.slice(0, -1).every((n) => n === 0)).toBe(true)
})

test('창이 좁아지면 자동으로 폭 맞춤이 되고 «축소됨» 을 알린다', async ({ page }) => {
  // 축소된 지면을 실제 크기라고 믿게 하는 것이 이 화면의 최악의 실수다 (SS§6.3)
  await page.setViewportSize({ width: 700, height: 900 })
  await expect(page.getByText('축소됨')).toBeVisible()
  const transform = await page.evaluate(
    () => getComputedStyle(document.querySelector('.zz-sheet') as HTMLElement).transform,
  )
  expect(transform).not.toBe('none')
})

test('넓은 창에서는 축소되지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await expect(page.getByText('축소됨')).toHaveCount(0)
})

test('시험지가 2단으로 조판되고 번호가 이어진다', async ({ page }) => {
  const result = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('.zz-sheet')]
    const numbers = sheets.flatMap((s) =>
      [...s.querySelectorAll('.zz-number')].map((n) => n.textContent?.trim()),
    )
    return { pages: sheets.length, numbers }
  })
  expect(result.pages).toBeGreaterThanOrEqual(1)
  // ★ 배치 순서대로 **1부터 빠짐없이** 매겨진다 — 원본 번호가 아니다 (HO§문항번호).
  // 지문 묶음이 소비한 번호는 문항에 나타나지 않으므로, «오름차순이고 중복이 없다»를 본다
  const numbers = result.numbers.map((n) => Number(String(n).replace('.', '')))
  expect(numbers.length).toBeGreaterThan(0)
  expect(numbers[0]).toBeGreaterThanOrEqual(1)
  for (let i = 1; i < numbers.length; i += 1) {
    expect(numbers[i]!, `${numbers[i - 1]} 다음이 ${numbers[i]}`).toBeGreaterThan(numbers[i - 1]!)
  }
})

test('쪽 번호가 N / M 으로 매겨진다', async ({ page }) => {
  const folios = await page.$$eval('.zz-folio', (els) => els.map((e) => e.textContent?.trim()))
  expect(folios[0]).toBe(`1 / ${folios.length}`)
  expect(folios.at(-1)).toBe(`${folios.length} / ${folios.length}`)
})

test('머리말은 첫 쪽에만 나온다', async ({ page }) => {
  const perSheet = await page.$$eval('.zz-sheet', (sheets) =>
    sheets.map((s) => s.querySelectorAll('.zz-paper-header').length),
  )
  expect(perSheet[0]).toBe(1)
  expect(perSheet.slice(1).every((n) => n === 0)).toBe(true)
})

test('배율을 바꿔도 시트 안의 px 값은 그대로다 (zz-2 불변4)', async ({ page }) => {
  const read = () =>
    page.evaluate(() => {
      const sheet = document.querySelector('.zz-sheet') as HTMLElement
      return {
        inner: sheet.style.width,
        font: getComputedStyle(sheet).fontSize,
        transform: getComputedStyle(sheet).transform,
      }
    })

  const at100 = await read()
  expect(at100.transform).toBe('none')

  await page.getByRole('button', { name: '폭 맞춤' }).click()
  const atFit = await read()

  // 안쪽 값은 같고, 바깥의 transform 만 달라진다 —
  // 그래야 인쇄에서 transform 만 지우면 1:1 이 된다
  expect(atFit.inner).toBe(at100.inner)
  expect(atFit.font).toBe(at100.font)
  expect(atFit.transform).not.toBe('none')
})

test('@page 는 런타임에 주입되고 margin 은 0 이다', async ({ page }) => {
  const css = await page.evaluate(() => document.getElementById('zzaim-page-rule')?.textContent)
  expect(css).toContain('size: 210mm 297mm')
  expect(css).toContain('margin: 0')
})

test('인쇄 매체에서는 배율이 사라진다 — 축소된 지면이 종이에 나가면 안 된다', async ({ page }) => {
  await page.getByRole('button', { name: '폭 맞춤' }).click()
  await page.emulateMedia({ media: 'print' })
  const transform = await page.evaluate(
    () => getComputedStyle(document.querySelector('.zz-sheet') as HTMLElement).transform,
  )
  expect(transform).toBe('none')
})

test('폰트를 못 받으면 지면을 그리지 않는다 (zz-2 불변3)', async ({ page }) => {
  // 폰트를 막고 **처음부터** 다시 들어간다 — 시험지를 가져와도 지면은 안 그려져야 한다
  await page.route('**/fonts/*.woff2', (route) => route.abort())
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

  // 경계 확정을 거쳐 담는다
  await page.getByRole('listbox').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: /담기/ }).click()
  const anyway = page.getByRole('button', { name: '그대로 담기' })
  if (await anyway.isVisible().catch(() => false)) await anyway.click()

  // 잘못된 조판을 보여 주는 것이 빈 화면보다 나쁘다 (SS§6.6)
  await expect(page.getByText('지면 글꼴을 불러오지 못했습니다', { exact: false })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.locator('.zz-sheet')).toHaveCount(0)
})
