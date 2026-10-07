'use client'
/**
 * 资讯页「申请步骤」的正文(2026-10-03 资讯页签四分,Frank「申请步骤应该是另一个选项卡吧」→ 提案「可以,做吧」):一省现行通道每条一张
 * 「申请步骤」卡 —— 与职位弹框同一张卡(ProvStepsCard → PnpStepsCard)、同一份懒取整表,卡标题写通道官方英文原名、灰字界面语言名;
 * 「进池与抽选」一步挂这条通道的抽选表。没登步骤的通道不出。形照同桶的 PnpProvStreams(加载行与失败框同它)。
 * 2026-10-04 互跳:每张卡外包一层锚点(id = 通道编号),门槛卡的互跳钮带 #通道编号 过来时滚到这张(usePnpProvStreams 里 applyHashJump)。
 *
 * @author Frank
 * @time 2026-10-03 23:44:58
 */
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { K_LOAD_FAILED, K_LOADING, NOTICE_ERR } from './constants'
import { usePnpProvStreams } from './hooks'
import { ProvStepsCard } from './provstepscard'
import type { PnpProvStepsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一省的步骤卡。
 *
 * @param props 界面语言与省码。
 * @returns 卡片列(每条登了步骤的通道一张;整表没到出加载行,取挂了出失败框)。
 */
export function PnpProvSteps({ lang, province }: PnpProvStepsIn) {
  const p = usePnpProvStreams({ lang, province })
  const cards = []
  for (const it of p.items) {
    if (it.steps != null) {
      cards.push(
        <div key={it.key} id={it.key} className={css.jumpAnchor}>
          <ProvStepsCard spec={it.steps} draws={it.draws} t={p.t} />
        </div>,
      )
    }
  }
  return (
    <>
      {p.ready === false && p.failed === false && <Loading text={p.t(K_LOADING)} />}
      {p.failed && <Notice kind={NOTICE_ERR}>{p.t(K_LOAD_FAILED)}</Notice>}
      {cards}
    </>
  )
}
