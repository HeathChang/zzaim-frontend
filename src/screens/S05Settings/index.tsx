/** S-05 레이아웃 설정 (SS§7 · zz-8).
 *
 *  **불변 규칙 넷을 화면 구조가 지킨다.**
 *  1. 적용 버튼이 없다 — 모든 변경이 즉시 지면에 간다
 *  2. 포커스 트랩이 아니다 — 지면을 보면서 조절하는 것이 목적이다
 *  3. 범위를 반드시 건다 — 상한이 값에 따라 움직인다 (D2)
 *  4. 편집 패널과 동시에 열리지 않는다 (호출하는 쪽이 지킨다) */
import { useEffect, useRef, useState } from 'react'
import { strings } from '@/app/strings'
import { RANGE } from '@/layout/constants'
import { rangeFor, type GuardInput } from '@/layout/guards'
import { ChoiceField, NumberField, ToggleField } from '@/screens/S05Settings/Field'
import { PointsBulk } from '@/screens/S05Settings/PointsBulk'
import type { BulkQuestion } from '@/domain/pointsBulk'
import type { ColumnCount, Orientation, PageSize, PaperLayout } from '@/domain/types'

/** HO§도구UI크기 — SS 에 대응 값이 없어 핸드오프를 따른다 */
export const PANEL_WIDTH_PX = 288

export interface S05SettingsProps {
  layout: PaperLayout
  onChange(next: PaperLayout): void
  /** 배점 일괄 대상 */
  questions: readonly BulkQuestion[]
  onApplyPoints(points: Record<string, number>): void
  /** 지금 몇 쪽인가 — 바뀌면 소리 내어 알린다 (D7) */
  pageCount: number
  /** 다른 탭이 파일을 잡고 있다 (D6 상태4) */
  readOnly?: boolean
  onClose(): void
}

