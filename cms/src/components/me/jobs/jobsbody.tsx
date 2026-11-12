'use client'
/**
 * me 桶子桶 jobs 的结构:「我的求职」正文(效果图 docs/design/我的/我的框架-20261107.md 2.1 / 1.1):一张卡,顶上一条 Fluent 页签
 * 「今日推荐 N / 我的收藏 N / 我的投递 N」(tabs 桶 Tabs,条数挂在页签上),下面只出当前那一页签的表。
 * 2026-11-07 自 myjobs 桶三张分区白卡(Picks / SavedList / AppliedList)与 account 桶的五题弹框 JobsQuiz 在新域重写;
 * 卡外摆定价框、弹框宿主的报件(分层态)与五题弹框。打开只读投递框的函数由父桶注入(子桶 apps 的 openAppView)。
 * 同日 Frank「现在都按 Azure 的来」:「换一批」从推荐表上方挪到页签那一行右端(只在「今日推荐」页签、推荐多于先列的几条时出)。
 * 2026-11-09 Frank「这三个是不是都放到侧边栏比较好」:页签条撤,三项挪到侧边栏「我的求职」类别下;出哪一张表由页面递来的 tab 定,
 * 「换一批」留在表上方右端。
 * 同日全站卖会员只留升级框一种形态(Frank「可以」):卡外的定价框 PricingModal 换成 UpgradeModal。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { PeekContext } from '@/components/modal'
import { AppliedPane } from './appliedpane'
import {
  CARD_MD_CLS, NOC_DESC_NONE, TAB_APPLIED, TAB_PICKS, TAB_SAVED,
} from './constants'
import { useJobs } from './hooks'
import { FillBar } from './fillbar'
import { PicksPane } from './pickspane'
import { SavedPane } from './savedpane'
import type { JobsBodyIn } from './types'

/**
 * 「我的求职」正文。
 *
 * @param props 取词函数、当前子项、分层态、重拉代数、答档案代数、五题关了的交还口与开投递框。
 * @returns 页签卡 + 报件。
 */
export function JobsBody({ t, tab, plan, gen, asked, onFill, openApp }: JobsBodyIn) {
  const j = useJobs({ gen, asked })
  return (
    <>
      <FillBar t={t} onFill={onFill} />
      <section className={CARD_MD_CLS}>
        {tab === TAB_PICKS && <PicksPane t={t} p={j.picks} l={j.saved} onFill={onFill} />}
        {tab === TAB_SAVED && <SavedPane t={t} l={j.saved} openApp={openApp} />}
        {tab === TAB_APPLIED && <AppliedPane t={t} l={j.applied} openApp={openApp} />}
      </section>
      <PeekContext plan={plan} nocDesc={NOC_DESC_NONE} />
    </>
  )
}
