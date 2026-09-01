/** 토큰이 디자인 시스템과 어긋나지 않는지 본다.
 *  값을 두 곳에 두면 반드시 갈라진다 — 그걸 자동으로 잡는다. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')

function value(name: string): string {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)
  if (!m?.[1]) throw new Error(`token not found: ${name}`)
  return m[1].trim()
}

describe('디자인 토큰', () => {
  it('색 실값이 DS 와 같다', () => {
    expect(value('color-bg')).toBe('#f3f2f2')
    expect(value('color-text')).toBe('#201f1d')
    expect(value('color-accent')).toBe('#b68235')
    expect(value('color-accent-700')).toBe('#7d5411')
    expect(value('color-neutral-700')).toBe('#605d5d')
  })

  it('골격 치수는 SS부록D 채택값이다 (zz-0 D5)', () => {
    expect(value('size-header')).toBe('40px')
    // HO 는 36 이지만 SS부록D 를 따른다 — «수치 우선»의 예외 (zz-0 D5)
    expect(value('size-statusbar')).toBe('32px')
    expect(value('size-dialog')).toBe('480px')
    // HO 는 600 이지만 SS부록D 를 따른다
    expect(value('size-help')).toBe('640px')
    expect(value('size-panel')).toBe('320px')
    expect(value('size-panel-narrow')).toBe('280px')
  })

  it('지면 본문 폰트는 Noto Serif KR 이다 — 조판 정확도가 여기 걸려 있다', () => {
    expect(value('font-paper')).toContain('Noto Serif KR')
  })
})
