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
import { inputClsOf } from '@/components/input'
import { CLEAR_ARIA } from './constants'
import type { SearchIn } from './types'
import css from './search.module.css'

/**
 * 搜索框。
 *
 * @param props 值/回调/占位/尺寸。
 * @returns 搜索框。
 */
export function Search({ value, onChange, placeholder, size = 'lg' }: SearchIn) {
  function change(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  function clear() {
    onChange('')
  }

  return (
    <span className={css.searchBox}>
      <span className={css.searchIcon}><IconSearch /></span>
      <input className={inputClsOf({ size, search: true, extra: null })}
        value={value}
        onChange={change}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoComplete="off" />
      {value !== '' && (
        <button type="button" className={css.searchClear} onClick={clear} aria-label={CLEAR_ARIA}>
          <IconX />
        </button>
      )}
    </span>
  )
}
