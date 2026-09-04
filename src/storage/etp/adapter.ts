/** 직렬화 경계의 **검증기**.
 *
 *  ## 원래 계획과 달라진 점 (편차 D-1.1)
 *  zz-1 D1 은 «파일=PP§6.2, 런타임=HO 프로토타입 형태, 어댑터가 양방향 변환»
 *  이었다. 그런데 zz-0 에서 **런타임 타입도 PP§6.2 로 통일**했으므로 변환할
 *  것이 없다. 두 형태를 유지하면 어긋나는 축(7개)을 영원히 관리해야 하는데,
 *  하나로 두면 그 문제 자체가 사라진다.
 *
 *  그래서 이 파일은 «변환»이 아니라 **«남이 준 JSON 을 믿지 않는 일»**을 한다.
 *  파일은 사용자가 손으로 고칠 수도, 다른 버전이 쓸 수도 있다. 그대로 믿고
 *  스토어에 넣으면 **조판 중에 터진다.**
 *
 *  원칙: **모르는 필드는 버리고, 없는 필드는 기본값을 주고, 망가진 항목은 통째로
 *  건너뛴다.** 파일 하나가 통째로 안 열리는 것보다 문항 하나를 잃는 게 낫다. */
import type {
  ColumnCount,
  Orientation,
  PageSize,
  Paper,
  PaperItem,
  Passage,
  Question,
  QuestionBody,
  SplitPolicy,
} from '@/domain/types'
import type { Manifest } from '@/storage/etp/format'

export interface ParseReport {
  /** 건너뛴 항목 — 사용자에게 «N개를 읽지 못했습니다»로 알린다 (SS§5.4 부분 상태) */
  skipped: { kind: string; id?: string; reason: string }[]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback)
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

function parseBody(v: unknown): QuestionBody | null {
  if (!isObject(v)) return null
  if (v['kind'] === 'html') return { kind: 'html', html: str(v['html']) }
  if (v['kind'] === 'image') {
    const blobId = str(v['blobId'])
    if (!blobId) return null
    return {
      kind: 'image',
      blobId,
      naturalWidth: num(v['naturalWidth'], 0),
      naturalHeight: num(v['naturalHeight'], 0),
    }
  }
  return null
}

export function parseQuestion(v: unknown, report: ParseReport): Question | null {
  if (!isObject(v)) {
    report.skipped.push({ kind: 'question', reason: 'not an object' })
    return null
  }
  const id = str(v['id'])
  const body = parseBody(v['body'])
  if (!id || !body) {
    report.skipped.push({ kind: 'question', ...(id ? { id } : {}), reason: 'missing id or body' })
    return null
  }
  const answer = v['answer']
  return {
    id,
    body,
    points: numOrNull(v['points']),
    numberHint: numOrNull(v['numberHint']),
    numberBaked: bool(v['numberBaked']),
    hasCrossRef: bool(v['hasCrossRef']),
    passageId: typeof v['passageId'] === 'string' ? v['passageId'] : null,
    tags: strArray(v['tags']),
    note: str(v['note']),
    ...(typeof answer === 'string' ? { answer } : {}),
    createdAt: num(v['createdAt'], 0),
    updatedAt: num(v['updatedAt'], 0),
  }
}

export function parsePassage(v: unknown, report: ParseReport): Passage | null {
  if (!isObject(v)) {
    report.skipped.push({ kind: 'passage', reason: 'not an object' })
    return null
  }
  const id = str(v['id'])
  const body = parseBody(v['body'])
  if (!id || !body) {
    report.skipped.push({ kind: 'passage', ...(id ? { id } : {}), reason: 'missing id or body' })
    return null
  }
  return {
    id,
    body,
    instruction: str(v['instruction']),
    tags: strArray(v['tags']),
    createdAt: num(v['createdAt'], 0),
    updatedAt: num(v['updatedAt'], 0),
  }
}

const PAGE_SIZES: PageSize[] = ['A4', 'B4']
const ORIENTATIONS: Orientation[] = ['portrait', 'landscape']
const SPLIT: SplitPolicy[] = ['together', 'passage-first']

