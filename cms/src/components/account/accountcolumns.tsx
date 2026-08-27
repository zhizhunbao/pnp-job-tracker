'use client'
/**
 * account 域的结构:账户页的两列骨架 —— 左 = 节导航卡,右 = 选中节的内容卡
 * (2026-07-16 Frank 拍板「我的账户需要一个 sidebar」,此前是四卡分离的演进;
 * 窄屏 sidebar 变顶部横排条)。宽 860 是本页专属读宽,不走全站 1320 正文轨。
 * 2026-08-26 自 page.tsx 迁出(页面「纯拼装门」改造批),内联样式逐格迁进
 * account.module.css,窄屏分叉由 functions 的三个 clsOf 按布尔拼修饰类、不写三目。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { columnsClsOf, mainClsOf, sideClsOf } from './functions'
import type { AccountColumnsIn } from './types'

/**
 * 账户页两列骨架。
 *
 * @param props 窄屏标记、左卡的节导航、右卡的内容。
 * @returns 两列容器。
 */
export function AccountColumns({ narrow, nav, children }: AccountColumnsIn) {
  return (
    <div className={columnsClsOf({ narrow })}>
      <aside className={sideClsOf({ narrow })}>{nav}</aside>
      <main className={mainClsOf({ narrow })}>{children}</main>
    </div>
  )
}
