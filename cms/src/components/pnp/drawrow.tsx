'use client'
/**
 * 域内小件:抽选表里的一行(日期 / 流名 / 最低分 / 份邀请)。
 * 外面包一层 .drawRow:桌面 display:contents 原样吃外层四列网格(逐行对齐效果不变),
 * ≤640px 改用 grid-template-areas 两行 —— 流名整行不截断,日期/分数/邀请数落次行灰字(#268)。
 * 2026-08-28 换装批自 Pnp.tsx 的 PnpDrawsBlock 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { TEXT_NONE } from './constants'
import type { DrawRowViewIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一行抽选。
 *
 * @param props 洗好的这一行。
 * @returns 抽选行。
 */
export function DrawRow({ r }: DrawRowViewIn) {
  return (
    <div className={css.drawRow}>
      <span className={r.dateCls}>{r.date}</span>
      <span className={r.streamCls} title={r.title}>
        {r.stream}
        {r.streamZh !== TEXT_NONE && <span className={css.streamZh}>{r.streamZh}</span>}
      </span>
      <span className={css.score}>{r.score}</span>
      <span className={css.inv}>{r.inv}</span>
    </div>
  )
}
