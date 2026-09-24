'use client'
/**
 * 域内小件:EE 分数线对比卡组头那一行的文字(名字 | 最低分 | 日期 | 轮数 | 折叠记号)。
 * 单拎成件是因为组头有两种壳(可展开时是钮,没有可展开的是 div)—— 文字只有一份。
 * 2026-09-23 Frank「这个我觉得都列全了,分开列,然后带展开,收缩」立。
 *
 * @author Frank
 * @time 2026-09-23 23:10:00
 */
import { caretOf } from './functions'
import type { EeCmpHeadIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染组头的文字。
 *
 * @param props 这一组与展开态。
 * @returns 五格文字。
 */
export function EeCmpHead({ g, open }: EeCmpHeadIn) {
  return (
    <>
      <span className={css.cmpName}>{g.name}</span>
      <span className={css.cmpScore}>{g.score}</span>
      <span className={css.cmpDate}>{g.date}</span>
      <span className={css.cmpRounds}>{g.rounds}</span>
      <span className={css.cmpCaret}>{g.expandable && caretOf(open)}</span>
    </>
  )
}
