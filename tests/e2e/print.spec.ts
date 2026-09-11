/** zz-6 인쇄 — **실제 브라우저에서만 검증되는 것들.**
 *
 *  `@media print` 는 jsdom 이 평가하지 않는다. 여기서 `emulateMedia('print')`
 *  로 진짜 인쇄 스타일을 계산해, «화면 그대로 인쇄된다»(PP§6.4)를 확인한다. */
import { expect, test, type Page } from '@playwright/test'
import { openPaper } from './helpers'

test.beforeEach(async ({ page }: { page: Page }) => {
  await openPaper(page)
})

test('인쇄 안내가 열리고, 브라우저에 맞는 항목 3가지를 알려준다 (SS§8)', async ({ page }) => {
  await page.getByRole('button', { name: '인쇄 →' }).click()
  const dialog = page.getByRole('dialog', { name: '인쇄하기 전에' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('여백')
  await expect(dialog).toContainText('배경')
  await expect(dialog).toContainText('머리글')
})

test('★ 체크하지 않아도 인쇄할 수 있다 — 강제하지 않는다 (zz-6 D5)', async ({ page }) => {
  await page.evaluate(() => {
    (window as unknown as { __printed: number }).__printed = 0
    window.print = () => {
      (window as unknown as { __printed: number }).__printed += 1
    }
  })
  await page.getByRole('button', { name: '인쇄 →' }).click()
  await page.getByRole('button', { name: '인쇄 창 열기' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)
})

test('★ 인쇄 순간에 안내 화면이 DOM 에서 사라져 있다 — 같이 인쇄되면 안 된다', async ({ page }) => {
  await page.evaluate(() => {
    window.print = () => {
      // 인쇄 시점의 DOM 을 그대로 남긴다
      (window as unknown as { __atPrint: string }).__atPrint =
        document.querySelectorAll('[role="dialog"]').length +
        '|' +
        (document.querySelector('.zz-sheet') ? 'sheet' : 'none')
    }
  })
  await page.getByRole('button', { name: '인쇄 →' }).click()
  await page.getByRole('button', { name: '인쇄 창 열기' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __atPrint?: string }).__atPrint))
    .toBe('0|sheet')
})

test('★ 인쇄 순간에 편집 패널이 닫혀 있다 — 패널이 열려 있으면 지면 폭이 달라진다', async ({
  page,
}) => {
  // `E` — 커서가 놓인 «문항»의 편집 패널을 연다. 커서가 지문 묶음에 있으면
  // 열리지 않으므로 문항을 만날 때까지 내려간다
  const panel = page.locator('[data-panel="edit"]')
  for (let i = 0; i < 8 && !(await panel.isVisible()); i += 1) {
    await page.keyboard.press('e')
    if (await panel.isVisible()) break
    await page.keyboard.press('ArrowDown')
  }
  await expect(panel).toBeVisible()
  await page.evaluate(() => {
    window.print = () => {
      const w = window as unknown as { __panelAtPrint: string }
      w.__panelAtPrint = document.querySelector('[data-panel="edit"]') ? 'panel' : 'nopanel'
    }
  })
  await page.getByRole('button', { name: '인쇄 →' }).click()
  await page.getByRole('button', { name: '인쇄 창 열기' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __panelAtPrint?: string }).__panelAtPrint))
    .toBe('nopanel')
})

test('★ 인쇄한 뒤 안내 화면으로 돌아온다 — 잘못 나왔으면 다시 볼 곳이 있어야 한다 (D10)', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.print = () => undefined
  })
  await page.getByRole('button', { name: '인쇄 →' }).click()
  await page.getByRole('button', { name: '인쇄 창 열기' }).click()
  await expect(page.getByRole('dialog', { name: '인쇄하기 전에' })).toBeVisible()
  // 그래도 종이에는 나가지 않는다
  await page.emulateMedia({ media: 'print' })
  const shown = await page.evaluate(
    () => getComputedStyle(document.querySelector('[role="dialog"]') as HTMLElement).display,
  )
  expect(shown).toBe('none')
  await page.emulateMedia({ media: 'screen' })
})

test('★ Cmd/Ctrl+P 를 가로챈다 — 브라우저에 맡기면 점검도 @page 갱신도 없이 인쇄된다', async ({
  page,
}) => {
  await page.keyboard.press('ControlOrMeta+p')
  await expect(page.getByRole('dialog', { name: '인쇄하기 전에' })).toBeVisible()
})

test('★ 쪽 나눔은 «앞에서» 건다 — 뒤에 걸면 빈 쪽이 한 장씩 더 생긴다 (D3)', async ({
  page,
}) => {
  await page.emulateMedia({ media: 'print' })
  const rules = await page.evaluate(() =>
    [...document.querySelectorAll('.zz-sheet')].map((el) => {
      const cs = getComputedStyle(el as HTMLElement)
      return { before: cs.breakBefore, after: cs.breakAfter }
    }),
  )
  expect(rules.length).toBeGreaterThan(1)
  // 첫 장은 그대로, 나머지는 앞에서 넘긴다. **뒤로 넘기는 시트는 하나도 없다**
  expect(rules[0]).toEqual({ before: 'auto', after: 'auto' })
  expect(rules.slice(1).every((r) => r.before === 'page' && r.after === 'auto')).toBe(true)
  await page.emulateMedia({ media: 'screen' })
})

