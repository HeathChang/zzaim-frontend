/** zz-6 인쇄 — 점검·흐름·안내 화면.
 *
 *  **이 티켓의 실패 모드는 «인쇄해 봐야 안다»는 것이다.** 그래서 화면이 아니라
 *  흐름을 검증한다: 점검이 언제 도는지, 무엇이 막는지, 인쇄 직전 DOM 이 어떤지. */
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { isBlocked, preflight, type PreflightInput } from '@/print/preflight'
import { tryPrint } from '@/print/printFlow'
import { detectPrintBrowser, hintImage } from '@/screens/S06Print/browserHints'
import { S06Print } from '@/screens/S06Print'
import { usePrintFlow } from '@/app/usePrintFlow'
import { pageRuleCss } from '@/print/pageRule'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const OK: PreflightInput = {
  fontsReady: true,
  totalPoints: 100,
  targetPoints: 100,
  orphanCount: 0,
  overflowCount: 0,
}

describe('인쇄 전 점검', () => {
  it('문제가 없으면 아무것도 알리지 않는다', () => {
    expect(preflight(OK)).toEqual([])
  })

  it('폰트 미로드만 인쇄를 막는다', () => {
    const issues = preflight({ ...OK, fontsReady: false })
    expect(issues).toEqual([{ code: 'fonts', blocking: true }])
    expect(isBlocked(issues)).toBe(true)
  })

  it('배점·미아·넘침은 알리되 막지 않는다 — 교사가 알고 낼 수 있다', () => {
    const issues = preflight({ ...OK, totalPoints: 98, orphanCount: 2, overflowCount: 1 })
    expect(issues.map((i) => i.code).sort()).toEqual(['orphan', 'overflow', 'points'])
    expect(issues.every((i) => !i.blocking)).toBe(true)
    expect(isBlocked(issues)).toBe(false)
  })

  it('건수를 숫자로 준다 — «몇 건»을 모르면 고칠 수 없다', () => {
    const issues = preflight({ ...OK, orphanCount: 3, overflowCount: 2 })
    expect(issues.find((i) => i.code === 'orphan')?.count).toBe(3)
    expect(issues.find((i) => i.code === 'overflow')?.count).toBe(2)
  })

  it('마지막 쪽 여백은 점검 사유가 아니다 — 시험지에서 흔한 일이다', () => {
    expect(preflight(OK).map((i) => String(i.code))).not.toContain('pagefill')
  })
})

describe('인쇄 흐름', () => {
  function ports() {
    return {
      pageSize: 'A4' as const,
      focusPaper: vi.fn(),
      print: vi.fn(),
      doc: document,
    }
  }

  it('막는 사유가 있으면 인쇄 창을 열지 않는다', () => {
    const p = ports()
    const r = tryPrint({ ...OK, fontsReady: false }, p)
    expect(r.printed).toBe(false)
    expect(p.print).not.toHaveBeenCalled()
  })

  it('인쇄 전에 패널을 닫고 @page 를 갱신한 뒤 인쇄한다 — 순서가 곧 결과다', () => {
    const order: string[] = []
    const p = {
      pageSize: 'B4' as const,
      focusPaper: vi.fn(() => order.push('focus')),
      print: vi.fn(() => order.push('print')),
      doc: document,
    }
    const r = tryPrint(OK, p)
    expect(r.printed).toBe(true)
    expect(order).toEqual(['focus', 'print'])
    expect(document.getElementById('zzaim-page-rule')?.textContent).toBe(pageRuleCss('B4'))
  })

  it('막지 않는 경고가 있어도 인쇄한다', () => {
    const p = ports()
    const r = tryPrint({ ...OK, totalPoints: 98 }, p)
    expect(r.printed).toBe(true)
    expect(r.issues).toHaveLength(1)
  })
})

describe('브라우저 안내', () => {
  it('엣지를 크롬과 구분한다 — 엣지 UA 에도 Chrome 이 들어 있다', () => {
    const edge =
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 Edg/120'
    expect(detectPrintBrowser(edge)).toBe('edge')
    expect(detectPrintBrowser('Mozilla/5.0 Chrome/120 Safari/537.36')).toBe('chrome')
  })

  it('대상 밖 브라우저에는 크롬 안내를 준다 (OD-01)', () => {
    expect(detectPrintBrowser('Mozilla/5.0 Firefox/120')).toBe('chrome')
    expect(hintImage('edge')).toBe('/print-hints/edge.png')
  })
})

