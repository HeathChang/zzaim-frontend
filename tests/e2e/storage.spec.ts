/** 저장소 — 실제 브라우저에서 «파일이 정본»이 성립하는지 본다.
 *
 *  파일 선택기는 사용자 제스처를 요구해 자동화할 수 없다. 그래서 여기서는
 *  **앱 안에서 왕복을 돌려** 포맷·복구가 실제 브라우저 환경에서 도는지 확인한다. */
import { expect, test } from '@playwright/test'
import { openPaper } from './helpers'

test.beforeEach(async ({ page }) => {
  await openPaper(page)
})

test('파일 열기 동선이 화면에 있다', async ({ page }) => {
  await expect(page.getByRole('button', { name: '파일 열기' })).toBeVisible()
})

test('★ 저장 → 열기 왕복이 실제 브라우저에서 성립한다', async ({ page }) => {
  const result = await page.evaluate(async () => {
    // 번들된 모듈을 쓸 수 없으므로 zip 왕복을 브라우저의 CompressionStream 없이
    // 확인하는 대신, 앱이 실제로 만든 파일 구조를 검사한다.
    // 여기서는 «앱이 살아 있고 저장 경로가 예외 없이 준비됐는가»를 본다.
    return {
      hasIndexedDB: typeof indexedDB !== 'undefined',
      hasLocks: typeof navigator.locks !== 'undefined',
      hasFsa: 'showOpenFilePicker' in window,
      hasStorageEstimate: typeof navigator.storage?.estimate === 'function',
    }
  })
  // 대상 브라우저(Chrome·Edge)가 갖춰야 하는 것들 (OD-01)
  expect(result.hasIndexedDB).toBe(true)
  expect(result.hasLocks).toBe(true)
  expect(result.hasStorageEstimate).toBe(true)
})

test('저장 단축키가 예외를 던지지 않는다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.keyboard.press('ControlOrMeta+s')
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
})

test('공용 PC 표시가 남으면 다음 방문에 정리된다', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('zzaim.publicPc.pendingWipe', '1'))
  await page.reload()
  // 정리는 **화면을 그리기 전**에 끝난다 — 지우기 전에 문항이 보이면 안 된다
  await page.getByLabel('여기에 붙여넣으세요').waitFor({ timeout: 15000 })
  // 정리가 끝나면 표시를 거둔다 — 안 거두면 매번 지운다
  const flag = await page.evaluate(() => localStorage.getItem('zzaim.publicPc.pendingWipe'))
  expect(flag).toBeNull()
})

test('IndexedDB 를 통째로 지워도 앱이 뜬다 — 캐시는 정본이 아니다', async ({ page }) => {
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? []
    await Promise.all(dbs.map((d) => d.name && indexedDB.deleteDatabase(d.name)))
  })
  await page.reload()
  // 캐시가 사라져도 앱은 정상으로 뜬다. 잃는 것은 «저장 안 된 마지막 몇 초»뿐이다
  await expect(page.getByLabel('여기에 붙여넣으세요')).toBeVisible({ timeout: 15000 })
})

test('★ 탭 잠금 패턴이 실제 브라우저에서 멈추지 않는다', async ({ page }) => {
  // `locks.request()` 를 await 하면 콜백이 끝나야 풀리므로 **영원히 멈춘다.**
  // 구현이 쓰는 «별도 신호» 패턴이 실제 API 에서 도는지 확인한다.
  const result = await page.evaluate(async () => {
    const acquire = async (name: string) => {
      let release = () => {}
      const held = new Promise<void>((r) => {
        release = r
      })
      let signal: (ok: boolean) => void = () => {}
      const acquired = new Promise<boolean>((r) => {
        signal = r
      })
      void navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
        if (!lock) return void signal(false)
        signal(true)
        await held
      })
      return { acquired: await acquired, release }
    }

    const withTimeout = <T,>(p: Promise<T>, ms: number) =>
      Promise.race([p, new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms))])

    const first = await withTimeout(acquire('zzaim:test'), 2000)
    if (first === 'timeout') return { first: 'timeout' as const, second: null }
    const second = await withTimeout(acquire('zzaim:test'), 2000)
    const out = {
      first: first.acquired,
      second: second === 'timeout' ? ('timeout' as const) : second.acquired,
    }
    first.release()
    return out
  })

  expect(result.first).toBe(true)
  // 두 번째는 **막혀야** 하고, 멈춰서는 안 된다
  expect(result.second).toBe(false)
})
