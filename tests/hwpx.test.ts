/** zz-9 HWPX 내보내기.
 *
 *  ⚠ **이 테스트가 «한글에서 열린다»를 증명하지는 못한다** (D6). 한글이 없으면
 *  최종 확인은 사람이 해야 한다. 여기서 지키는 것은 그 앞단이다 —
 *  컨테이너 규칙, XML 적격성, 그리고 **우리가 약속한 것**(순서·쪽·단 경계). */
import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { exportHwpx, hwpxFileName, type ExportItem } from '@/export/hwpx'
import { htmlToLines } from '@/export/hwpx/fromPages'
import { escapeText, stripInvalidXmlChars } from '@/export/hwpx/xml'
import { PAGE_HWPUNIT, mmToHwp, pxToFontHeight } from '@/export/hwpx/units'
import { buildHeaderXml } from '@/export/hwpx/header'
import { EXPORT_FONT } from '@/export/hwpx/fontMap'
import type { LayoutConfig, LayoutResult, Page } from '@/layout/types'

const CONFIG: LayoutConfig = {
  pageSize: 'A4',
  columns: 2,
  gutter: 8,
  margin: { top: 20, bottom: 20, inner: 20, outer: 15 },
  fontScale: 100,
  startNumber: 1,
  box: 'border',
}

function page(index: number, first: boolean, cols: string[][]): Page {
  return {
    index,
    first,
    capacity: 900,
    columns: cols.map((keys) => ({
      used: 100,
      items: keys.map((key, i) => ({
        key,
        number: Number(key.replace(/\D/g, '')) || i + 1,
        overflow: false,
        carried: false,
        height: 100,
      })),
    })),
  }
}

function layout(pages: Page[]): LayoutResult {
  return {
    pages,
    overflowKeys: [],
    downgradedKeys: [],
    geometry: { colWmm: 83.5, colHmm: 257, pageWmm: 210, pageHmm: 297 },
    blankBack: false,
  }
}

const items = (keys: string[]): ExportItem[] =>
  keys.map((key) => ({ key, kind: 'question', html: `<p>${key} 본문</p>`, points: 4 }))

function build(pages: Page[], extra: Partial<Parameters<typeof exportHwpx>[0]> = {}) {
  const keys = pages.flatMap((p) => p.columns.flatMap((c) => c.items.map((i) => i.key)))
  const bytes = exportHwpx({
    layout: layout(pages),
    config: CONFIG,
    items: items(keys),
    title: '중간고사',
    fontPx: 13.6,
    lineHeightPx: 18,
    now: new Date('2026-08-30T00:00:00Z'),
    ...extra,
  })
  return { bytes, files: unzipSync(bytes) }
}

describe('컨테이너', () => {
  it('HWPX 가 요구하는 파일이 전부 들어 있다', () => {
    const { files } = build([page(1, true, [['q1'], ['q2']])])
    expect(Object.keys(files).sort()).toEqual(
      [
        'Contents/content.hpf',
        'Contents/header.xml',
        'Contents/section0.xml',
        'META-INF/container.xml',
        'META-INF/manifest.xml',
        'Preview/PrvText.txt',
        'mimetype',
        'settings.xml',
        'version.xml',
      ].sort(),
    )
  })

  it('★ mimetype 이 맨 앞에 무압축으로 들어간다 — OCF 컨테이너의 규칙이다', () => {
    const { bytes } = build([page(1, true, [['q1']])])
    const head = strFromU8(bytes.slice(0, 64))
    expect(head.indexOf('mimetype')).toBe(30)
    // 저장(0) 방식이면 압축 방식 필드가 0 이다
    expect(bytes[8]).toBe(0)
    expect(bytes[9]).toBe(0)
    expect(head).toContain('application/hwp+zip')
  })

  it('파일 이름에서 경로 문자를 걷어낸다 — 그대로 두면 저장이 실패한다', () => {
    const now = new Date('2026-08-30T00:00:00Z')
    expect(hwpxFileName('1학기/중간', now)).toBe('1학기중간.hwpx')
    expect(hwpxFileName('   ', now)).toBe('시험지-2026-08-30.hwpx')
  })
})

