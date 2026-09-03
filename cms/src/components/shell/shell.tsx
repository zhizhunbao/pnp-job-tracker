'use client'
/**
 * shell 域的结构:全站统一正文轨(1320px 与 Header 头轨同宽 —— 2026-07-18 Frank
 * 「每个页面的宽度应该是一样的,新的页面按这个宽度套壳」;新页面一律用它)。
 * 2026-08-24 自 ui/Shell.tsx 按组件域形制迁入;pad 字符串 prop 撤编成上/下内衬档
 * (Frank「为什么每个都用行内样式」—— 全站实查只有有限几档,类装得下),零 style。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { shellClsOf } from './functions'
import type { ShellIn } from './types'
import css from './shell.module.css'

/**
 * 正文轨壳:限宽 1320 居中,内衬按档选;详情页的返回钮钉在轨右上角(back 槽)。
 *
 * @param props 内衬档、返回钮与内容。
 * @returns 正文轨。
 */
export function Shell({ top = null, bottom = null, back = null, children }: ShellIn) {
  return (
    <div className={shellClsOf({ top, bottom })}>
      {back != null && <div className={css.back}>{back}</div>}
      {children}
    </div>
  )
}