function parseItem(v: unknown): PaperItem | null {
  if (!isObject(v)) return null
  switch (v['kind']) {
    case 'question': {
      const questionId = str(v['questionId'])
      if (!questionId) return null
      const override = v['overridePoints']
      return {
        kind: 'question',
        questionId,
        ...(typeof override === 'number' ? { overridePoints: override } : {}),
        ...(typeof v['keepWithNext'] === 'boolean' ? { keepWithNext: v['keepWithNext'] } : {}),
      }
    }
    case 'passageGroup': {
      const passageId = str(v['passageId'])
      if (!passageId) return null
      const children = Array.isArray(v['children'])
        ? v['children'].flatMap((c) => {
            if (!isObject(c)) return []
            const questionId = str(c['questionId'])
            if (!questionId) return []
            const override = c['overridePoints']
            return [
              {
                questionId,
                ...(typeof override === 'number' ? { overridePoints: override } : {}),
              },
            ]
          })
        : []
      const policy = v['splitPolicy']
      return {
        kind: 'passageGroup',
        passageId,
        children,
        splitPolicy: SPLIT.includes(policy as SplitPolicy) ? (policy as SplitPolicy) : 'together',
      }
    }
    case 'spacer':
      return { kind: 'spacer', heightMm: num(v['heightMm'], 30), ruled: bool(v['ruled']) }
    case 'divider':
      return { kind: 'divider' }
    case 'notice':
      return { kind: 'notice', html: str(v['html']) }
    default:
      return null
  }
}

export function parsePaper(v: unknown, report: ParseReport): Paper | null {
  if (!isObject(v)) {
    report.skipped.push({ kind: 'paper', reason: 'not an object' })
    return null
  }
  const id = str(v['id'])
  if (!id) {
    report.skipped.push({ kind: 'paper', reason: 'missing id' })
    return null
  }
  const h = isObject(v['header']) ? v['header'] : {}
  const l = isObject(v['layout']) ? v['layout'] : {}
  const m = isObject(l['margin']) ? l['margin'] : {}
  const columns = num(l['columns'], 2)
  const items = Array.isArray(v['items'])
    ? v['items'].flatMap((it) => {
        const parsed = parseItem(it)
        if (!parsed) report.skipped.push({ kind: 'paperItem', id, reason: 'unknown item' })
        return parsed ? [parsed] : []
      })
    : []

  return {
    id,
    title: str(v['title']),
    header: {
      school: str(h['school']),
      grade: str(h['grade']),
      subject: str(h['subject']),
      examName: str(h['examName']),
      duration: str(h['duration']),
      teacher: str(h['teacher']),
      showTotalPoints: bool(h['showTotalPoints'], true),
    },
    layout: {
      pageSize: PAGE_SIZES.includes(l['pageSize'] as PageSize) ? (l['pageSize'] as PageSize) : 'A4',
      orientation: ORIENTATIONS.includes(l['orientation'] as Orientation)
        ? (l['orientation'] as Orientation)
        : 'portrait',
      columns: (columns === 1 ? 1 : 2) as ColumnCount,
      duplex: bool(l['duplex']),
      margin: {
        top: num(m['top'], 20),
        bottom: num(m['bottom'], 20),
        inner: num(m['inner'], 20),
        outer: num(m['outer'], 15),
      },
      gutter: num(l['gutter'], 8),
      columnRule: bool(l['columnRule']),
      fontScale: num(l['fontScale'], 100),
      startNumber: num(l['startNumber'], 1),
      // ⚠ 아래 5개는 나중에 생긴 항목이다. **없으면 기본값**으로 읽는다 —
      // 예전 파일도 그대로 열려야 한다 (스키마 버전을 올리지 않는 이유)
      targetPoints: num(l['targetPoints'], 100),
      box: l['box'] === 'shade' ? 'shade' : 'border',
      folio: bool(l['folio'], true),
      closing: bool(l['closing'], false),
      carryMark: bool(l['carryMark'], true),
    },
    items,
    createdAt: num(v['createdAt'], 0),
    updatedAt: num(v['updatedAt'], 0),
  }
}

export function parseManifest(v: unknown): Manifest | null {
  if (!isObject(v)) return null
  const version = v['schemaVersion']
  // 버전이 없으면 파일이 아니거나 손상됐다. 추측해서 열면 더 나쁘다.
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null
  return {
    schemaVersion: version,
    updatedAt: num(v['updatedAt'], 0),
    ...(typeof v['app'] === 'string' ? { app: v['app'] } : {}),
    ...(Array.isArray(v['stats']) ? { stats: v['stats'] as NonNullable<Manifest['stats']> } : {}),
  }
}