describe('XML 적격성', () => {
  function parse(xml: string): Document {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
    return doc
  }

  it('생성한 XML 셋이 전부 파싱된다', () => {
    const { files } = build([page(1, true, [['q1'], ['q2']])])
    for (const name of ['Contents/header.xml', 'Contents/section0.xml', 'Contents/content.hpf']) {
      parse(strFromU8(files[name]!))
    }
  })

  it('★ 부등호가 든 본문이 파일을 깨뜨리지 않는다 — 시험지에 «x < 3» 은 흔하다', () => {
    const bytes = exportHwpx({
      layout: layout([page(1, true, [['q1']])]),
      config: CONFIG,
      items: [{ key: 'q1', kind: 'question', html: '<p>x &lt; 3 이고 a &amp; b</p>', points: 3 }],
      title: '보기 <가>',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    const files = unzipSync(bytes)
    const doc = parse(strFromU8(files['Contents/section0.xml']!))
    expect(doc.documentElement.textContent).toContain('x < 3 이고 a & b')
    parse(strFromU8(files['Contents/content.hpf']!))
  })

  it('제어문자를 걷어낸다 — 붙여넣기에 섞여 들어온다', () => {
    expect(stripInvalidXmlChars('가\u0000나\u0008다')).toBe('가나다')
    expect(stripInvalidXmlChars('줄\n바꿈\t탭')).toBe('줄\n바꿈\t탭')
    expect(escapeText('a<b>&c')).toBe('a&lt;b&gt;&amp;c')
  })
})

describe('단위', () => {
  it('★ HWPUNIT 은 1/7200 인치다', () => {
    expect(mmToHwp(210)).toBe(59528)
    expect(mmToHwp(25.4)).toBe(7200)
  })

  it('★ 용지 크기는 계산하지 않고 한글이 쓰는 값을 쓴다 — 297mm 는 84189 가 아니라 84188 이다', () => {
    expect(PAGE_HWPUNIT.A4).toEqual({ width: 59528, height: 84188 })
    expect(mmToHwp(297)).toBe(84189)
  })

  it('글자 크기는 1/100 pt 다 — HWPUNIT 이 아니다', () => {
    // 13.6px = 10.2pt
    expect(pxToFontHeight(13.6)).toBe(1020)
  })
})

describe('폰트 (D4)', () => {
  it('★ 함초롬바탕을 지정한다 — Noto Serif KR 을 적으면 없는 PC 에서 크게 어긋난다', () => {
    const xml = buildHeaderXml({ fontPx: 13.6, lineHeightPx: 18 })
    expect(xml).toContain(EXPORT_FONT)
    expect(xml).not.toContain('Noto')
  })

  it('언어 7종을 모두 채운다 — 한 언어라도 비면 한자·기호가 엉뚱한 폰트로 떨어진다', () => {
    const xml = buildHeaderXml({ fontPx: 13.6, lineHeightPx: 18 })
    for (const lang of ['HANGUL', 'LATIN', 'HANJA', 'JAPANESE', 'OTHER', 'SYMBOL', 'USER']) {
      expect(xml).toContain(`lang="${lang}"`)
    }
  })

  it('글자 크기와 행간이 조판 값에서 온다', () => {
    const xml = buildHeaderXml({ fontPx: 20, lineHeightPx: 30 })
    expect(xml).toContain('height="1500"')
    expect(xml).toContain('value="150"')
  })
})

describe('★ 보장하는 것 — 순서 · 쪽 경계 · 단 경계 (D2)', () => {
  function paras(section: string) {
    return [...section.matchAll(/<hp:p [^>]*pageBreak="(\d)" columnBreak="(\d)"[^>]*>/g)].map(
      (m) => ({ page: m[1] === '1', column: m[2] === '1' }),
    )
  }

  it('쪽이 바뀌는 자리에 쪽 나누기가 들어간다', () => {
    const { files } = build([
      page(1, true, [['q1'], ['q2']]),
      page(2, false, [['q3'], ['q4']]),
    ])
    const section = strFromU8(files['Contents/section0.xml']!)
    const p = paras(section)
    expect(p).toHaveLength(4)
    // 1쪽1단 · 1쪽2단 · 2쪽1단 · 2쪽2단
    expect(p.map((x) => (x.page ? 'P' : x.column ? 'C' : '-'))).toEqual(['-', 'C', 'P', 'C'])
  })

  it('★ 첫 단이 비어도 쪽 경계는 살아남는다 — 사라지면 뒷 쪽이 앞으로 딸려 올라간다', () => {
    // 2쪽의 **첫 단이 비어 있다**
    const pages: Page[] = [page(1, true, [['q1'], ['q2']]), page(2, false, [[], ['q3']])]
    expect(pages[1]!.columns[0]!.items).toHaveLength(0)
    const { files } = build(pages)
    const p = paras(strFromU8(files['Contents/section0.xml']!))
    expect(p.filter((x) => x.page)).toHaveLength(1)
  })

  it('★ 첫 문단은 절대 넘기지 않는다 — 앞에 빈 쪽이 생긴다', () => {
    const { files } = build([page(1, true, [['q1']])])
    const p = paras(strFromU8(files['Contents/section0.xml']!))
    expect(p[0]).toEqual({ page: false, column: false })
  })

  it('문항 순서가 배치 그대로다 — 내보내기가 다시 정렬하지 않는다', () => {
    const { files } = build([page(1, true, [['q7', 'q3'], ['q5']])])
    const text = strFromU8(files['Preview/PrvText.txt']!)
    expect(text.indexOf('q7')).toBeLessThan(text.indexOf('q3'))
    expect(text.indexOf('q3')).toBeLessThan(text.indexOf('q5'))
  })

  it('★ 번호를 다시 매기지 않는다 — 배치가 정한 번호를 글자로 박는다', () => {
    const bytes = exportHwpx({
      layout: layout([page(1, true, [['q1']])]),
      config: CONFIG,
      items: [{ key: 'q1', kind: 'question', html: '<p>다음 중 옳은 것은?</p>', points: 3 }],
      title: 't',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    const text = strFromU8(unzipSync(bytes)['Preview/PrvText.txt']!)
    expect(text).toContain('1. 다음 중 옳은 것은? [3점]')
  })

  it('★ 배점은 «선택지 직전 줄»에 붙는다 — 첫 줄에 붙이면 발문 한가운데 끼어든다', () => {
    const bytes = exportHwpx({
      layout: layout([page(1, true, [['q1']])]),
      config: CONFIG,
      items: [
        {
          key: 'q1',
          kind: 'question',
          // 원본이 이렇게 온다 — 발문 한 문장이 두 문단으로 쪼개져 있다
          html: '<p>윗글의 서술 방식으로</p><p>가장 적절한 것은?</p><p>① 가</p><p>② 나</p>',
          points: 3,
        },
      ],
      title: 't',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    const text = strFromU8(unzipSync(bytes)['Preview/PrvText.txt']!)
    expect(text).toContain('가장 적절한 것은? [3점]')
    expect(text).not.toContain('윗글의 서술 방식으로 [3점]')
  })

  it('선택지가 첫 줄이면 배점을 맨 앞에 둔다 — 붙일 발문이 없다', () => {
    const bytes = exportHwpx({
      layout: layout([page(1, true, [['q1']])]),
      config: CONFIG,
      items: [{ key: 'q1', kind: 'question', html: '<p>① 가</p><p>② 나</p>', points: 2 }],
      title: 't',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    expect(strFromU8(unzipSync(bytes)['Preview/PrvText.txt']!)).toContain('1. [2점]')
  })
})

describe('★ 문항을 한 덩어리로 묶는다 (D2)', () => {
  it('마지막 줄만 «끊어도 됨» 이다 — 나머지는 다음 줄과 붙어 다닌다', () => {
    const bytes = exportHwpx({
      layout: layout([page(1, true, [['q1']])]),
      config: CONFIG,
      items: [{ key: 'q1', kind: 'question', html: '<p>가</p><p>나</p><p>다</p>', points: 0 }],
      title: 't',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    const s = strFromU8(unzipSync(bytes)['Contents/section0.xml']!)
    const ids = [...s.matchAll(/<hp:p [^>]*paraPrIDRef="(\d)"/g)].map((m) => m[1])
    // 0 = 붙임 · 1 = 끊어도 됨
    expect(ids).toEqual(['0', '0', '1'])
  })

  it('문단 자체도 쪼개지 않는다 — keepLines 가 켜져 있다', () => {
    const xml = buildHeaderXml({ fontPx: 13.6, lineHeightPx: 18 })
    const keeps = [...xml.matchAll(/keepWithNext="(\d)" keepLines="(\d)"/g)].map((m) => m.slice(1))
    expect(keeps).toEqual([
      ['1', '1'],
      ['0', '1'],
    ])
  })
})

describe('용지와 단', () => {
  it('용지·여백·단이 우리 설정에서 온다 — 한글에 맡기면 단 폭이 달라진다', () => {
    const { files } = build([page(1, true, [['q1'], ['q2']])])
    const s = strFromU8(files['Contents/section0.xml']!)
    expect(s).toContain(`width="${PAGE_HWPUNIT.A4.width}" height="${PAGE_HWPUNIT.A4.height}"`)
    expect(s).toContain(`left="${mmToHwp(20)}" right="${mmToHwp(15)}"`)
    expect(s).toContain('colCount="2"')
    expect(s).toContain(`<hp:colSz width="${mmToHwp(83.5)}" gap="${mmToHwp(8)}"/>`)
  })

  it('B4 도 낸다 (UD-21 — 실측은 미검증)', () => {
    const bytes = exportHwpx({
      layout: layout([page(1, true, [['q1']])]),
      config: { ...CONFIG, pageSize: 'B4' },
      items: items(['q1']),
      title: 't',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    const s = strFromU8(unzipSync(bytes)['Contents/section0.xml']!)
    expect(s).toContain(`width="${PAGE_HWPUNIT.B4.width}" height="${PAGE_HWPUNIT.B4.height}"`)
  })
})

describe('본문 → 줄', () => {
  it('블록 경계에서만 나눈다 — 문항 구조를 해석하지 않는다 (PP§6.1)', () => {
    expect(htmlToLines('<p>발문</p><p>① 가</p><p>② 나</p>')).toEqual(['발문', '① 가', '② 나'])
  })

  it('줄바꿈과 빈 줄을 정리한다', () => {
    expect(htmlToLines('<p>가  나<br>다</p><p>  </p>')).toEqual(['가 나', '다'])
  })

  it('★ 엔티티를 «amp 마지막» 순서로 푼다 — 먼저 풀면 &amp;lt; 가 < 가 된다', () => {
    expect(htmlToLines('<p>&amp;lt;보기&amp;gt;</p>')).toEqual(['&lt;보기&gt;'])
  })
})

describe('지문 묶음', () => {
  it('지시문에 범위가 붙고 지문은 상자로 나간다', () => {
    const pages: Page[] = [
      {
        index: 1,
        first: true,
        capacity: 900,
        columns: [
          {
            used: 100,
            items: [
              {
                key: 'g1',
                number: null,
                numberRange: { from: 1, to: 3 },
                overflow: false,
                carried: false,
                height: 100,
              },
            ],
          },
        ],
      },
    ]
    const bytes = exportHwpx({
      layout: layout(pages),
      config: CONFIG,
      items: [
        {
          key: 'g1',
          kind: 'group',
          instruction: '다음 글을 읽고 물음에 답하시오.',
          html: '<p>지문 본문이다.</p>',
        },
      ],
      title: 't',
      fontPx: 13.6,
      lineHeightPx: 18,
      now: new Date('2026-08-30T00:00:00Z'),
    })
    const s = strFromU8(unzipSync(bytes)['Contents/section0.xml']!)
    expect(s).toContain('[1~3] 다음 글을 읽고 물음에 답하시오.')
    // 상자 = 1행 1열 표
    expect(s).toContain('<hp:tbl')
    expect(s).toContain('rowCnt="1" colCnt="1"')
    expect(s).toContain(`<hp:cellSz width="${mmToHwp(83.5)}"`)
  })
})
