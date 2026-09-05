/** 가져오기 — «제품의 급소» (PP§7). 여기가 귀찮으면 아무도 쓰지 않는다. */
import { describe, expect, it } from 'vitest'
import { purify, toBlocks, plainTextToBlocks, blocksToRaw } from '@/importing/sanitize'
import { segmentAll } from '@/importing/segment'
import { stripTokens } from '@/importing/extract'
import { classifyImage } from '@/importing/imagePlaceholder'
import { asSingleQuestion, classifyClipboard, importFromClipboard } from '@/importing/clipboard'
import { isSuspect, SUSPECT_THRESHOLD } from '@/importing/confidence'
import { sortRecent, MAX_RECENT } from '@/screens/S00/RecentFiles'
import { findGaps, isGapAt } from '@/importing/continuity'

describe('정제 — 구조만 건진다 (zz-3 D3)', () => {
  it('스크립트·스타일을 버린다 — 붙여넣기는 신뢰할 수 없는 입력이다 (PP§9.1)', () => {
    const out = purify('<p>문항</p><script>alert(1)</script><style>p{color:red}</style>')
    expect(out).toContain('문항')
    expect(out).not.toContain('script')
    expect(out).not.toContain('color:red')
  })

  it('★ 표는 남긴다 — 지문 박스와 자료 제시가 표로 온다', () => {
    const out = purify('<table><tr><td>지문</td></tr></table>')
    expect(out).toContain('<table')
    expect(out).toContain('지문')
  })

  it('인라인 스타일을 버린다 — 서식은 우리 조판이 소유한다', () => {
    expect(purify('<p style="font-size:99px">가</p>')).not.toContain('font-size')
  })

  it('★ 표칸 하나는 덩이 하나다 — 안쪽 문단을 따로 세면 지문이 조각난다', () => {
    // 이걸 어겨서 자동 분리 정확도가 98.1% → 97.0% 로 떨어진 적이 있다
    const blocks = toBlocks(purify('<table><tr><td><p>가</p><p>나</p></td></tr></table>'))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.text).toContain('가')
    expect(blocks[0]?.text).toContain('나')
  })

  it('문단은 각각 덩이가 된다', () => {
    expect(toBlocks(purify('<p>하나</p><p>둘</p>'))).toHaveLength(2)
  })

  it('서식 없는 텍스트도 줄 단위로 덩이가 된다', () => {
    const blocks = plainTextToBlocks('1. 첫 문항\n2. 둘째 문항')
    expect(blocks).toHaveLength(2)
  })

  it('★ 오프셋은 텍스트 기준이다 — 사용자가 보는 것이 텍스트이기 때문이다', () => {
    const blocks = toBlocks(purify('<p>가나</p><p>다라</p>'))
    const raw = blocksToRaw(blocks)
    expect(raw.slice(blocks[1]!.start, blocks[1]!.end)).toContain('다라')
  })
})

describe('클립보드', () => {
  it('무엇이 들어왔는지 가른다', () => {
    expect(classifyClipboard({ html: '<p>가</p>', text: '가' })).toBe('html')
    expect(classifyClipboard({ html: null, text: '가' })).toBe('plain')
    expect(classifyClipboard({ html: '   ', text: '  ' })).toBe('empty')
  })

  it('★ 서식 없는 텍스트는 그 사실을 알린다 — 표와 그림이 사라진다 (SS§2.6)', () => {
    const r = importFromClipboard({ html: null, text: '1. 문항입니다' })
    expect(r.plainTextOnly).toBe(true)
    expect(r.segments.length).toBeGreaterThan(0)
  })

  it('빈 클립보드는 빈 결과다 — 던지지 않는다', () => {
    const r = importFromClipboard({ html: null, text: '  ' })
    expect(r.segments).toEqual([])
    expect(r.raw).toBe('')
  })

  it('★ 문항을 못 찾으면 통째로 한 문항으로 담는다 — 빈손으로 돌려보내지 않는다 (SS§3.6)', () => {
    const empty = importFromClipboard({ html: '<p>번호 없는 글입니다</p>', text: '' })
    const single = asSingleQuestion({ ...empty, segments: [] })
    expect(single.segments).toHaveLength(1)
    expect(single.segments[0]?.role).toBe('question')
  })

  it('이미 문항을 찾았으면 건드리지 않는다', () => {
    const r = importFromClipboard({ html: '<p>1. 문항</p><p>2. 문항</p>', text: '' })
    expect(asSingleQuestion(r).segments).toBe(r.segments)
  })
})

