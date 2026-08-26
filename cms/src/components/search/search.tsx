'use client'
/**
 * search 域的搜索框:左放大镜 + 有值时右清除钮(形态来自 quiz/OccPicker 手搭的那份,
 * 2026-08-24 立件时收编 —— 那份的样式还是组件里拼 css 字符串注入的 <style> 标签)。
 * 图标不吃点击(点它应该聚焦输入框);清除钮 30×30 触控靶。
 *
 * @author Frank
 * @time 2026-08-24 14:00:00
 */
import { IconSearch, IconX } from '@/components/icons'
import { AUTOCOMPLETE_OFF, inputClsOf, makeChange } from '@/components/input'
import { CLEAR_ARIA, ENTER_HINT_SEARCH, SIZE_LG, TYPE_BUTTON } from './constants'
import { makeSearchClear } from './functions'
import type { SearchIn } from './types'
import css from './search.module.css'

/**
 * 搜索框。
 *
 * @param props 值/回调/占位/尺寸。
 * @returns 搜索框。
 */
export function Search({ value, onChange, placeholder, size = SIZE_LG }: SearchIn) {
  const change = makeChange(onChange)
  const clear = makeSearchClear({ onChange })
  return (
    <span className={css.searchBox}>
      <span className={css.searchIcon}><IconSearch /></span>
      <input className={inputClsOf({ size, search: true, extra: null })}
        value={value}
        onChange={change}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint={ENTER_HINT_SEARCH}
        autoComplete={AUTOCOMPLETE_OFF} />
      {value !== '' && (
        <button type={TYPE_BUTTON} className={css.searchClear} onClick={clear} aria-label={CLEAR_ARIA}>
          <IconX />
        </button>
      )}
    </span>
  )
}
