'use client'
/**
 * 「我的通道」点一行的弹框正文(2026-10-13;设计 docs/design/资讯/通道-合并申请步骤-20261012.md 第 4 张图:
 * 门槛在上、申请步骤在下两张分区卡):与资讯页同一份懒取整表,按通道编号找那一条,门槛卡同 PnpGateCard、步骤卡同 ProvStepsCard。
 *
 * @author Frank
 * @time 2026-10-13 03:00:00
 */
import { Loading } from '@/components/loading'
import { K_LOADING, KEY_GATE_TAIL, KEY_STEPS_TAIL } from './constants'
import { usePnpProvStreams } from './hooks'
import { PnpGateCard } from './pnpgatecard'
import { ProvStepsCard } from './provstepscard'
import type { PnpStreamDetailIn } from './types'

/**
 * 一条通道的门槛 + 申请步骤。
 *
 * @param props 界面语言、省码与通道编号。
 * @returns 两张卡;整表没到出加载行,没登步骤只出门槛卡。
 */
export function PnpStreamDetail({ lang, province, streamKey }: PnpStreamDetailIn) {
  const p = usePnpProvStreams({ lang, province })
  const cards = []
  for (const it of p.items) {
    if (it.key === streamKey) {
      cards.push(<PnpGateCard key={it.key + KEY_GATE_TAIL} spec={it.gate} />)
      if (it.steps != null) {
        cards.push(<ProvStepsCard key={it.key + KEY_STEPS_TAIL} spec={it.steps} draws={it.draws} t={p.t} />)
      }
    }
  }
  return (
    <>
      {p.ready === false && <Loading text={p.t(K_LOADING)} />}
      {cards}
    </>
  )
}
