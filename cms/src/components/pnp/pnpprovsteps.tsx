'use client'
/**
 * 资讯页「申请步骤」的正文(2026-10-03 资讯页签四分,Frank「申请步骤应该是另一个选项卡吧」→ 提案「可以,做吧」):一省现行通道每条一张
 * 「申请步骤」卡 —— 与职位弹框同一张卡(ProvStepsCard → PnpStepsCard)、同一份懒取整表,卡标题写通道官方英文原名、灰字界面语言名;
 * 「进池与抽选」一步挂这条通道的抽选表。没登步骤的通道不出。形照同桶的 PnpProvStreams(加载行与失败框同它)。
 * 2026-10-04 互跳:每张卡外包一层锚点(id = 通道编号),门槛卡的互跳钮带 #通道编号 过来时滚到这张(usePnpProvStreams 里 applyHashJump)。
 * 2026-10-11 申请步骤分区筛选批 1(设计 docs/design/资讯/申请步骤-分区筛选-20261011.md):收筛选条件,按身份与教育经历留卡
 * (判定在子桶 fit 的 keepStreamOf);全部省份一起看时(group)卡前出省名组头,这省一条不剩整组不出;只看一省时一条不剩出空态一句。
 * 2026-10-12 Frank「全部省份 去掉吧」:分组那一套(组头、空态句)撤;资讯页筛选也撤了(挪「我的通道」),筛选条件仍收、资讯页递空。
 *
 * 2026-10-12 Frank「加组头」:联邦那一页按经济类 / 家庭团聚 / 难民在卡前出组头(it.group 变了才出一行)。
 *
 * @author Frank
 * @time 2026-10-03 23:44:58
 */
import { GroupHead } from './grouphead'
import { Loading } from '@/components/loading'
import { Notice } from '@/components/notice'
import { GROUP_KEY_HEAD, K_LOAD_FAILED, K_LOADING, NOTICE_ERR, TEXT_NONE } from './constants'
import { keepStreamOf } from './fit'
import { usePnpProvStreams } from './hooks'
import { ProvStepsCard } from './provstepscard'
import type { PnpProvStepsIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一省的步骤卡。
 *
 * @param props 界面语言、省码与筛选条件。
 * @returns 卡片列(每条登了步骤、筛完还留着的通道一张;整表没到出加载行,取挂了出失败框)。
 */
export function PnpProvSteps({ lang, province, filter }: PnpProvStepsIn) {
  const p = usePnpProvStreams({ lang, province })
  const cards = []
  let group = TEXT_NONE
  for (const it of p.items) {
    if (it.steps != null && keepStreamOf({ fits: it.fits, province, filter })) {
      if (it.group !== group) {
        group = it.group
        cards.push(<GroupHead key={GROUP_KEY_HEAD + group} head={it.groupHead} sub={it.groupSub} />)
      }
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