test('★ 인쇄 스타일에서 지면 축소가 풀린다 — 축소된 채 나가면 자로 잰 값이 틀린다', async ({
  page,
}) => {
  await page.emulateMedia({ media: 'print' })
  const t = await page.evaluate(
    () => getComputedStyle(document.querySelector('.zz-sheet') as HTMLElement).transform,
  )
  expect(t).toBe('none')
  await page.emulateMedia({ media: 'screen' })
})

test('★ 인쇄 스타일에서 앱 UI 가 전부 사라지고 지면만 남는다', async ({ page }) => {
  await page.emulateMedia({ media: 'print' })
  const visible = await page.evaluate(() =>
    [...document.querySelectorAll('[data-print="hide"]')].map(
      (e) => getComputedStyle(e as HTMLElement).display,
    ),
  )
  expect(visible.length).toBeGreaterThan(0)
  expect(visible.every((d) => d === 'none')).toBe(true)
  await expect(page.locator('.zz-sheet').first()).toBeVisible()
  await page.emulateMedia({ media: 'screen' })
})

test('★ 인쇄 스타일에서 스크롤 영역의 높이 제한이 풀린다 — 안 풀면 첫 쪽만 나간다', async ({
  page,
}) => {
  await page.emulateMedia({ media: 'print' })
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('[data-print="scroll"]')].filter((e) => {
      const s = getComputedStyle(e as HTMLElement)
      return s.overflow !== 'visible' || s.maxHeight !== 'none'
    }).length,
  )
  expect(bad).toBe(0)
  await page.emulateMedia({ media: 'screen' })
})

test('@page 규칙이 문서에 정확히 하나, 여백 0으로 들어간다 (zz-6 D2)', async ({ page }) => {
  const rules = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((s) => {
        try {
          return [...s.cssRules]
        } catch {
          return []
        }
      })
      .filter((r) => r.constructor.name === 'CSSPageRule' || r.cssText.startsWith('@page'))
      .map((r) => r.cssText),
  )
  expect(rules).toHaveLength(1)
  expect(rules[0]).toContain('margin: 0')
})

test('«다음부터 건너뛰기»를 켜면 다음 인쇄에서 안내가 뜨지 않는다', async ({ page }) => {
  await page.evaluate(() => {
    window.print = () => undefined
  })
  await page.getByRole('button', { name: '인쇄 →' }).click()
  await page.getByLabel('다음부터 이 안내를 건너뛰기').check()
  await page.getByRole('button', { name: '인쇄 창 열기' }).click()
  // 인쇄 직후에는 안내가 그대로 남는다 (D10). 닫고 나가야 «다음부터»가 시작된다
  await page.getByRole('button', { name: '취소' }).click()

  await page.getByRole('button', { name: '인쇄 →' }).click()
  await expect(page.getByRole('dialog', { name: '인쇄하기 전에' })).toHaveCount(0)

  // ★ 끈 사람에게 **되돌릴 길**이 있어야 한다 (D5)
  await page.getByRole('button', { name: '인쇄 안내 다시 보기' }).click()
  await page.getByRole('button', { name: '인쇄 →' }).click()
  await expect(page.getByRole('dialog', { name: '인쇄하기 전에' })).toBeVisible()
})

/** ★ **실제 인쇄 경로의 산출물**을 본다.
 *
 *  ⚠ 한계를 분명히 해 둔다 (UD-20): `page.pdf()` 는 headless 경로라 교사가 쓰는
 *  인쇄 대화상자와 **완전히 같지 않다.** 그래서 이건 «정합성 증명»이 아니라
 *  **«변화 감지»** 다 (zz-6 불변4). 정합성은 종이를 자로 재야 확인된다. */
test('★ 뽑힌 쪽 수가 시트 수와 같다 — 백지가 딸려 나오면 여기서 어긋난다', async ({ page }) => {
  const sheets = await page.locator('.zz-sheet').count()
  expect(sheets).toBeGreaterThan(1)

  const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true })
  // 얇은 PDF 파서: 쪽 트리의 `/Count` 가 곧 쪽 수다
  const pages = Number(pdf.toString('latin1').match(/\/Count\s+(\d+)/)?.[1] ?? 0)
  // ★ 이 검사가 실제로 잡은 것: 화면 도구(배율 탭·패널 토글)가 인쇄에 남아 지면을
  // 밀어내는 바람에 **3장짜리 시험지가 5쪽으로** 나오고 있었다. 화면만 보고는
  // 절대 알 수 없다 — 미리보기는 멀쩡했다
  expect(pages).toBe(sheets)
})
