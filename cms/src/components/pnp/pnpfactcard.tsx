'use client'
/**
 * 域内小件:本省抽选卡的两种事实形 —— 改制省现状(安省:最新公告日、改制后发没发过邀请)与按月选取人数(NS)。
 * 项 | 值 两列照抄改制省现行规则块的形(ReformRules:通用 Grid 两列 + ruleK / ruleV),底部一条官方链接(新开页)。
 * 2026-09-26 /fe 首页 Frank「止血 + 补完整」看过效果图点头立:两省原先点开只有标题。内容全取自抽选表(factCardOf),
 * 这里不写死日期或人数。
 * 同日晚 Frank「这种排版是不是太空了」「这个要所有省和通道的格式保持一致吧」:两列竖排 + 底部链接改成与分组卡本岗那一组
 * 同一种排法 —— 琥珀底块里一排格子(共用 FeatCells,末格「来源」),标题只留「本省最近抽选」、轮次标签降成灰字。
 *
 * @author Frank
 * @time 2026-09-26 16:10:00
 */
import { TEXT_NONE } from './constants'
import { FeatCells } from './featcells'
import type { PnpFactCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染事实卡。
 *
 * @param props 洗好的卡。
 * @returns 事实卡。
 */
export function PnpFactCard({ spec }: PnpFactCardIn) {
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        {spec.title}
        {spec.label !== TEXT_NONE && <span className={css.zh}>{spec.label}</span>}
      </div>
      <div className={css.feat}>
        <FeatCells cells={spec.cells} />
      </div>
    </div>
  )
}
