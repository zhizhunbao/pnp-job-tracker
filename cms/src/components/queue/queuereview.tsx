'use client'
/**
 * 「今日待投」(2026-10-08 照 AIApply 的 Quick Review;摆在「我的求职」最上面):标题 + 条数 + 「智能投递」开关(开着才出);
 * 没开或三样条件没齐 → 设置清单就地补(上传简历 / 去选想做的工作 / 填英文姓名),全齐一颗「开启智能投递」;
 * 开着:队列第一岗一张卡 + 改信(弹框)/ 跳过 / 投出,多于一岗「全部投出」(Pro;免费档开升级框);职位名叠开职位描述弹框。
 * 2026-10-08 Frank 看「我的」:跳过、全部投出、升级框撤;一次一岗翻页看,信全文 + 逐项检查,四项全勾才能投出。
 * 刚开启那一轮还在跑:转圈「正在找新岗、写信」(轮询);跑完没岗才是「今天没有新岗」。
 * 取不到不出(不冒充空队列)。
 * 2026-10-09 N 批(Frank「一个全站宿主,并掉各页那 5 套」):本页不再自己画 PeekStack,改摆 modal 桶的报件 PeekContext
 * (报本页的分层态与职业名表),弹框由全站骨架上的 PeekHost 画。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { PeekContext } from '@/components/modal'
import { Card } from '@/components/card'
import { Loading } from '@/components/loading'
import { ERR_NONE, LOAD_OK, NOC_DESC_NONE } from './constants'
import { useQueueReview } from './hooks'
import { QueueCard } from './queuecard'
import { QueueEdit } from './queueedit'
import { QueueFoot } from './queuefoot'
import { QueueHead } from './queuehead'
import { QueueSetup } from './queuesetup'
import type { QueueReviewIn } from './types'
import css from './queue.module.css'

/**
 * 渲染「今日待投」。
 *
 * @param props 取词函数、分层态与发出后的回调。
 * @returns 一张卡;还没拉到 / 拉不到给空。
 */
export function QueueReview({ t, plan, onSent }: QueueReviewIn) {
  const p = useQueueReview({ t, plan, onSent })
  if (p.load !== LOAD_OK) {
    return null
  }
  const setup = p.state.auto === false || p.ready === false
  return (
    <div className={css.wrap}>
      <Card>
        <QueueHead p={p} t={t} />
        {setup && <QueueSetup p={p} t={t} />}
        {setup === false && p.item == null && p.finding && <Loading text={t('qu.finding')} />}
        {setup === false && p.item == null && p.finding === false && <div className={css.hint}>{t('qu.none')}</div>}
        {setup === false && p.item != null && <QueueCard p={p} item={p.item} t={t} />}
        {setup === false && p.item != null && <QueueFoot p={p} item={p.item} t={t} />}
        {setup && p.err !== ERR_NONE && <div className={css.err}>{t(p.err)}</div>}
      </Card>
      {p.editing && <QueueEdit p={p} t={t} />}
      <PeekContext plan={p.plan} nocDesc={NOC_DESC_NONE} />
    </div>
  )
}
