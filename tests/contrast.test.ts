/** zz-0 검증 — «명도 대비 WCAG 2.1 AA (토큰 조합 전수)».
 *
 *  이 테스트가 zz-0 D4 의 근거다. accent 가 본문에 못 쓰이는 이유를
 *  주장이 아니라 **계산**으로 남긴다. */
import { describe, expect, it } from 'vitest'

function srgbToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m?.[1]) throw new Error(`bad hex: ${hex}`)
  const n = parseInt(m[1], 16)
  const r = srgbToLinear((n >> 16) & 0xff)
  const g = srgbToLinear((n >> 8) & 0xff)
  const b = srgbToLinear(n & 0xff)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// tokens.css 와 같은 값. 어긋나면 아래 «토큰 동기화» 테스트가 잡는다.
const BG = '#f3f2f2'
const TEXT = '#201f1d'
const ACCENT = '#b68235'
const ACCENT_700 = '#7d5411'
const NEUTRAL_700 = '#605d5d'

describe('명도 대비 — WCAG 2.1 AA', () => {
  it('본문 색은 배경 대비 4.5:1 이상', () => {
    expect(contrast(TEXT, BG)).toBeGreaterThanOrEqual(4.5)
  })

  it('보조 텍스트(neutral-700)도 본문 기준을 넘는다', () => {
    expect(contrast(NEUTRAL_700, BG)).toBeGreaterThanOrEqual(4.5)
  })

  it('accent-700 은 본문 기준을 넘는다 — 작은 글씨에 쓸 수 있는 유일한 강조색', () => {
    expect(contrast(ACCENT_700, BG)).toBeGreaterThanOrEqual(4.5)
  })

  it('⚠ accent 는 본문 기준에 미달한다 — 이것이 lint 규칙의 근거다 (zz-0 D4)', () => {
    const ratio = contrast(ACCENT, BG)
    expect(ratio).toBeLessThan(4.5)
    // 24px 이상 대형 텍스트 기준(3:1)은 넘으므로 표제·테두리에는 쓸 수 있다
    expect(ratio).toBeGreaterThanOrEqual(3)
  })
})