describe('S-06 안내 화면', () => {
  const noop = () => undefined

  function view(over: Partial<React.ComponentProps<typeof S06Print>> = {}) {
    const onPrint = vi.fn()
    const onCancel = vi.fn()
    const onChangeSkip = vi.fn()
    render(
      <S06Print
        issues={[]}
        skipNextTime={false}
        onChangeSkip={onChangeSkip}
        onPrint={onPrint}
        onCancel={onCancel}
        userAgent="Chrome/120"
        {...over}
      />,
    )
    return { onPrint, onCancel, onChangeSkip }
  }

  it('체크하지 않아도 인쇄할 수 있다 — 강제하면 아무도 안 읽는다 (D5)', () => {
    const { onPrint } = view()
    fireEvent.click(screen.getByRole('button', { name: '인쇄 창 열기' }))
    expect(onPrint).toHaveBeenCalled()
  })

  it('막는 사유가 있으면 버튼을 잠그고 그 사유를 버튼에 연결한다', () => {
    const { onPrint } = view({ issues: [{ code: 'fonts', blocking: true }] })
    const btn = screen.getByRole('button', { name: '인쇄 창 열기' })
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    // ⚠ 진짜 `disabled` 면 포커스를 못 받아 사유가 읽히지 않는다
    expect(btn.hasAttribute('disabled')).toBe(false)
    expect(btn.getAttribute('aria-describedby')).toBe('print-blocked')
    expect(document.getElementById('print-blocked')?.textContent).toContain('글꼴')
    // 눌러도 인쇄되지 않는다 — 잠금은 핸들러가 지킨다
    fireEvent.click(btn)
    expect(onPrint).not.toHaveBeenCalled()
  })

  it('경고는 보여 주되 버튼을 잠그지 않는다', () => {
    const { onPrint } = view({ issues: [{ code: 'points', blocking: false, count: 98 }] })
    const btn = screen.getByRole('button', { name: '인쇄 창 열기' })
    expect(btn.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(btn)
    expect(onPrint).toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('98')
  })

  it('엔터로 인쇄, Esc 로 취소한다 (SS§8.7)', () => {
    const { onPrint, onCancel } = view()
    const box = screen.getAllByRole('checkbox')[0]!
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onPrint).toHaveBeenCalled()
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('막혀 있으면 엔터로도 인쇄되지 않는다', () => {
    const { onPrint } = view({ issues: [{ code: 'fonts', blocking: true }] })
    fireEvent.keyDown(screen.getAllByRole('checkbox')[0]!, { key: 'Enter' })
    expect(onPrint).not.toHaveBeenCalled()
  })

  it('브라우저에 맞는 안내 문구를 보여 준다', () => {
    view({ userAgent: 'Chrome/120 Edg/120' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('엣지')
  })

  it('스크린샷이 없으면 이미지를 숨긴다 — 깨진 그림을 남기지 않는다 (D11)', () => {
    view()
    const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement
    fireEvent.error(img)
    expect(img.style.display).toBe('none')
  })

  it('세 항목을 모두 안내한다: 여백·배경·머리글', () => {
    view()
    const text = screen.getAllByRole('checkbox').map((c) => c.parentElement?.textContent ?? '')
    expect(text.some((t) => t.includes('여백'))).toBe(true)
    expect(text.some((t) => t.includes('배경'))).toBe(true)
    expect(text.some((t) => t.includes('머리글'))).toBe(true)
  })

  it('처음 포커스는 첫 체크 항목이다 — 순서대로 읽히게', () => {
    view()
    expect(document.activeElement).toBe(screen.getAllByRole('checkbox')[0])
  })

  void noop
})

describe('건너뛰기', () => {
  function store(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial))
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage
  }

  it('기본은 안내를 보여 준다', () => {
    const { result } = renderHook(() => usePrintFlow(store()))
    act(() => result.current.request({ input: OK, focusPaper: vi.fn() }))
    expect(result.current.phase.kind).toBe('guide')
  })

  it('건너뛰기를 켰으면 안내 없이 곧장 인쇄 단계로 간다', () => {
    const { result } = renderHook(() => usePrintFlow(store({ 'zzaim.print.skipGuide': '1' })))
    expect(result.current.skip).toBe(true)
    act(() => result.current.request({ input: OK, focusPaper: vi.fn() }))
    expect(result.current.phase.kind).toBe('printing')
  })

  it('★ 건너뛰어도 점검은 돈다 — 막는 사유가 있으면 안내를 연다', () => {
    const { result } = renderHook(() => usePrintFlow(store({ 'zzaim.print.skipGuide': '1' })))
    act(() => result.current.request({ input: { ...OK, fontsReady: false }, focusPaper: vi.fn() }))
    expect(result.current.phase.kind).toBe('guide')
  })

  it('요청 즉시 패널을 닫는다 — 인쇄 시점이 아니라 요청 시점이다', () => {
    const focusPaper = vi.fn()
    const { result } = renderHook(() => usePrintFlow(store()))
    act(() => result.current.request({ input: OK, focusPaper }))
    expect(focusPaper).toHaveBeenCalled()
  })

  it('저장소가 막혀 있어도 인쇄를 막지 않는다 (공용 PC)', () => {
    const blocked = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    } as unknown as Storage
    const { result } = renderHook(() => usePrintFlow(blocked))
    expect(result.current.skip).toBe(false)
    act(() => result.current.setSkip(true))
    expect(result.current.skip).toBe(true)
  })

  it('★ 인쇄한 뒤 안내 화면으로 돌아온다 — 잘못 나왔을 때 볼 곳이 있어야 한다 (D10)', () => {
    const { result } = renderHook(() => usePrintFlow(store()))
    act(() => result.current.request({ input: OK, focusPaper: vi.fn() }))
    act(() => result.current.confirm())
    expect(result.current.phase.kind).toBe('printing')
    act(() => result.current.done())
    expect(result.current.phase.kind).toBe('guide')
    act(() => result.current.cancel())
    expect(result.current.phase.kind).toBe('idle')
  })

  it('건너뛰기로 곧장 인쇄한 경우에는 안내를 띄우지 않는다', () => {
    const { result } = renderHook(() => usePrintFlow(store({ 'zzaim.print.skipGuide': '1' })))
    act(() => result.current.request({ input: OK, focusPaper: vi.fn() }))
    act(() => result.current.done())
    expect(result.current.phase.kind).toBe('idle')
  })

  it('«안내 다시 보기»는 건너뛰기를 끈다 — 한 번 끄면 영영 못 보면 안 된다', () => {
    const { result } = renderHook(() => usePrintFlow(store({ 'zzaim.print.skipGuide': '1' })))
    act(() => result.current.showGuideAgain())
    expect(result.current.skip).toBe(false)
    act(() => result.current.request({ input: OK, focusPaper: vi.fn() }))
    expect(result.current.phase.kind).toBe('guide')
  })
})

/** 인쇄 CSS 는 **화면에서 검증할 수 없다** — jsdom 도, 브라우저 스크린샷도
 *  `@media print` 를 평가해 주지 않는다. 그래서 «훅을 달았는데 규칙이 없다»는
 *  실수를 정적으로 막는다 (실제로 zz-2 때 `data-print` 훅이 CSS 없이 붙어 있었다). */
describe('인쇄 CSS 훅', () => {
  const raw = readFileSync('src/styles/print.css', 'utf8')
  // 주석에는 «여기에 @page 를 쓰지 않는다»가 적혀 있다. 규칙만 본다
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
  const used = new Set(
    execSync(String.raw`grep -rho 'data-print="[a-z]*"' src || true`, { encoding: 'utf8' })
      .split('\n')
      .map((l) => l.match(/data-print="([a-z]+)"/)?.[1])
      .filter((v): v is string => Boolean(v)),
  )

  it('앱이 쓰는 훅이 하나도 빠짐없이 인쇄 규칙을 가진다', () => {
    expect(used.size).toBeGreaterThan(3)
    const missing = [...used].filter((role) => !css.includes(`[data-print='${role}']`))
    expect(missing).toEqual([])
  })

  it('지면 축소(transform)를 반드시 푼다 — 안 풀면 축소된 채 종이에 나간다', () => {
    expect(css).toMatch(/\[data-print='sheet'\][\s\S]*?transform:\s*none\s*!important/)
  })

  it('화면 전용 요소를 숨긴다', () => {
    expect(css).toMatch(/\[data-print='hide'\][\s\S]*?display:\s*none\s*!important/)
  })

  it('배경 그래픽을 그대로 내보낸다 — 등사기용 (D8)', () => {
    expect(css).toContain('print-color-adjust: exact')
  })

  it('@page 는 정적 CSS 에 없다 — 주입 1경로만 (D2)', () => {
    expect(css).not.toContain('@page')
  })
})
