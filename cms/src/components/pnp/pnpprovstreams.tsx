'use client'
/**
 * 资讯页「通道与门槛」的正文(2026-09-30 通道与门槛批 2;Frank「各省门槛 我觉得 应该放到资讯下面」「盘点各种通道,各种门槛」
 * 「对啊。门槛要说清楚」;设计 docs/design/通道与门槛-20260930.md):一省现行通道每条一张门槛卡,卡与职位弹框「本岗通道的门槛」
 * 同一个组件(PnpGateCard)、同一份门槛表;整表懒取同弹框,加载行与失败框也同弹框。只陈列官方门槛,不判「你够不够」。
 * 2026-10-02 申请步骤批 2(Frank「弹框要和页面保持一致」):每张门槛卡后面跟与弹框同一张「申请步骤」卡(ProvStepsCard),没登步骤的通道不出。
 * 2026-10-03 资讯页签四分(Frank「这个是不是就改成叫通道。然后 下面不要有 申请步骤吧」「申请步骤应该是另一个选项卡吧」):
 * 步骤卡挪去「申请步骤」页签(PnpProvSteps),本件只出门槛卡。
 * 2026-10-04 互跳:每张卡外包一层锚点(id = 通道编号),步骤卡的互跳钮带 #通道编号 过来时滚到这张(usePnpProvStreams 里 applyHashJump)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { K_LOAD_FAILED, K_LOADING, NOTICE_ERR } from './constants'
import { usePnpProvStreams } from './hooks'
import { PnpGateCard } from './pnpgatecard'
import type { PnpProvStreamsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一省的门槛卡。
 *
 * @param props 界面语言与省码。
 * @returns 卡片列(每条通道一张门槛卡;整表没到出加载行,取挂了出失败框)。
 */
export function PnpProvStreams({ lang, province }: PnpProvStreamsIn) {
  const p = usePnpProvStreams({ lang, province })
  const cards = []
  for (const it of p.items) {
    cards.push(<div key={it.key} id={it.key} className={css.jumpAnchor}><PnpGateCard spec={it.gate} /></div>)
  }
  return (
    <>
      {p.ready === false && p.failed === false && <Loading text={p.t(K_LOADING)} />}
      {p.failed && <Notice kind={NOTICE_ERR}>{p.t(K_LOAD_FAILED)}</Notice>}
      {cards}
    </>
  )
}
