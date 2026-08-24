'use client'
/**
 * input 域的通用文本框:三档尺寸(sm 32 图表控件行 / md 38 筛选行,与 Select
 * 同高 / lg 42 独立搜索区)。2026-08-24 立件收拢 —— 此前全站六处各写各的:
 * 高 32/38/40/42、圆角 6/8/10、边框两色,而且**只有一处有聚焦态**。
 * onChange 收已取出的字符串(调用点不必再写 e.target.value)。
 *
 * @author Frank
 * @time 2026-08-24 14:00:00
 */
import { AUTOCOMPLETE_OFF, SIZE_DEFAULT } from './constants'
import { inputClsOf, makeChange } from './functions'
import type { InputIn } from './types'

/**
 * 通用文本框。
 *
 * @param props 值/回调/占位/尺寸(见 InputIn 逐格注释)。
 * @returns 文本框。
 */
export function Input({
  value,
  onChange,
  placeholder,
  size = SIZE_DEFAULT,
  enterKeyHint,
  maxLength,
  autoFocus = false,
  ariaLabel,
  onKeyDown,
  className,
}: InputIn) {
  let extra: string | null = null
  if (className != null) {
    extra = className
  }

  const change = makeChange(onChange)

  return (
    <input className={inputClsOf({ size, search: false, extra })}
      value={value}
      onChange={change}
      placeholder={placeholder}
      enterKeyHint={enterKeyHint}
      maxLength={maxLength}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      autoComplete={AUTOCOMPLETE_OFF} />
  )
}
