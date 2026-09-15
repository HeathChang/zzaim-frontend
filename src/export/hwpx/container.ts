/** HWPX 컨테이너 (zz-9 D5).
 *
 *  HWPX 는 zip 이다 — `.etp` 와 같은 `fflate` 를 재사용한다(갭표 «재사용»).
 *
 *  ⚠ **`mimetype` 은 맨 앞에, 압축하지 않고 넣는다.** OCF 계열 컨테이너의 규칙이고
 *  실제 한글 산출물도 그렇다(`mimetype` 19바이트가 첫 항목). 압축해 넣으면
 *  일부 판독기가 컨테이너를 알아보지 못한다. */
import { zipSync, strToU8 } from 'fflate'
import { NAMESPACES, XML_DECL, escapeText } from '@/export/hwpx/xml'

export const HWPX_MIMETYPE = 'application/hwp+zip'

export interface ContainerInput {
  headerXml: string
  sectionXml: string
  /** 미리보기 텍스트 — 탐색기·한글이 내용을 훑을 때 쓴다 */
  previewText: string
  title: string
  /** 파일에 적을 시각. **테스트가 잡을 수 있게 주입한다** */
  now: Date
}

function versionXml(): string {
  return (
    XML_DECL +
    '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version"' +
    ' tagetApplication="WORDPROCESSOR" major="5" minor="0" micro="5" buildNumber="0"' +
    ' os="1" xmlVersion="1.4" application="zzaim" appVersion="1.0"/>'
  )
}

function containerXml(): string {
  return (
    XML_DECL +
    '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container"' +
    ' xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">' +
    '<ocf:rootfiles>' +
    '<ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>' +
    '<ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/>' +
    '</ocf:rootfiles>' +
    '</ocf:container>'
  )
}

function manifestXml(): string {
  return (
    XML_DECL +
    '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>'
  )
}

function settingsXml(): string {
  return (
    XML_DECL +
    '<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"' +
    ' xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">' +
    '<ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>' +
    '</ha:HWPApplicationSetting>'
  )
}

function contentHpf(title: string, now: Date): string {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return (
    XML_DECL +
    `<opf:package ${NAMESPACES} version="" unique-identifier="" id="">` +
    '<opf:metadata>' +
    `<opf:title>${escapeText(title)}</opf:title>` +
    '<opf:language>ko</opf:language>' +
    '<opf:meta name="creator" content="text">zzaim</opf:meta>' +
    '<opf:meta name="subject" content="text"/>' +
    '<opf:meta name="description" content="text"/>' +
    '<opf:meta name="lastsaveby" content="text">zzaim</opf:meta>' +
    `<opf:meta name="CreatedDate" content="text">${stamp}</opf:meta>` +
    `<opf:meta name="ModifiedDate" content="text">${stamp}</opf:meta>` +
    '<opf:meta name="keyword" content="text"/>' +
    '</opf:metadata>' +
    '<opf:manifest>' +
    '<opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>' +
    '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>' +
    '<opf:item id="settings" href="settings.xml" media-type="application/xml"/>' +
    '</opf:manifest>' +
    '<opf:spine>' +
    '<opf:itemref idref="header" linear="yes"/>' +
    '<opf:itemref idref="section0" linear="yes"/>' +
    '</opf:spine>' +
    '</opf:package>'
  )
}

export function buildHwpx(input: ContainerInput): Uint8Array {
  return zipSync(
    {
      // ⚠ 첫 항목 · 무압축
      mimetype: [strToU8(HWPX_MIMETYPE), { level: 0 }],
      'version.xml': strToU8(versionXml()),
      'META-INF/container.xml': strToU8(containerXml()),
      'META-INF/manifest.xml': strToU8(manifestXml()),
      'Contents/content.hpf': strToU8(contentHpf(input.title, input.now)),
      'Contents/header.xml': strToU8(input.headerXml),
      'Contents/section0.xml': strToU8(input.sectionXml),
      'Preview/PrvText.txt': strToU8(input.previewText),
      'settings.xml': strToU8(settingsXml()),
    },
    { level: 6 },
  )
}
