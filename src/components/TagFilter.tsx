/** 태그 필터 — v1 의 S-03 과 S-04 좌측이 공유한다 (SS부록A).
 *
 *  필터 논리는 하나로 못박는다: **같은 그룹 안은 OR, 그룹 간은 AND** (SS§5.3).
 *  태그는 `그룹:값` 문자열 하나로 통일한다 (PD-03) — 구조화하지 않는다. */
export interface TagFilterProps {
  /** `그룹:값` 원문 목록과 각 개수 */
  options: { tag: string; count: number }[]
  selected: ReadonlySet<string>
  onToggle(tag: string): void
}

/** `단원:문학` → `{ group: '단원', value: '문학' }`.
 *  콜론이 없으면 그룹 없는 태그로 본다 — 사용자가 자유롭게 붙인 것이다. */
export function parseTag(tag: string): { group: string | null; value: string } {
  const i = tag.indexOf(':')
  if (i === -1) return { group: null, value: tag }
  return { group: tag.slice(0, i), value: tag.slice(i + 1) }
}

/** 같은 그룹 안은 OR, 그룹 간은 AND. 선택이 없으면 전부 통과. */
export function matchesTags(itemTags: readonly string[], selected: ReadonlySet<string>): boolean {
  if (selected.size === 0) return true
  const byGroup = new Map<string, string[]>()
  for (const t of selected) {
    const { group } = parseTag(t)
    const key = group ?? ''
    const list = byGroup.get(key)
    if (list) list.push(t)
    else byGroup.set(key, [t])
  }
  for (const [, tags] of byGroup) {
    if (!tags.some((t) => itemTags.includes(t))) return false
  }
  return true
}

export function TagFilter({ options, selected, onToggle }: TagFilterProps) {
  const groups = new Map<string, { tag: string; count: number; value: string }[]>()
  for (const o of options) {
    const { group, value } = parseTag(o.tag)
    const key = group ?? ''
    const list = groups.get(key)
    const entry = { ...o, value }
    if (list) list.push(entry)
    else groups.set(key, [entry])
  }

  return (
    <div>
      {[...groups].map(([group, list]) => (
        <fieldset key={group} style={{ border: 0, padding: 0, margin: '0 0 var(--space-3)' }}>
          {group !== '' && (
            <legend style={{ color: 'var(--color-neutral-700)', fontSize: 13 }}>{group}</legend>
          )}
          {list.map((o) => (
            <label key={o.tag} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={selected.has(o.tag)}
                onChange={() => onToggle(o.tag)}
              />
              {o.value} ({o.count})
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  )
}
