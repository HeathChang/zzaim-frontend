/** HWPX 내보내기 진입점 (zz-9).
 *
 *  **보장하는 것 / 못 하는 것** (D2) — 화면에도 이 말을 그대로 적는다.
 *  | ✅ | 문항 순서 · 쪽 경계 · 단 경계. 문항이 쪽을 넘어 잘리지 않는다 |
 *  | ⚠ | 단 안에서의 세로 위치. 줄바꿈이 달라지면 아래위로 뜬다 | */
import { buildHeaderXml } from '@/export/hwpx/header'
import { buildSectionXml } from '@/export/hwpx/section'
import { buildHwpx } from '@/export/hwpx/container'
import { fromPages, type ExportItem } from '@/export/hwpx/fromPages'
import type { LayoutConfig, LayoutResult } from '@/layout/types'
import { strings } from '@/app/strings'

export type { ExportItem } from '@/export/hwpx/fromPages'

export interface ExportInput {
  layout: LayoutResult
  config: LayoutConfig
  items: readonly ExportItem[]
  headerLines?: readonly string[]
  title: string
  /** 본문 글자 크기(px) — 조판이 쓰는 값 그대로 */
  fontPx: number
  /** 본문 줄 간격(px) */
  lineHeightPx: number
  now: Date
}

export function exportHwpx(input: ExportInput): Uint8Array {
  const paragraphs = fromPages({
    layout: input.layout,
    items: input.items,
    ...(input.headerLines ? { headerLines: input.headerLines } : {}),
  })
  return buildHwpx({
    headerXml: buildHeaderXml({ fontPx: input.fontPx, lineHeightPx: input.lineHeightPx }),
    sectionXml: buildSectionXml({
      config: input.config,
      columnWidthMm: input.layout.geometry.colWmm,
      paragraphs,
    }),
    // 미리보기는 본문 그대로 — 탐색기에서 내용이 보인다
    previewText: paragraphs.map((p) => p.text).join('\n'),
    title: input.title,
    now: input.now,
  })
}

/** 파일 이름. 시험지 이름이 없으면 날짜로 — **이름 없는 파일을 내주지 않는다** */
export function hwpxFileName(title: string, now: Date): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, '').trim()
  if (safe) return `${safe}.hwpx`
  return strings.hwpx.defaultName(now.toISOString().slice(0, 10))
}
