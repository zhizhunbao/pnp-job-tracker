'use client'
/**
 * 域内小件:本省抽选卡的两种事实形 —— 改制省现状(安省:最新公告日、改制后发没发过邀请)与按月选取人数(NS)。
 * 项 | 值 两列照抄改制省现行规则块的形(ReformRules:通用 Grid 两列 + ruleK / ruleV),底部一条官方链接(新开页)。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」看过效果图点头立:两省原先点开只有标题。内容全取自抽选表(factCardOf),
 * 这里不写死日期或人数。
 *
 * @author Frank
 * @time 2026-09-26 16:10:00
 */
import { Fragment } from 'react'
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { Grid } from '@/components/grid'
import { REFORM_COLS, TARGET_BLANK } from './constants'
import { factValueClsOf } from './functions'
import type { PnpFactCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染事实卡。
 *
 * @param props 洗好的卡。
 * @returns 事实卡。
 */
export function PnpFactCard({ spec }: PnpFactCardIn) {
  const cells = []
  for (const r of spec.rows) {
    cells.push(
      <Fragment key={r.key}>
        <span className={css.ruleK} title={r.tip}>{r.k}</span>
        <span className={factValueClsOf({ strong: r.strong })}>{r.v}</span>
      </Fragment>,
    )
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{spec.title}</div>
      <div className={css.reform}>
        <Grid cols={REFORM_COLS}>{cells}</Grid>
      </div>
      {spec.link != null && (
        <div className={css.srcRow}>
          <LinkButton href={spec.link.href} target={TARGET_BLANK} className={cssOf(css.srcLink)}>
            {spec.link.text}
          </LinkButton>
        </div>
      )}
    </div>
  )
}
