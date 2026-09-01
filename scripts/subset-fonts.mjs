#!/usr/bin/env node
/** zz-0 D7 — 한글 서브셋 빌드 + **실제 용량 출력**.
 *
 *  왜 서브셋하는가: 한글 풀셋은 벌당 수 MB다. 5벌이면 첫 진입이 망가진다(PD-10).
 *  왜 용량을 «출력»하는가: 서브셋이 예산 안에 드는지는 **1~4주 실측 과제**이고,
 *  숫자를 보지 않으면 판단할 수 없다.
 *
 *  이 스크립트는 **글자 목록을 지어내지 않는다.** KS X 1001 수록 글자는
 *  EUC-KR 2바이트 시퀀스를 디코드해 얻는다 — 표를 손으로 옮겨 적으면 반드시 틀린다.
 *
 *  사용:  node scripts/subset-fonts.mjs [--dry]
 *    --dry  글자 집합만 계산해 coverage.json 을 쓴다 (원본 폰트 불필요) */

import { mkdirSync, existsSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'assets/fonts-src')
const OUT_DIR = join(ROOT, 'public/fonts')

/** EUC-KR 고정 영역에서 실제로 디코드되는 글자만 모은다. */
function decodeEucKrRange(hiFrom, hiTo) {
  const dec = new TextDecoder('euc-kr', { fatal: false })
  const out = new Set()
  for (let hi = hiFrom; hi <= hiTo; hi += 1) {
    for (let lo = 0xa1; lo <= 0xfe; lo += 1) {
      const ch = dec.decode(Uint8Array.from([hi, lo]))
      if (ch.length === 1 && ch !== '�') out.add(ch)
    }
  }
  return out
}

/** KS X 1001 완성형 한글 2,350자 (0xB0A1–0xC8FE) */
export function ksx1001Hangul() {
  const set = decodeEucKrRange(0xb0, 0xc8)
  return new Set([...set].filter((c) => c >= '가' && c <= '힣'))
}

/** KS X 1001 한자 4,888자 (0xCAA1–0xFDFE) — «상용 한자».
 *  ⚠ 코드포인트 범위로 거르지 않는다. 이 중 268자는 **호환 한자**(U+F900–U+FAFF)라
 *  «U+4E00–U+9FFF» 로 필터하면 조용히 빠진다 — 시험지에 실제로 나오는 글자들이다. */
export function ksx1001Hanja() {
  return decodeEucKrRange(0xca, 0xfd)
}

/** 기호·라틴 — 시험지에 반드시 나오는 것들.
 *  ①~⑮ 는 선택지라 빠지면 안 되고, ·〜 는 지시문에 쓰인다. */
export function baseChars() {
  const out = new Set()
  for (let cp = 0x20; cp <= 0x7e; cp += 1) out.add(String.fromCodePoint(cp)) // ASCII
  for (let cp = 0x2460; cp <= 0x246e; cp += 1) out.add(String.fromCodePoint(cp)) // ①~⑮
  for (const ch of '·…—–~〜「」『』〈〉《》【】·※→←↑↓°′″㎜㎝㎞㎡℃±×÷≤≥≠∞') out.add(ch)
  for (const ch of '“”‘’·、。') out.add(ch)
  return out
}

/** 첫 진입에 받는 글자 — **한자를 뺀다.**
 *
 *  실측(2026-08-29): Noto Serif KR 400 기준
 *    기호+한글 2,350자      →   336 KB
 *    기호+한글+한자 4,888자  → 1,235 KB
 *  **한자가 용량의 73%다.** 그런데 MVP 대상 과목(국어·영어·사회)의 본문은
 *  대부분 한자가 없다. 있는 시험지만 그때 받게 한다 (zz-0 D7 폴백 재사용). */
export function subsetCharset() {
  return new Set([...baseChars(), ...ksx1001Hangul()])
}

/** 한자만. 한글본과 겹치지 않으므로 **같은 글자를 두 번 받지 않는다** —
 *  브라우저가 글자마다 폰트 스택에서 가진 쪽을 고른다. */
export function hanjaCharset() {
  return ksx1001Hanja()
}

/** 원본은 **가변 폰트**(`wght` 축)다. 굵기마다 정적 인스턴스를 뽑은 뒤 서브셋한다.
 *  가변 폰트를 그대로 넣으면 파일 하나에 전 굵기가 들어가 훨씬 무겁고,
 *  `font-weight` 별 `@font-face` 와도 맞지 않는다. */
/** 첫 진입에 받는 것. UI 폰트(Sans)에는 **한자를 넣지 않는다** —
 *  라벨·수치에 한자가 나올 일이 없는데 벌당 600KB 를 더 받게 된다. */
const FACES = [
  { file: 'NotoSerifKR.ttf', weight: 400, out: 'noto-serif-kr-400-subset.woff2' },
  { file: 'NotoSerifKR.ttf', weight: 600, out: 'noto-serif-kr-600-subset.woff2' },
  { file: 'NotoSansKR.ttf', weight: 400, out: 'noto-sans-kr-400-subset.woff2' },
  { file: 'NotoSansKR.ttf', weight: 500, out: 'noto-sans-kr-500-subset.woff2' },
  { file: 'NotoSansKR.ttf', weight: 700, out: 'noto-sans-kr-700-subset.woff2' },
]

/** 한자가 든 시험지에서만 받는다. **지면 폰트만** 만든다 */
const HANJA_FACES = [
  { file: 'NotoSerifKR.ttf', weight: 400, out: 'noto-serif-kr-400-hanja.woff2' },
  { file: 'NotoSerifKR.ttf', weight: 600, out: 'noto-serif-kr-600-hanja.woff2' },
]

