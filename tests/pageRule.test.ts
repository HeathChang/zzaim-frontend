/** 인쇄 코어 — `@page` 는 **주입**한다. margin 은 언제나 0 이다. */
import { afterEach, describe, expect, it } from 'vitest'
import { applyPageRule, pageRuleCss } from '@/print/pageRule'

// 주입한 style 태그를 직접 치운다. 이걸 위해 제품 코드에 «지우기» 함수를
// 두면 아무도 안 쓰는 export 가 하나 늘어난다
afterEach(() => document.getElementById('zzaim-page-rule')?.remove())

describe('@page 규칙', () => {
  it('A4 는 210x297mm, margin 0', () => {
    expect(pageRuleCss('A4')).toBe('@page { size: 210mm 297mm; margin: 0; }')
  })

  it('B4 는 257x364mm (JIS)', () => {
    expect(pageRuleCss('B4')).toContain('257mm 364mm')
  })

  it('margin 은 어떤 용지에서도 0 이다 — 여백은 지면이 직접 그린다', () => {
    for (const size of ['A4', 'B4'] as const) {
      expect(pageRuleCss(size)).toContain('margin: 0')
    }
  })

  it('주입하면 style 태그가 하나 생긴다', () => {
    applyPageRule('A4')
    expect(document.querySelectorAll('#zzaim-page-rule')).toHaveLength(1)
  })

  it('용지를 바꾸면 내용만 갈아 끼운다 — 태그는 여전히 하나다', () => {
    applyPageRule('A4')
    applyPageRule('B4')
    const nodes = document.querySelectorAll('#zzaim-page-rule')
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.textContent).toContain('257mm')
  })

  it('같은 값을 다시 주면 건드리지 않는다 — 스타일 교체는 전체 리페인트를 부른다', () => {
    applyPageRule('A4')
    const node = document.getElementById('zzaim-page-rule')
    const before = node?.textContent
    applyPageRule('A4')
    expect(document.getElementById('zzaim-page-rule')).toBe(node)
    expect(node?.textContent).toBe(before)
  })
})
