#!/usr/bin/env node
/** 토큰 실값이 **디자인 시스템 원본**과 같은지 대조한다.
 *
 *  `tokens.test.ts` 는 tokens.css 를 읽어 기대값과 비교한다 — 둘 다 이 저장소
 *  안이라 **함께 틀릴 수 있다.** 진짜 출처는 디자인 시스템 파일이고, 그건
 *  문서 저장소에 있다. 그래서 이 검사는 테스트가 아니라 별도 스크립트다:
 *  문서 저장소가 없는 환경(CI 등)에서 조용히 통과하면 안 되고, 그렇다고
 *  형제 저장소를 테스트의 전제로 삼을 수도 없다.
 *
 *  사용:  node scripts/check-ds-sync.mjs [디자인시스템_styles.css_경로] */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_DS_DIR = join(ROOT, '../../zzaim-docs/planning/design/_ds')

function findDs() {
  const arg = process.argv[2]
  if (arg) return arg
  if (!existsSync(DEFAULT_DS_DIR)) return null
  for (const name of readdirSync(DEFAULT_DS_DIR)) {
    const p = join(DEFAULT_DS_DIR, name, 'styles.css')
    if (existsSync(p)) return p
  }
  return null
}

const dsPath = findDs()
if (!dsPath) {
  console.error('✗ 디자인 시스템 파일을 찾지 못했다.')
  console.error(`  기본 경로: ${DEFAULT_DS_DIR}/<theme>/styles.css`)
  console.error('  경로를 인자로 주거나 문서 저장소를 옆에 두어라.')
  process.exit(1)
}

const read = (text, name) => {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(text)
  return m ? m[1].trim() : null
}

const ds = readFileSync(dsPath, 'utf8')
const ours = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')

// 디자인 시스템이 소유하는 값만 대조한다. 골격 치수(--size-*)는 SS부록D 소유라 제외.
const OWNED = [
  'color-bg', 'color-surface', 'color-text', 'color-accent', 'color-accent-2', 'color-divider',
  ...Array.from({ length: 9 }, (_, i) => `color-neutral-${(i + 1) * 100}`),
  ...Array.from({ length: 9 }, (_, i) => `color-accent-${(i + 1) * 100}`),
  'space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8',
  'radius-sm', 'radius-md', 'radius-lg',
  'shadow-sm', 'shadow-md', 'shadow-lg',
  'font-heading-weight',
]

const bad = []
for (const name of OWNED) {
  const a = read(ds, name)
  const b = read(ours, name)
  if (a === null) { bad.push(`${name}: 디자인 시스템에 없다`); continue }
  if (b === null) { bad.push(`${name}: tokens.css 에 없다 (DS: ${a})`); continue }
  if (a !== b) bad.push(`${name}: DS «${a}» ≠ tokens.css «${b}»`)
}

if (bad.length) {
  console.error(`✗ 디자인 시스템과 어긋난 토큰 ${bad.length}건\n`)
  bad.forEach((l) => console.error('  ' + l))
  process.exit(1)
}
console.log(`✓ 토큰 ${OWNED.length}개가 디자인 시스템과 일치한다`)
console.log(`  출처: ${dsPath}`)
