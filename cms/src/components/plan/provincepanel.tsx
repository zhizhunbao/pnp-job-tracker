'use client'
/**
 * plan 域的结构:一个省的估分面板(合计分与差距、加分项勾选、展开后的明细)。
 * 面板**不卸载**只隐藏:分值卡的答案挂在它自己的 state 上,面板一会儿在、一会儿不在
 * 会把整棵树搬走(08-12 分值卡弹窗化那次的坑)。
 * 2026-08-28 换装批自 PnpScoreCard.tsx 的 TabPanel 体提出成件。
 *
 * @author Frank
 * @time 2026-08-28 05:40:00
 */
import { TabPanel } from '@/components/tabs'
import { cssOf } from '@/components/css'
import { BonusTicks } from './bonusticks'
import { ProvinceResult } from './provinceresult'
import { ProvinceTotal } from './provincetotal'
import { TAB_ID_SCORE_PROV } from './constants'
import { scoreAnchorOf, streamOfProv } from './functions'
import type { ProvincePanelIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一个省的面板。
 *
 * @param props 分值卡整机与这个省的估分。
 * @returns 面板。
 */
export function ProvincePanel({ d, s }: ProvincePanelIn) {
  const anchor = scoreAnchorOf({
    score: s, draws: d.draws, matchedStream: streamOfProv({ streams: d.streams, prov: s.province }),
  })
  return (
    <TabPanel idPrefix={TAB_ID_SCORE_PROV} tabKey={s.province} active={s.province === d.activeProv}>
      <div className={cssOf(css.psPanel)}>
        <ProvinceTotal t={d.t} s={s} line={anchor.line} />
        {d.targetMode === false && <BonusTicks d={d} s={s} />}
        <ProvinceResult d={d} s={s} />
      </div>
    </TabPanel>
  )
}
