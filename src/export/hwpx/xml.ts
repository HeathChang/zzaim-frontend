/** XML 조립 도우미.
 *
 *  ⚠ **이스케이프를 빠뜨리면 파일이 열리지 않는다.** 시험지 본문에는 부등호가
 *  흔하다(«x < 3», «A → B», 보기의 «<보기>»). 하나라도 새면 한글이 «손상된
 *  문서»라고 말하고 그 자리에서 끝이다 — 교사는 원인을 알 수 없다. */

/** 텍스트 노드용. `<`, `&` 는 반드시, `>` 는 `]]>` 사고를 막으려고 함께 막는다 */
export function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 속성값용. 텍스트 규칙에 따옴표를 더한다 */
export function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/** XML 1.0 이 **표현할 수 없는 문자**를 걷어낸다.
 *  붙여넣기에는 제어문자가 섞여 들어오는 일이 있고, 그대로 넣으면 파일이 깨진다.
 *  탭·줄바꿈은 남긴다 — 문단을 나눌 때 쓴다. */
/** XML 1.0 이 허용하는 문자인가 (Char 생산 규칙 그대로).
 *  정규식 대신 코드포인트로 판정한다 — 소스에 제어문자를 박아 넣지 않는 편이
 *  읽기에도 낫고, 편집기·도구가 그 글자를 조용히 먹는 사고도 막는다. */
function isXmlChar(code: number): boolean {
  if (code === 0x09 || code === 0x0a || code === 0x0d) return true
  if (code >= 0x20 && code <= 0xd7ff) return true
  if (code >= 0xe000 && code <= 0xfffd) return true
  return code >= 0x10000 && code <= 0x10ffff
}

export function stripInvalidXmlChars(value: string): string {
  let out = ''
  for (const ch of value) {
    if (isXmlChar(ch.codePointAt(0) ?? 0)) out += ch
  }
  return out
}

export const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>'

/** 한글 문서가 쓰는 이름공간 모음. 실제 산출물에서 그대로 옮겼다 —
 *  일부만 선언하면 `hp10:`·`hc:` 같은 접두사가 미정의가 되어 열리지 않는다. */
export const NAMESPACES = [
  'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"',
  'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"',
  'xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph"',
  'xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"',
  'xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"',
  'xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"',
  'xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history"',
  'xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page"',
  'xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:opf="http://www.idpf.org/2007/opf/"',
  'xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart"',
  'xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar"',
  'xmlns:epub="http://www.idpf.org/2007/ops"',
  'xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"',
].join(' ')
