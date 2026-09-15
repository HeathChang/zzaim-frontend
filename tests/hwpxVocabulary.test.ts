/** ★ **지어낸 마크업 금지 게이트** (zz-9 D5 «한컴 공개 문서를 근거로만 쓴다»).
 *
 *  이 영역의 가장 큰 위험은 «그럴듯하지만 없는 태그»다. 한글이 없으니 틀려도
 *  즉시 알 수 없고, 교사가 «손상된 문서»를 보고 나서야 드러난다.
 *
 *  그래서 **한글이 실제로 만든 파일의 어휘**(태그 111개 · 속성 415개)를 잠가 두고,
 *  우리가 내는 XML 이 그 밖으로 나가면 실패시킨다.
 *  어휘는 `hwpxlib`(Apache-2.0)에 들어 있는 한글 산출 표본 2개에서 뽑았다 —
 *  파일 자체가 아니라 **이름 목록**만 담는다.
 *
 *  ⚠ 이 게이트가 «한글에서 열린다»를 증명하지는 않는다. 다만 **지어낸 것은 없다**를
 *  증명한다 — 그것만으로도 원인 불명의 실패를 크게 줄인다. */
import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import vocabulary from './fixtures/hwpx-vocabulary.json'
import { exportHwpx, type ExportItem } from '@/export/hwpx'
import type { LayoutConfig, LayoutResult, Page } from '@/layout/types'

const allowed = vocabulary as Record<string, string[]>

const CONFIG: LayoutConfig = {
  pageSize: 'A4',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  fontScale: 100,
  startNumber: 1,
  box: 'border',
}

/** 문항·지문·여백을 **전부** 섞어 낸다 — 한 종류만 내면 게이트가 나머지를 못 본다 */
function sample(): Uint8Array {
  const pages: Page[] = [1, 2].map((index) => ({
    index,
    first: index === 1,
    capacity: 900,
    columns: [0, 1].map((c) => ({
      used: 800,
      items: [
        { key: `g${index}${c}`, number: null, numberRange: { from: 1, to: 3 }, overflow: false, carried: false, height: 100 },
        { key: `q${index}${c}`, number: index * 2 + c, overflow: false, carried: false, height: 100 },
        { key: `s${index}${c}`, number: null, overflow: false, carried: false, height: 30 },
      ],
    })),
  }))
  const items: ExportItem[] = pages.flatMap((p) =>
    p.columns.flatMap((col) =>
      col.items.map((i): ExportItem =>
        i.key.startsWith('g')
          ? { key: i.key, kind: 'group', instruction: '다음 글을 읽고 답하시오.', html: '<p>지문</p>' }
          : i.key.startsWith('s')
            ? { key: i.key, kind: 'spacer' }
            : { key: i.key, kind: 'question', html: '<p>발문 x &lt; 3</p><p>① 가</p>', points: 4 },
      ),
    ),
  )
  const layout: LayoutResult = {
    pages,
    overflowKeys: [],
    downgradedKeys: [],
    blankBack: false,
    geometry: { colWmm: 83.5, colHmm: 257, pageWmm: 210, pageHmm: 297 },
  }
  return exportHwpx({
    layout,
    config: CONFIG,
    items,
    headerLines: ['△△중학교 중간고사'],
    title: '중간고사',
    fontPx: 13.6,
    lineHeightPx: 18,
    now: new Date('2026-08-30T00:00:00Z'),
  })
}

interface Used {
  tag: string
  attrs: string[]
}

function usedIn(xml: string): Used[] {
  const out: Used[] = []
  const element = /<([a-zA-Z0-9:]+)((?:\s+[a-zA-Z0-9:_.-]+="[^"]*")*)\s*\/?>/g
  let m = element.exec(xml)
  while (m) {
    const attrs = [...(m[2] ?? '').matchAll(/([a-zA-Z0-9:_.-]+)="/g)].map((a) => a[1] as string)
    out.push({ tag: m[1] as string, attrs })
    m = element.exec(xml)
  }
  return out
}

/** 어휘를 벗어난 것들. 실제 파일과 «가짜 입력» 둘 다 이 함수로 잰다 —
 *  게이트가 진짜로 잡는지 확인하려면 같은 길을 지나야 한다 */
function violations(xml: string): string[] {
  const out: string[] = []
  for (const u of usedIn(xml)) {
    if (!(u.tag in allowed)) {
      out.push(u.tag)
      continue
    }
    const ok = allowed[u.tag] ?? []
    for (const a of u.attrs) {
      if (!ok.includes(a) && !a.startsWith('xmlns')) out.push(`${u.tag}@${a}`)
    }
  }
  return out
}

describe('지어낸 마크업 금지', () => {
  const files = unzipSync(sample())
  const xmlNames = Object.keys(files).filter((n) => n.endsWith('.xml') || n.endsWith('.hpf'))

  it('내보내는 XML 이 여러 개다 — 하나만 검사하면 의미가 없다', () => {
    expect(xmlNames.length).toBeGreaterThanOrEqual(6)
  })

  it('★ 내보내는 XML 전부가 한글 표본의 어휘 안에 있다', () => {
    const found = xmlNames.flatMap((name) =>
      violations(strFromU8(files[name]!)).map((v) => `${name}: ${v}`),
    )
    expect(found).toEqual([])
  })

  it('어휘 자물쇠가 비어 있지 않다 — 빈 사전은 모든 것을 통과시킨다', () => {
    expect(Object.keys(allowed).length).toBeGreaterThan(50)
    expect(allowed['hp:p']).toContain('pageBreak')
  })

  it('★ 게이트가 실제로 잡는다 — 통과만 하는 검사는 검사가 아니다', () => {
    expect(violations('<hp:madeUpTag a="1"/>')).toContain('hp:madeUpTag')
    expect(violations('<hp:p madeUpAttr="1"/>')).toContain('hp:p@madeUpAttr')
    expect(violations('<hp:p pageBreak="1"/>')).toEqual([])
  })
})
