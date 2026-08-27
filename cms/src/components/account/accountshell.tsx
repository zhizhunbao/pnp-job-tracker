'use client'
/**
 * account 域的结构:账户页的整页外壳 —— 渐变底 + 撑满视口高的纵向列
 * (顶栏 / 正文 / 页脚三段)。2026-08-26 自 app/(frontend)/account/page.tsx 的最外层
 * div 迁出(页面「纯拼装门」改造批,闸 local/page-compose-only),内联样式逐格迁进
 * account.module.css 的 .shell,值一个不改。
 * 它**不是**全站正文轨 Shell:那条轨限宽 1320,本页专属读宽 860 在 AccountColumns 上。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import type { AccountShellIn } from './types'
import css from './account.module.css'

/**
 * 账户页整页外壳。
 *
 * @param props 整页内容。
 * @returns 渐变底的纵向列容器。
 */
export function AccountShell({ children }: AccountShellIn) {
  return (
    <div className={css.shell}>{children}</div>
  )
}
