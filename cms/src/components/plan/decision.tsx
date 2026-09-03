'use client'
/**
 * plan 域的结构:决策页正文(判定合一批1)。答题为主干,顾问只是出口
 * (2026-08-10 Frank 拍板)。渐进展开(Frank「排版太乱」整改):答题卡默认收起一行入口,
 * 不逼人考试;抽选事实表在主干之后。测分工具不上页面(Frank「测分数完全不用显示」)——
 * 答案落档喂判定核,各省分数归判定卡个人条件。
 * 区块序:H1 → 答题 → [带岗]岗位三项判定 / [无岗]主干 → 抽选表。
 * 判定/分数全来自确定性层,本页不算一个数。
 * PR 评估是顶栏一级页:banner 与全部卡片统一使用 Shell 1320px 页面轨,不放历史返回按钮。
 * 页尾「看在招岗 / 问 AI 顾问」两个钮 2026-08-11 Frank 撤:顾问不再从本页导流
 * (见记忆 advisor-quality-gate)。
 * 2026-08-28 换装批整体重写成小写件形制:内联样式逐格迁 plan.module.css、排版拆成小件、
 * 状态收进 hooks.ts、派生进 functions.ts;壳件(整页外框/顶栏/页脚)拼装归页面门
 * (Frank「组装只许在 (frontend) 页面门里」,样张 account),本件只出 Shell 轨往下的视图。
 * 2026-09-03 Frank「所有的 table 和可以更新数据的地方,右上角都应该有一个更新时间」:
 * 页面门 SSR 取的 ETL 心跳经整机转交给各张事实卡(初评 / 抽选 / 名额竞争 / 职业竞争 / 抽选线)。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { Shell } from '@/components/shell'
import { DrawsCard } from './drawscard'
import { JobBoard } from './jobboard'
import { NoJobBoard } from './nojobboard'
import { MODULE_PATHWAYS, SHELL_BOTTOM, SHELL_TOP } from './constants'
import { useDecisionPage } from './hooks'
import type { DecisionIn } from './types'
import css from './plan.module.css'

/**
 * 决策页正文。
 *
 * @param props SSR 直出的三份事实、带岗那份工作、热门职业榜、服务端先算好的判定与更新时刻。
 * @returns 正文(Shell 轨往下)。
 */
export function Decision({
  overview, drawsRecent = [], competition = [], tvJob, topNocs = [], initialVerdict, updatedAt,
}: DecisionIn) {
  const d = useDecisionPage({ tvJob, overview, drawsRecent, competition, updatedAt })
  return (
    <div className={css.main}>
      <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
        <div className={css.track}>
          <Banner module={MODULE_PATHWAYS} title={d.t('plan.pr.title')} sub={d.t('dp.sub')}
            images={BANNER_IMGS.pathways} />
          {tvJob == null && <NoJobBoard d={d} topNocs={topNocs} />}
          {tvJob != null && <JobBoard d={d} topNocs={topNocs} initialVerdict={initialVerdict} />}
          <DrawsCard d={d} />
        </div>
      </Shell>
    </div>
  )
}