describe('의심 판정', () => {
  it('신뢰도가 임계 아래면 의심이다 — 임계는 한 곳에서만 정한다', () => {
    expect(SUSPECT_THRESHOLD).toBeGreaterThan(0)
    expect(SUSPECT_THRESHOLD).toBeLessThan(1)
    expect(isSuspect({ confidence: SUSPECT_THRESHOLD - 0.01 } as never)).toBe(true)
    expect(isSuspect({ confidence: SUSPECT_THRESHOLD } as never)).toBe(false)
  })
})

describe('번호 연속성', () => {
  it('빠진 번호를 찾는다', () => {
    expect(findGaps([1, 2, 4]).length).toBeGreaterThan(0)
    expect(findGaps([1, 2, 3])).toEqual([])
  })

  it('빠진 자리인지 물을 수 있다', () => {
    const numbers = [1, 2, 4]
    const gapIndex = findGaps(numbers)[0]!.index
    expect(isGapAt(numbers, gapIndex)).toBe(true)
  })

  it('번호를 못 읽은 자리(null)는 빈칸 취급하지 않는다', () => {
    expect(() => findGaps([1, null, 3])).not.toThrow()
  })
})

describe('최근 파일', () => {
  it('최근 것이 앞에 오고 최대 5개다', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      name: `f${i}.etp`,
      openedAt: i,
      stale: false,
    }))
    const sorted = sortRecent(many)
    expect(sorted).toHaveLength(MAX_RECENT)
    expect(sorted[0]?.name).toBe('f8.etp')
  })
})

describe('본문 추출', () => {
  it('번호·배점 토큰을 본문에서 떼어 낸다 — 조판 엔진이 소유한다 (PP§6.1)', () => {
    const out = stripTokens(['1. 다음 중 옳은 것은? [3점]', '① 가'])
    expect(out[0]).not.toContain('[3점]')
    expect(out[0]).not.toMatch(/^1\./)
    // 둘째 줄의 번호처럼 보이는 것은 건드리지 않는다 — 지문 안의 열거일 수 있다
    expect(out[1]).toBe('① 가')
  })

  it('그림 종류를 가른다', () => {
    expect(classifyImage('data:image/png;base64,AA')).toBe('usable')
    expect(classifyImage('file:///c/1.png')).not.toBe('usable')
  })
})

describe('★ 가져오지 못한 그림을 표시한다 (zz-3 D7)', () => {
  it('file:// 이미지가 든 문항에 표시가 남는다', () => {
    const segs = segmentAll(
      toBlocks(purify('<p>1. 다음 그림을 보고 답하시오 <img src="file:///c/1.png"></p>')),
    )
    expect(segs[0]?.hasImage).toBe(true)
    expect(segs[0]?.hasMissingImage).toBe(true)
  })

  it('data: 이미지는 표시하지 않는다 — 읽을 수 있다', () => {
    const segs = segmentAll(
      toBlocks(purify('<p>1. 그림 문항입니다 <img src="data:image/png;base64,AA"></p>')),
    )
    expect(segs[0]?.hasMissingImage).toBe(false)
  })

  it('그림이 없는 문항은 표시가 없다', () => {
    const segs = segmentAll(toBlocks(purify('<p>1. 글자만 있는 문항입니다</p>')))
    expect(segs[0]?.hasMissingImage).toBe(false)
  })

  it('이미지 문항은 «너무 짧다»로 의심받지 않는다 — 글자가 적은 게 정상이다', () => {
    const segs = segmentAll(toBlocks(purify('<p>1. 그림<img src="data:image/png;base64,AA"></p>')))
    expect(segs[0]?.reasons).not.toContain('tooShort')
  })
})
