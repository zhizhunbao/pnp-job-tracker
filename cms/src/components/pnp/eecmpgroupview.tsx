'use client'
/**
 * 域内小件:EE 分数线对比卡的一组(本岗类别 / CEC / 法语)。
 * 组头一行 = 最近一轮;两轮起组头是一颗钮,点开在下面列全部轮次(照抄省抽选表的行);
 * 只有一轮或从没抽过,组头仍是一层不可点的 div(不给假入口)。
 * 2026-09-23 Frank「这个我觉得都列全了,分开列,然后带展开,收缩」立。
 * 同日「运输这个只有一个 没法展开」:一轮也是钮(展开看轮次名与邀请数);只有一轮都没有才是 div。
 *
 * @author Frank
 * @time 2026-09-23 23:10:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { DrawRow } from './drawrow'
import { EeCmpHead } from './eecmphead'
import { cmpHeadClsOf, drawsClsOf } from './functions'
import type { EeCmpGroupIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染分数线卡的一组。
 *
 * @param props 这一组、展开态与开合手柄。
 * @returns 组头 + 展开后的全部轮次。
 */
export function EeCmpGroupView({ g, open, onToggle }: EeCmpGroupIn) {
  const rows = []
  for (const r of g.rows) {
    rows.push(<DrawRow key={r.key} r={r} />)
  }
  return (
    <div className={css.cmpGroup}>
      {g.expandable && (
        <Button kind={PLAIN_BTN_KIND} className={cmpHeadClsOf({ dim: g.dim, button: true })} onClick={onToggle}
          title={g.tip}>
          <EeCmpHead g={g} open={open} />
        </Button>
      )}
      {g.expandable === false && (
        <div className={cmpHeadClsOf({ dim: g.dim, button: false })} title={g.tip}>
          <EeCmpHead g={g} open={open} />
        </div>
      )}
      {g.expandable && open && <div className={drawsClsOf({ empty: false })}>{rows}</div>}
    </div>
  )
}
