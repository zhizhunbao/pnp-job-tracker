'use client'
/**
 * grid 域的结构:事实网格 —— **一批**标签-值排成 N 列,列宽跨行对齐
 * (前 cols-1 列 max-content,末列吃剩余宽)。
 * 铁律:一行里有多个事实就拆成列,别塞进一句话(那正是「废话多」的来源)。
 * 基准=本省抽选卡的四列 grid(2026-07-26 Frank 走查:「都像最后一个卡片一样
 * 排列组合,每列都左对齐」)。
 *
 * 与两个近邻的分界(2026-08-17 Frank 两次点破,写在这免得再合错):
 * ① **不是 Row**:那个渲**一条**事实,标签宽写死 88 是全站约定 —— 正因为写死,
 *    散在几十处的 Row 才能上下对齐成一条竖线;这里的列宽是**这一批数据**自己算的,
 *    换一批就换宽。两种对齐策略互斥,合成一个组件是坏 API。
 * ② **不是 CardKV**:那个的网格列装**条目**(k 在 v 上方),是卡片的部位;
 *    这里的网格列装**格子**(k 与 v 同行相邻)。实现相同 ≠ 同一件事。
 *
 * 2026-08-24 自 ui/Grid.tsx 按组件域形制迁入。
 *
 * style 白名单:列数 --gc 是调用方数据算出来的运行时值。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { GridIn } from './types'
import css from './grid.module.css'

/**
 * 事实网格容器。
 *
 * @param props 列数与格子。
 * @returns 网格。
 */
export function Grid({ cols, children }: GridIn) {
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 列数是调用方数据算出的运行时值,经 --gc 变量进 css
    <div className={css.grid} style={{ '--gc': cols - 1 } as React.CSSProperties}>
      {children}
    </div>
  )
}
