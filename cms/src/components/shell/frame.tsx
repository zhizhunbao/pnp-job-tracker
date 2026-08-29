'use client'
/**
 * shell 域的结构:整页外框 —— 灰底 + 撑满视口高的纵向列(顶栏 / 正文 / 页脚三段,
 * 页脚被推到视口底)。2026-08-27 Frank 拍板收拢:这个框在旧页里逐字重复十余处
 * (companies/employers/… 每页最外层那个 div),按「有重复才抽公共」进 shell 桶,
 * 不许每桶再克隆 XxxShell(最后一个特例 AccountShell 已于 2026-08-28 收编退役,
 * 其渐变底暂存 account 桶的 AccountTint 候选层,灰底拍板后删)。
 * 页面门的拼装形:<Frame><Header …/><视图 …/><Footer/></Frame>。
 *
 * @author Frank
 * @time 2026-08-27 06:30:00
 */
import type { FrameIn } from './types'
import css from './shell.module.css'

/**
 * 整页外框:灰底纵向三段列。
 *
 * @param props 整页内容。
 * @returns 外框容器。
 */
export function Frame({ children }: FrameIn) {
  return (
    <div className={css.frame}>{children}</div>
  )
}
