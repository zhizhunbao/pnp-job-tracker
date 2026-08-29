'use client'
/**
 * 处境页外框:灰白底 + 撑满视口的纵向列,索引页与详情页共用。壳件(Header/Footer)
 * 的拼装在页面门里(Frank 新令「组装只许在 (frontend) 页面门里」),本件只出骨架;
 * 640 断点下 summary 的触控靶扩块(#300)也挂在这一层的类上。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import type { CasesShellIn } from './types'
import css from './cases.module.css'

/**
 * 处境页外框。
 *
 * @param props 整页内容(见 CasesShellIn 逐格注释)。
 * @returns 外框。
 */
export function CasesShell({ children }: CasesShellIn) {
  return <div className={css.wrap}>{children}</div>
}
