#!/usr/bin/env node
/** zz-0 D4·D11 의 lint 규칙 — 일반 ESLint 규칙으로는 표현할 수 없는 것들.
 *
 *  1. **문구 사전 강제** — `strings.ts` 밖에 한글 문자열 리터럴을 두지 않는다.
 *     같은 개념을 화면마다 다르게 부르면 사용자가 다시 배운다 (SS부록B).
 *  2. **금칙어** — «아이템»·«블록»·«문제은행»·«시크릿 모드» 는 교사의 말이 아니다.
 *  3. **accent 대비** — `--color-accent`(#b68235)는 배경 대비 ≈3.0:1 로 AA 본문
 *     기준(4.5:1) 미달이다. 24px 미만 텍스트에는 `--color-accent-700` 만 쓴다.
 *     24px 이상 표제·테두리·배경은 허용하되 **그 자리에 근거 주석을 남긴다.** */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const STRINGS_FILE = join(SRC, 'app/strings.ts')
/** ⚠ **좁은 예외 하나.** `header.ts` 의 «바탕글» 은 우리 문구가 아니라
 *  **한글이 정한 스타일 이름**이다. 문구 사전에 넣으면 «더 나은 표현»으로 고쳐져
 *  파일이 열리지 않게 된다 — 고칠 수 있는 말과 고치면 안 되는 식별자는 다르다. */
const FORMAT_IDENTIFIER_FILES = new Set([
  join(SRC, 'export/hwpx/header.ts'),
  // «함초롬바탕» 도 마찬가지다 — 한글에 설치된 폰트의 **이름**이라 번역·수정 대상이 아니다
  join(SRC, 'export/hwpx/fontMap.ts'),
  // `난이도:상` 의 «상/중/하» 는 **태그에 저장되는 값**이다. 문구 사전에 넣으면
  // «더 나은 표현»으로 고쳐지고, 그 순간 저장된 시험지의 난이도가 안 읽힌다
  join(SRC, 'domain/pointsBulk.ts'),
])

const HANGUL = /[가-힣]/
const BANNED = ['아이템', '문제은행', '시크릿 모드', '게스트 모드', '프로젝트 파일', '스코어']

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

/** 주석을 지운다 — 주석의 한글은 규칙 대상이 아니다(오히려 권장한다).
 *  문자열 안의 `//` 를 주석으로 오인하지 않도록 상태를 들고 훑는다. */
function stripComments(src) {
  let out = ''
  let i = 0
  let state = 'code' // code | line | block | single | double | tpl
  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    if (state === 'code') {
      if (c === '/' && next === '/') { state = 'line'; out += '  '; i += 2; continue }
      if (c === '/' && next === '*') { state = 'block'; out += '  '; i += 2; continue }
      if (c === "'") state = 'single'
      else if (c === '"') state = 'double'
      else if (c === '`') state = 'tpl'
      out += c; i += 1; continue
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c } else out += ' '
      i += 1; continue
    }
    if (state === 'block') {
      if (c === '*' && next === '/') { state = 'code'; out += '  '; i += 2; continue }
      out += c === '\n' ? c : ' '; i += 1; continue
    }
    // 문자열 안
    if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue }
    if ((state === 'single' && c === "'") || (state === 'double' && c === '"') || (state === 'tpl' && c === '`')) state = 'code'
    out += c; i += 1
  }
  return out
}

const problems = []
function report(file, line, msg) {
  problems.push(`${relative(ROOT, file)}:${line}  ${msg}`)
}

for (const file of walk(SRC)) {
  const raw = readFileSync(file, 'utf8')
  const code = stripComments(raw)
  const lines = code.split('\n')
  const rawLines = raw.split('\n')

  lines.forEach((line, idx) => {
    const n = idx + 1

    // 1) 문구 사전 — strings.ts 와 테스트는 예외
    if (file !== STRINGS_FILE && !FORMAT_IDENTIFIER_FILES.has(file) && !/\.test\.tsx?$/.test(file)) {
      const literals = line.match(/(['"`])(?:\\.|(?!\1).)*\1/g) ?? []
      for (const lit of literals) {
        if (HANGUL.test(lit)) {
          report(file, n, `한글 문자열 리터럴은 strings.ts 로: ${lit.slice(0, 30)}`)
          break
        }
      }
      // JSX 텍스트 노드의 한글도 잡는다 (따옴표가 없다)
      const jsxText = line.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '')
      if (/>[^<>{}]*[가-힣]/.test(jsxText)) {
        report(file, n, 'JSX 안의 한글 텍스트는 strings.ts 로')
      }
    }

    // 2) 금칙어 — 주석에서도 잡지 않는다(설명은 자유). 코드에서만.
    for (const word of BANNED) {
      if (line.includes(word)) report(file, n, `금칙어 «${word}» — SS부록B 의 말로 바꿔라`)
    }

    // 3) accent 대비 — 24px 이상이라는 근거 주석이 같은 줄이나 윗줄에 있어야 한다
    if (line.includes('var(--color-accent)')) {
      const near = `${rawLines[idx - 1] ?? ''}\n${rawLines[idx] ?? ''}`
      if (!/24px|대비 예외/.test(near)) {
        report(
          file,
          n,
          'var(--color-accent) 는 24px 미만 텍스트에 쓸 수 없다 (AA 3.0:1). --color-accent-700 을 쓰거나 «24px 이상» 근거를 주석으로 남겨라',
        )
      }
    }
  })
}

// 4) `layout/` 은 순수 함수만 — DOM·React 를 import 하지 않는다 (PP§9.3 · zz-2 불변2)
//    이게 지켜져야 측정값을 픽스처로 주입해 단위 테스트할 수 있고, 그것이
//    조판 엔진을 믿을 수 있는 유일한 근거다. 규율이 아니라 **검사**로 지킨다.
const PURE_DIR = join(SRC, 'layout')
const IMPURE = /^\s*import[^\n]*from\s+['"](react|react-dom)['"]/
const DOM_GLOBALS = /\b(document|window|HTMLElement|getBoundingClientRect)\b/
for (const file of walk(PURE_DIR)) {
  // 측정기는 DOM 을 쓰는 것이 일이다. `measure/` 만 예외로 둔다
  if (file.includes(`${sep}measure${sep}`)) continue
  const raw = readFileSync(file, 'utf8')
  const code = stripComments(raw)
  code.split('\n').forEach((line, i) => {
    if (IMPURE.test(line)) report(file, i + 1, 'layout/ 는 순수해야 한다 — react 를 import 하지 않는다')
    if (DOM_GLOBALS.test(line)) {
      report(file, i + 1, 'layout/ 는 순수해야 한다 — DOM 전역을 쓰지 않는다')
    }
  })
}

if (problems.length > 0) {
  console.error('✗ 관례 위반 %d건\n', problems.length)
  problems.forEach((p) => console.error('  ' + p))
  process.exit(1)
}
console.log('✓ 관례 검사 통과 — 문구 사전 · 금칙어 · accent 대비')
