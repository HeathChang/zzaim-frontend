#!/usr/bin/env node
/** 빌드 산출물의 `@page` 규칙을 검사한다 (zz-6 D2 «@page CI 게이트»).
 *
 *  왜 CI 게이트인가: `@page` 가 둘이면 나중 것이 이기고, **인쇄 여백이 조용히
 *  밀린다.** 화면은 멀쩡하고 종이만 다르다 — 사람이 자로 재기 전에는 모른다.
 *  프로토타입의 `support.js` 에 실제로 `@page { margin: 0.5cm }` 이 있으므로
 *  «실수로 옮겨오는» 일이 일어날 수 있다 (zz-0 편차 D-0.2).
 *
 *  규칙 둘:
 *  1. **정적 CSS 에 `@page` 는 0개** — 용지 크기가 런타임에 바뀌므로 주입한다
 *  2. 어디에도 **0 이 아닌 `@page` margin 은 없다** — 여백은 지면이 직접 그린다 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')

function walk(dir, exts) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, exts))
    else if (exts.some((e) => name.endsWith(e))) out.push(p)
  }
  return out
}

if (!existsSync(DIST)) {
  console.error('✗ dist/ 가 없다. 먼저 `npm run build` 를 돌려라.')
  process.exit(1)
}

const problems = []
const cssFiles = walk(DIST, ['.css'])
const jsFiles = walk(DIST, ['.js'])

// ① 정적 CSS 의 @page 는 0개여야 한다
for (const f of cssFiles) {
  const text = readFileSync(f, 'utf8')
  const hits = text.match(/@page[^{]*\{/g) ?? []
  if (hits.length > 0) {
    problems.push(`${relative(ROOT, f)} — 정적 CSS 에 @page 가 ${hits.length}개 있다 (0이어야 한다)`)
  }
}

// ② 어디에도 0 이 아닌 @page margin 이 없어야 한다
for (const f of [...cssFiles, ...jsFiles]) {
  const text = readFileSync(f, 'utf8')
  for (const block of text.match(/@page[^{]*\{[^}]*\}/g) ?? []) {
    const m = /margin\s*:\s*([^;}]+)/.exec(block)
    if (!m) continue
    const value = m[1].trim()
    if (!/^0(\s|$|;)/.test(value) && value !== '0') {
      problems.push(`${relative(ROOT, f)} — @page margin 이 «${value}» 다. 0 이어야 한다`)
    }
  }
}

// ③ 주입 경로가 실제로 존재하는지 (규칙이 아예 없으면 용지 크기가 안 나간다)
const injects = jsFiles.some((f) => /@page\s*\{\s*size:/.test(readFileSync(f, 'utf8')))
if (!injects) {
  problems.push('번들 어디에도 @page size 주입 코드가 없다 — 용지 크기가 인쇄에 반영되지 않는다')
}

if (problems.length > 0) {
  console.error(`✗ @page 게이트 실패 ${problems.length}건\n`)
  problems.forEach((p) => console.error('  ' + p))
  process.exit(1)
}
console.log('✓ @page 게이트 통과 — 정적 0개 · 주입 1경로 · margin 전부 0')
