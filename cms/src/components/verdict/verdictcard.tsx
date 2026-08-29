'use client'
/**
 * verdict 域的结构:判定区的一张自包含白卡(Frank 2026-08-12:「section 分多个卡片,
 * 每个卡片都是自包含的」)—— 卡内自带标题与动作,读到哪一张都不必回头看上一张。
 * **必须是模块级组件**:先前定义在面板体内,每次渲染都是一个新的组件类型,
 * React 按类型对不上就把整棵子树卸了重挂 —— 纯展示内容看不出来,
 * 但估分卡(scoreSlot)挂进来后每次重挂 = 答案清零。
 * 2026-08-28 换装批自 TripleVerdictModal.tsx 的 Card 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import type { VerdictCardIn } from './types'
import css from './verdict.module.css'

/**
 * 渲染一张判定卡。
 *
 * @param props 标题、右上角动作与卡内容(逐格注释见 VerdictCardIn)。
 * @returns 白卡。
 */
export function VerdictCard({ title, action, children }: VerdictCardIn) {
  return (
    <div className={css.card}>
      {(title != null || action != null) && (
        <div className={css.cardHead}>
          <div className={css.cardTitle}>{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