/** 전체본 — 서브셋 밖 글자를 만났을 때만 받는다 (zz-0 D7 폴백).
 *  지면 폰트만 만든다. UI 폰트는 틀어져도 인쇄물이 바뀌지 않는다. */
const FULL_FACES = [
  { file: 'NotoSerifKR.ttf', weight: 400, out: 'noto-serif-kr-400-full.woff2' },
  { file: 'NotoSerifKR.ttf', weight: 600, out: 'noto-serif-kr-600-full.woff2' },
]

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function main() {
  const dry = process.argv.includes('--dry')
  const chars = subsetCharset()
  mkdirSync(OUT_DIR, { recursive: true })

  // fontCoverage.ts 가 읽는 표. **여기가 유일한 출처다** — 코드에 목록을 박지 않는다.
  const hanja = hanjaCharset()
  const cp = (set) => [...set].map((c) => c.codePointAt(0)).sort((a, b) => a - b)
  const coveragePath = join(OUT_DIR, 'coverage.json')
  writeFileSync(
    coveragePath,
    JSON.stringify({
      count: chars.size,
      codepoints: cp(chars),
      // 서브셋 밖 글자가 **한자뿐**이면 한자본만 받으면 된다.
      // 그 밖의 글자(고전 한자·희귀자)면 전체본까지 가야 한다.
      hanja: cp(hanja),
    }),
  )
  console.log(`기본 글자 집합 ${chars.size}자 (한글 ${ksx1001Hangul().size} · 한자는 별도)`)
  console.log(`한자 ${hanja.size}자 — 필요할 때만 받는다`)
  console.log(`coverage.json ${kb(statSync(coveragePath).size)}`)
  if (dry) return

  let tool
  try {
    execFileSync('python3', ['-c', 'import fontTools, brotli'], { stdio: 'ignore' })
    tool = 'python3'
  } catch {
    console.error(
      [
        '',
        '✗ fontTools 가 없다. 서브셋을 만들 수 없다.',
        '  설치:  python3 -m pip install "fonttools[woff]" brotli',
        '',
        '  폰트 바이너리가 없으면 브라우저가 시스템 폰트로 떨어지고',
        '  **측정이 어긋난다** — 조판이 통째로 틀어진다 (zz-0 D7).',
      ].join('\n'),
    )
    process.exit(1)
  }

  if (!existsSync(SRC_DIR)) {
    console.error(`✗ 원본 폰트 폴더가 없다: ${SRC_DIR}`)
    console.error('  Noto Serif KR / Noto Sans KR 원본(.otf)을 여기에 두어라.')
    console.error('  CDN 금지(PP§6.4)이므로 빌드 시점에 파일로 갖고 있어야 한다.')
    process.exit(1)
  }

  const unicodes = [...chars].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(',')

  /** 가변 폰트에서 굵기 하나를 고정한 뒤 서브셋한다.
   *  `subsetChars` 가 null 이면 서브셋하지 않는다(전체본). */
  const build = (face, subsetChars) => {
    const src = join(SRC_DIR, face.file)
    const dest = join(OUT_DIR, face.out)
    const script = [
      'import sys',
      'from fontTools.ttLib import TTFont',
      'from fontTools.varLib import instancer',
      'from fontTools import subset',
      'src, dest, weight, uni = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]',
      'font = TTFont(src)',
      "if 'fvar' in font: font = instancer.instantiateVariableFont(font, {'wght': weight})",
      'opts = subset.Options()',
      'opts.flavor = "woff2"',
      'opts.layout_features = ["*"]',
      'opts.desubroutinize = False',
      'opts.notdef_outline = True',
      'sub = subset.Subsetter(options=opts)',
      'sub.populate(unicodes=[int(u[2:], 16) for u in uni.split(",")] if uni else [])',
      'if uni: sub.subset(font)',
      'font.flavor = "woff2"',
      'font.save(dest)',
    ].join('\n')
    execFileSync(tool, ['-c', script, src, dest, String(face.weight), subsetChars ?? ''], {
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    return [face.out, statSync(src).size, statSync(dest).size]
  }

  const hanjaUnicodes = [...hanja]
    .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`)
    .join(',')

  const rows = []
  const plan = [
    ...FACES.map((f) => [f, unicodes]),
    ...HANJA_FACES.map((f) => [f, hanjaUnicodes]),
    ...FULL_FACES.map((f) => [f, null]),
  ]
  for (const [face, chosen] of plan) {
    const src = join(SRC_DIR, face.file)
    if (!existsSync(src)) {
      console.error(`✗ 없음: ${face.file}`)
      process.exitCode = 1
      continue
    }
    rows.push(build(face, chosen))
  }

  console.log('\n서브셋 실측 — 예산 판단은 이 숫자로 한다 (zz-0 D7)')
  let first = 0
  let onDemand = 0
  for (const [name, before, after] of rows) {
    const tier = name.includes('-hanja') ? '한자' : name.includes('-full') ? '전체' : '첫 진입'
    if (tier === '첫 진입') first += after
    else onDemand += after
    console.log(`  [${tier}] ${name.padEnd(32)} ${kb(before).padStart(10)} → ${kb(after).padStart(10)}`)
  }
  console.log(`\n  첫 진입 합계        ${kb(first).padStart(10)}   <- 이 숫자가 첫 화면을 좌우한다`)
  console.log(`  필요할 때만        ${kb(onDemand).padStart(10)}`)
  if (existsSync(OUT_DIR)) {
    const woff2 = readdirSync(OUT_DIR).filter((f) => f.endsWith('.woff2'))
    const expected = FACES.length + HANJA_FACES.length + FULL_FACES.length
    if (woff2.length < expected) {
      console.error(`\n⚠ 기대한 ${expected}벌 중 ${woff2.length}벌만 만들어졌다.`)
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('subset-fonts.mjs')) main()
