/** 정제 — «구조만 건진다» (zz-3 D3 · PP§7.1).
 *
 *  붙여넣기 HTML 은 **신뢰 불가 입력**이다. DOMPurify 를 거친다 (PP§9.1).
 *
 *  그리고 한글이 뱉는 마크업에는 쓸 것보다 버릴 것이 많다 — 인라인 스타일,
 *  `mso-*` 잔재, 빈 문단. 다만 **표는 보존한다**: 지문 박스와 자료 제시가 표로 온다. */
import DOMPurify from 'dompurify'
import type { Block } from '@/importing/types'
import { classifyImage } from '@/importing/imagePlaceholder'

/** 살려 둘 태그. 표를 남기는 것이 핵심이다 */
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'sup', 'sub', 'span', 'div',
  'table', 'tbody', 'thead', 'tr', 'td', 'th',
  'ul', 'ol', 'li', 'img',
]

/** 살려 둘 속성. 스타일은 전부 버린다 — 우리 조판이 서식을 소유한다 */
const ALLOWED_ATTR = ['src', 'alt', 'colspan', 'rowspan', 'border']

export function purify(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // 한글이 남기는 조건부 주석·office 네임스페이스를 지운다
    FORBID_TAGS: ['style', 'script', 'head', 'meta', 'link', 'o:p'],
    KEEP_CONTENT: true,
  })
}

const BLOCK_SELECTOR = 'p, td, th, li, img'

/** 정제된 HTML 에서 «덩이»를 뽑는다.
 *
 *  `start`/`end` 는 **텍스트가 누적된 오프셋**이다. zz-4 가 원본을 강조할 때 쓴다.
 *  HTML 문자열 오프셋이 아니라 텍스트 오프셋인 이유: 사용자가 보는 것이 텍스트고,
 *  강조도 텍스트 위에서 일어난다. */
export function toBlocks(cleanHtml: string, doc: Document = document): Block[] {
  const host = doc.createElement('div')
  host.innerHTML = cleanHtml

  const blocks: Block[] = []
  let offset = 0

  // ⚠ **바깥 덩이를 잡으면 그 안으로 더 들어가지 않는다.**
  // `<td><p>가</p><p>나</p></td>` 는 **표칸 하나**다 — 지문 박스 한 덩이지
  // 문단 두 개가 아니다. 안쪽까지 세면 지문이 여러 조각으로 쪼개지고
  // 경계 판정이 통째로 흔들린다.
  const captured: Element[] = []
  const isInsideCaptured = (el: Element): boolean =>
    captured.some((c) => c !== el && c.contains(el))

  for (const el of host.querySelectorAll(BLOCK_SELECTOR)) {
    const tagName = el.tagName.toLowerCase()
    if (isInsideCaptured(el)) continue

    if (tagName === 'img') {
      // 이미지 자체가 한 덩이다 (zz-3 D7)
      const src = el.getAttribute('src') ?? ''
      blocks.push({
        text: '',
        tag: 'img',
        hasImage: true,
        imageSrc: src,
        // 한글이 주는 `file://` 경로는 브라우저가 못 읽는다 (zz-3 D7)
        imageStatus: classifyImage(src),
        start: offset,
        end: offset,
      })
      continue
    }

    const hasImage = el.querySelector('img') !== null
    const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim()
    // 빈 문단은 버린다. 단 이미지를 품고 있으면 남긴다 — 그림 자리다
    if (!text && !hasImage) continue

    captured.push(el)
    const tag = tagName === 'th' ? 'td' : (tagName as 'p' | 'td' | 'li')
    const imgSrc = el.querySelector('img')?.getAttribute('src') ?? undefined
    blocks.push({
      text,
      tag,
      hasImage,
      ...(imgSrc ? { imageSrc: imgSrc } : {}),
      ...(hasImage ? { imageStatus: classifyImage(imgSrc) } : {}),
      start: offset,
      end: offset + text.length,
    })
    offset += text.length + 1 // 줄바꿈 한 칸
  }

  return blocks
}

/** 서식 없는 평문. 메모장 경유 등으로 `text/html` 이 없는 경우가 잦다 (SS§2.6).
 *  **표와 그림은 사라진다** — 그 사실을 사용자에게 알려야 한다. */
export function plainTextToBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let offset = 0
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(/\u00a0/g, ' ').trim()
    if (!t) continue
    blocks.push({ text: t, tag: 'p', hasImage: false, start: offset, end: offset + t.length })
    offset += t.length + 1
  }
  return blocks
}

/** 정제 결과의 «원본 텍스트». 세그먼트의 오프셋이 이것을 가리킨다 */
export function blocksToRaw(blocks: readonly Block[]): string {
  return blocks.map((b) => b.text).join('\n')
}
