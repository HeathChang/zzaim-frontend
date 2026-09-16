/** 설정 항목 하나 — 숫자 슬라이더·선택·토글 (zz-8 D2·D5·D7).
 *
 *  ★ **범위 상한이 값에 따라 움직인다.** 그래서 «틀린 값을 고르고 혼나는» 일이 없다 —
 *  더 못 올리는 지점에 닿으면 그 사실을 말해 준다(경고가 아니라 설명이다).
 *
 *  키보드: `↑↓` 1단위 · `Shift+↑↓` 10단위 (D5). 슬라이더 기본 동작으로는
 *  10단위가 안 되므로 직접 처리한다.
 *
 *  ⚠ **컨트롤에 이름을 직접 준다.** `<label>` 로 감싸기만 하면 접근성 이름에
 *  라벨 옆의 값과 선택지 글자까지 딸려 들어간다 — «용지» 가 «용지A4B4» 가 됐다. */
import { strings } from '@/app/strings'

/** 이 키들로 값이 움직인다. 하나라도 빠지면 «바꿨는데 반영이 안 되는» 구멍이 생긴다 */
const COMMIT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

export interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: 'mm' | 'percent'
  disabled?: boolean
  /** 상한에 닿았다 — 왜 더 못 올리는지 설명한다 */
  limited?: boolean
  onChange(next: number): void
  /** 드래그가 끝났을 때. 글자 크기처럼 **재측정이 비싼** 값이 쓴다 (D3) */
  onCommit?(next: number): void
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  disabled = false,
  limited = false,
  onChange,
  onCommit,
}: NumberFieldProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span>{unit === 'percent' ? `${value}%` : unit === 'mm' ? `${value}mm` : value}</span>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          onPointerUp={() => onCommit?.(value)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            // 기본 동작은 1단위뿐이다. 10단위는 우리가 만든다 (D5)
            if (!e.shiftKey) return
            e.preventDefault()
            const next = clamp(value + (e.key === 'ArrowUp' ? 10 : -10))
            onChange(next)
            onCommit?.(next)
          }}
          // ⚠ 슬라이더는 **좌우·Home/End·PageUp/Down 으로도 움직인다.**
          // 위/아래만 보면 좌우로 바꾼 값이 영영 반영되지 않는다 (실제로 그랬다)
          onKeyUp={(e) => {
            if (COMMIT_KEYS.has(e.key)) onCommit?.(value)
          }}
          onBlur={() => onCommit?.(value)}
        />
      </label>
      {/* 상한에 닿았을 때만. 늘 떠 있으면 아무도 안 읽는다 */}
      {limited && <p style={{ color: 'var(--color-neutral-700)' }}>{strings.settings.limited}</p>}
    </div>
  )
}

export function ToggleField({
  label,
  checked,
  disabled = false,
  note,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  note?: string
  onChange(next: boolean): void
}) {
  return (
    <div>
      <label>
        <input
          type="checkbox"
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {note && <p style={{ color: 'var(--color-neutral-700)' }}>{note}</p>}
    </div>
  )
}

export function ChoiceField<T extends string>({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  disabled?: boolean
  onChange(next: T): void
}) {
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
