/** zz-0 검증 — «오프라인에서 폰트가 self-host 로 로드된다. 외부 요청 0건».
 *
 *  프로토타입은 CDN 을 쓴다(편차 D-0.1). 그걸 그대로 옮기면 학교 망에서
 *  폰트가 대체 폰트로 떨어지고 **조판이 전부 밀린다**. 소스에서 막는다. */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => name.endsWith(e))) out.push(p)
  }
  return out
}

const FORBIDDEN = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
]

describe('외부 의존 금지 (PP§6.4 · HO§구현전반영1)', () => {
  it('소스 어디에도 CDN 주소가 없다', () => {
    const files = [
      ...walk(join(process.cwd(), 'src'), ['.ts', '.tsx', '.css']),
      join(process.cwd(), 'index.html'),
    ]
    const hits: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      for (const host of FORBIDDEN) if (text.includes(host)) hits.push(`${f} → ${host}`)
    }
    expect(hits).toEqual([])
  })

  it('@font-face 는 전부 /fonts/ 로컬 경로다', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/fonts.css'), 'utf8')
    const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1])
    expect(urls.length).toBeGreaterThan(0)
    for (const u of urls) expect(u).toMatch(/^\/fonts\//)
  })

  it('인쇄 CSS 에 프로토타입의 `@page margin: 0.5cm` 이 딸려오지 않았다', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/print.css'), 'utf8')
    // 주석 안의 경고문은 허용하고, 실제 선언만 잡는다
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(declarations).not.toMatch(/@page[^{]*\{[^}]*margin\s*:\s*(?!0)/)
  })
})
