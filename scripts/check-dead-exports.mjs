/** ★ **«부품은 있는데 아무도 안 부른다» 를 빌드에서 막는다.**
 *
 *  이 프로젝트가 되풀이한 가장 비싼 결함이다:
 *  - zz-1: 저장소 15파일이 전부 import 0곳
 *  - zz-3: 이미지 자리표시자가 화면에 안 붙음
 *  - zz-4: `G` 키가 등록되지 않음
 *  - zz-6: `autosave.touch()` 를 부르는 곳이 없어 자동 저장이 한 번도 안 돎
 *  - zz-8: 되돌리기 스택에 `push`·`undo` 가 아무 데서도 안 불림
 *  - 전체 리뷰: 한자 폰트 폴백·드래그 자동 스크롤·저장 권한 확인이 전부 죽어 있었다
 *
 *  전부 **타입 검사도 테스트도 통과하는** 결함이다. 부품마다 테스트가 붙어 있어서
 *  오히려 초록이 더 짙어 보인다. 기계로만 잡힌다.
 *
 *  규칙: `src/` 가 내보내는 **값**(함수·상수·컴포넌트)은 `src/` 안 어딘가에서
 *  쓰여야 한다. 타입은 대상이 아니다(프롭 타입은 내보내는 것이 관례다).
 *  테스트만 쓰는 것은 **통과가 아니다** — 테스트는 제품이 아니다. */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

/** 모듈 수준 상태를 테스트가 씻어내기 위한 이음매.
 *  «제품이 안 쓴다»가 맞지만, **모듈 캐시는 테스트 사이로 샌다** —
 *  이걸 막을 다른 방법이 주입뿐인데 그건 제품 코드를 테스트 모양으로 비트는 일이다. */
const TEST_SEAMS = new Map([
  ['app/fontFallback.ts', 'resetCoverageCache — 커버리지 표 모듈 캐시 비우기'],
  ['storage/cache/cacheStore.ts', 'createMemoryCache — Dexie 없이 도는 캐시 대역'],
])

/** 아직 화면이 없어 쓰이지 않는 것들. **이유를 적지 않으면 넣을 수 없다.** */
const DEFERRED = new Map([
  ['components/TagFilter.tsx', 'S-03 보관함 검색·태그 — OD-02 로 v1'],
  ['components/PassageGroupCard.tsx', 'S-03 보관함 지문 묶음 카드 — OD-02 로 v1'],
  ['components/Toast.tsx', 'v1 알림. MVP 는 상태바·aria-live 로 알린다'],
])

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

const files = walk(SRC)
const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]))

// 값만 본다. `export type`·`export interface` 는 제외
const VALUE_EXPORT = /^export (?:async )?(?:function|const|class) (\w+)/gm

const problems = []
for (const [file, src] of text) {
  const rel = relative(SRC, file).split('\\').join('/')
  if (DEFERRED.has(rel) || TEST_SEAMS.has(rel)) continue
  for (const m of src.matchAll(VALUE_EXPORT)) {
    const name = m[1]
    const word = new RegExp(`\\b${name}\\b`)
    const usedElsewhere = [...text].some(([g, o]) => g !== file && word.test(o))
    if (usedElsewhere) continue
    // 자기 파일 안에서 쓰이면 내부 헬퍼다 — 테스트 노출은 정상
    const ownUses = (src.match(word.source ? new RegExp(word.source, 'g') : word) ?? []).length
    if (ownUses > 1) continue
    problems.push(`${rel}: ${name}`)
  }
}

if (problems.length > 0) {
  console.error('✗ 아무도 쓰지 않는 export ' + problems.length + '건')
  for (const p of problems) console.error('  ' + p)
  console.error('\n  쓰거나, 지우거나, 이유를 적고 DEFERRED 에 넣을 것.')
  console.error('  «부품은 있는데 아무도 안 부른다» 가 이 프로젝트의 단골 결함이다.')
  process.exit(1)
}
console.log(
  `✓ 죽은 부품 없음 — 값 export 전부 사용됨 (유예 ${DEFERRED.size}건 · 테스트 이음매 ${TEST_SEAMS.size}건)`,
)
