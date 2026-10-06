'use client'
/**
 * account 域的结构:账户页的两列骨架 —— 左 = 节导航卡,右 = 选中节的内容卡
 * (2026-07-16 Frank 拍板「我的账户需要一个 sidebar」,此前是四卡分离的演进;
 * 窄屏 sidebar 变顶部横排条)。宽 860 是本页专属读宽,不走全站 1320 正文轨。
 * 2026-08-26 自 page.tsx 迁出(页面「纯拼装门」改造批),内联样式逐格迁进
 * account.module.css,窄屏分叉由 functions 的三个 clsOf 按布尔拼修饰类、不写三目。
 *
 * 2026-10-05 Frank「tab 不应该是横着的么」:左右两列(侧栏卡 + 内容卡)合成一张白卡 —— 页签条贴卡顶,
 * 下面是选中那一节的内容(定稿:banner + 一张白卡 + 横页签);窄屏不再分叉。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { sheetClsOf } from './functions'
import type { AccountColumnsIn } from './types'
import css from './account.module.css'

/**
 * 账户页白卡骨架:顶上页签条,下面内容。
 *
 * @param props 页签条与内容。
 * @returns 一张白卡。
 */
export function AccountColumns({ nav, children }: AccountColumnsIn) {
  return (
    <div className={sheetClsOf()}>
      <div className={css.sheetTabs}>{nav}</div>
      <main className={css.sheetBody}>{children}</main>
    </div>
  )
}