export function S05Settings({
  layout,
  onChange,
  questions,
  onApplyPoints,
  pageCount,
  readOnly = false,
  onClose,
}: S05SettingsProps) {
  const guard: GuardInput = {
    pageSize: layout.pageSize,
    orientation: layout.orientation,
    columns: layout.columns,
    gutter: layout.gutter,
    margin: layout.margin,
  }
  const set = <K extends keyof PaperLayout>(key: K, value: PaperLayout[K]) =>
    onChange({ ...layout, [key]: value })
  const setMargin = (key: keyof PaperLayout['margin'], value: number) =>
    onChange({ ...layout, margin: { ...layout.margin, [key]: value } })

  /** ★ 쪽수 변화는 **시각적으로 놓치기 쉽다.** 소리로도 알리고 화면에도 잠깐 띄운다 (D7) */
  const previous = useRef(pageCount)
  const [pageDelta, setPageDelta] = useState<{ from: number; to: number } | null>(null)
  useEffect(() => {
    if (previous.current === pageCount) return
    const from = previous.current
    previous.current = pageCount
    setPageDelta({ from, to: pageCount })
    const timer = setTimeout(() => setPageDelta(null), 2000)
    return () => clearTimeout(timer)
  }, [pageCount])

  const marginRange = (field: 'inner' | 'outer') => rangeFor(field, guard)
  const gutterRange = rangeFor('gutter', guard)

  return (
    <aside
      data-panel="settings"
      data-print="hide"
      aria-label={strings.settings.title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      style={{
        width: PANEL_WIDTH_PX,
        flex: `0 0 ${PANEL_WIDTH_PX}px`,
        borderLeft: '1px solid var(--color-divider)',
        overflow: 'auto',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 15 }}>{strings.settings.title}</h2>
        <button type="button" onClick={onClose}>
          {strings.settings.close}
        </button>
      </header>

      {/* 읽기 전용이면 **먼저 사유를 말한다** — 눌리지 않는 이유를 모르면 고장으로 보인다 */}
      {readOnly && <p role="alert">{strings.settings.readOnly}</p>}

      {/* 쪽수가 바뀌었다 (D7) */}
      <p aria-live="polite">
        {pageDelta ? strings.settings.pageChanged(pageDelta.from, pageDelta.to) : ''}
      </p>

      <section aria-label={strings.settings.groupPaper}>
        <h3 style={{ fontSize: 14 }}>{strings.settings.groupPaper}</h3>
        <ChoiceField<PageSize>
          label={strings.settings.pageSize}
          value={layout.pageSize}
          disabled={readOnly}
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'B4', label: 'B4' },
          ]}
          onChange={(v) => set('pageSize', v)}
        />
        <ChoiceField<Orientation>
          label={strings.settings.orientation}
          value={layout.orientation}
          disabled={readOnly}
          options={[
            { value: 'portrait', label: strings.settings.portrait },
            { value: 'landscape', label: strings.settings.landscape },
          ]}
          onChange={(v) => set('orientation', v)}
        />
        <ToggleField
          label={strings.settings.duplex}
          checked={layout.duplex}
          disabled={readOnly}
          onChange={(v) => set('duplex', v)}
        />
      </section>

      <section aria-label={strings.settings.groupColumn}>
        <h3 style={{ fontSize: 14 }}>{strings.settings.groupColumn}</h3>
        <ChoiceField<'1' | '2'>
          label={strings.settings.columns}
          value={String(layout.columns) as '1' | '2'}
          disabled={readOnly}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
          ]}
          onChange={(v) => set('columns', Number(v) as ColumnCount)}
        />
        <NumberField
          label={strings.settings.gutter}
          value={layout.gutter}
          min={gutterRange.min}
          max={gutterRange.max}
          unit="mm"
          disabled={readOnly || layout.columns === 1}
          limited={layout.gutter >= gutterRange.max && gutterRange.max < RANGE.gutter.max}
          onChange={(v) => set('gutter', v)}
        />
        <ToggleField
          label={strings.settings.columnRule}
          checked={layout.columnRule}
          disabled={readOnly || layout.columns === 1}
          onChange={(v) => set('columnRule', v)}
        />
      </section>

      <section aria-label={strings.settings.groupMargin}>
        <h3 style={{ fontSize: 14 }}>{strings.settings.groupMargin}</h3>
        <NumberField
          label={strings.settings.marginTop}
          value={layout.margin.top}
          min={RANGE.marginBlock.min}
          max={RANGE.marginBlock.max}
          unit="mm"
          disabled={readOnly}
          onChange={(v) => setMargin('top', v)}
        />
        <NumberField
          label={strings.settings.marginBottom}
          value={layout.margin.bottom}
          min={RANGE.marginBlock.min}
          max={RANGE.marginBlock.max}
          unit="mm"
          disabled={readOnly}
          onChange={(v) => setMargin('bottom', v)}
        />
        {/* ★ 양면이면 라벨이 «안쪽/바깥쪽» 이 된다 — 뒤집히는 여백이라 이름이 달라야 한다 */}
        <NumberField
          label={strings.settings.marginInner(layout.duplex)}
          value={layout.margin.inner}
          min={marginRange('inner').min}
          max={marginRange('inner').max}
          unit="mm"
          disabled={readOnly}
          limited={
            layout.margin.inner >= marginRange('inner').max &&
            marginRange('inner').max < RANGE.marginInline.max
          }
          onChange={(v) => setMargin('inner', v)}
        />
        <NumberField
          label={strings.settings.marginOuter(layout.duplex)}
          value={layout.margin.outer}
          min={marginRange('outer').min}
          max={marginRange('outer').max}
          unit="mm"
          disabled={readOnly}
          limited={
            layout.margin.outer >= marginRange('outer').max &&
            marginRange('outer').max < RANGE.marginInline.max
          }
          onChange={(v) => setMargin('outer', v)}
        />
      </section>

      <TypeGroup layout={layout} readOnly={readOnly} onChange={onChange} />

      <section aria-label={strings.settings.groupFinish}>
        <h3 style={{ fontSize: 14 }}>{strings.settings.groupFinish}</h3>
        <ToggleField
          label={strings.settings.folio}
          checked={layout.folio}
          disabled={readOnly}
          onChange={(v) => set('folio', v)}
        />
        <ToggleField
          label={strings.settings.closing}
          checked={layout.closing}
          disabled={readOnly}
          onChange={(v) => set('closing', v)}
        />
        <ToggleField
          label={strings.settings.carryMark}
          checked={layout.carryMark}
          disabled={readOnly}
          // UD-39 — 항목은 있지만 지금은 발화하지 않는다. 그 사실을 숨기지 않는다
          note={strings.settings.carryMarkNote}
          onChange={(v) => set('carryMark', v)}
        />
        <ChoiceField<'border' | 'shade'>
          label={strings.settings.box}
          value={layout.box}
          disabled={readOnly}
          options={[
            { value: 'border', label: strings.settings.boxBorder },
            { value: 'shade', label: strings.settings.boxShade },
          ]}
          onChange={(v) => set('box', v)}
        />
      </section>

      <PointsBulk
        questions={questions}
        target={layout.targetPoints}
        disabled={readOnly}
        onApply={onApplyPoints}
      />
    </aside>
  )
}

/** 글자 그룹 — **드래그 중에는 반영하지 않는다** (D3).
 *  글자 크기가 바뀌면 전체 재측정이 도는데, 드래그마다 돌면 화면이 멎는다. */
function TypeGroup({
  layout,
  readOnly,
  onChange,
}: {
  layout: PaperLayout
  readOnly: boolean
  onChange(next: PaperLayout): void
}) {
  const [draft, setDraft] = useState(layout.fontScale)
  useEffect(() => setDraft(layout.fontScale), [layout.fontScale])

  return (
    <section aria-label={strings.settings.groupType}>
      <h3 style={{ fontSize: 14 }}>{strings.settings.groupType}</h3>
      <NumberField
        label={strings.settings.fontScale}
        value={draft}
        min={RANGE.fontScale.min}
        max={RANGE.fontScale.max}
        step={RANGE.fontScale.step}
        unit="percent"
        disabled={readOnly}
        // 끄는 동안에는 초안만 움직이고, 놓았을 때 한 번 반영한다
        onChange={setDraft}
        onCommit={(v) => onChange({ ...layout, fontScale: v })}
      />
      <NumberField
        label={strings.settings.startNumber}
        value={layout.startNumber}
        min={1}
        max={200}
        disabled={readOnly}
        onChange={(v) => onChange({ ...layout, startNumber: v })}
      />
      <NumberField
        label={strings.settings.targetPoints}
        value={layout.targetPoints}
        min={10}
        max={200}
        disabled={readOnly}
        onChange={(v) => onChange({ ...layout, targetPoints: v })}
      />
    </section>
  )
}
