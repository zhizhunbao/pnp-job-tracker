'use client'
/**
 * auth 域的 Google 四色 G 图标(品牌规范色,只在登录弹框用 —— 不进 icons 域的
 * lucide 词汇表,品牌图形不换风格)。
 * 2026-08-24 自 AuthForm 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */

import { G_BLUE, G_GREEN, G_PATH_BLUE, G_PATH_GREEN, G_PATH_RED, G_PATH_YELLOW, G_RED, G_YELLOW } from './constants'
import css from './auth.module.css'

/**
 * Google G 图标(品牌四色是官方定值,svg 属性里的 hex 不是散落的样式)。
 *
 * @returns 图标。
 */
export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden className={css.gIcon}>
      <path fill={G_RED} d={G_PATH_RED} />
      <path fill={G_BLUE} d={G_PATH_BLUE} />
      <path fill={G_YELLOW} d={G_PATH_YELLOW} />
      <path fill={G_GREEN} d={G_PATH_GREEN} />
    </svg>
  )
}
