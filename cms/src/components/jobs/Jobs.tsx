'use client'
/**
 * 职位板(/jobs,也是根路径):横幅、筛选、桌面表格、手机卡片、分页与弹框层。
 * 全站卡片与表格的形态基准就在这块板上 —— 别处不自造。
 *
 * 首屏拆分:SSR 带最近 50 行秒开,筛选/搜索/翻页由取数机器打 /api/jobs 分页
 * (E10-01 P3,旧 20k blob 已废);失败保底留首屏 50 行可用。
 * 排序默认「发布时间最新在前」(#127 拍板:同日岗保持 Job Bank 原序 = 入库序,
 * 旧 0-100 分不再参与任何排序)。
 *
 * 页头 = Banner(#65/#66 五模块统一浅色带,职位板 = 蓝);顶栏与页脚由页面门拼
 * (Frank「组装只许在 (frontend) 页面门里」)—— 但顶栏那颗「我的匹配」带三态闸,
 * 所以它连闸一起成了 JobsHeader 那一件。
 * 价值横幅退役(#65 收尾,Frank:「不需要两个蓝条」);横幅右槽的建档 CTA 2026-08-02 Frank
 * 「删掉」—— 旧漏斗残肢:它跳一个光秃秃注册框,而现在的获客链是答题 → 报告 → 落库建档;
 * 同屏另有三个同义入口,它是第四个且全站唯一没埋点的转化入口。
 * 三问细带 2026-07-31 移出(Frank「我觉得放在这不合适,应该放到我的档案里面」):
 * 答案的家是档案页 —— 职位板只管找工作,不再在列表上方常驻一条「你上次填了什么」。
 * 推荐条 2026-07-31 下架(Frank「不需要再瞎推荐了」):「按你最近浏览/你所在地区」是猜的,
 * 而「我的匹配」是拿用户自己给的答案算的 —— 同屏两套推荐,猜的那套只会稀释真的那套。
 *
 * 2026-08-28 换装批整体重写:状态全进 hooks、口径全进 functions、排版拆成域内小件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { cssOf } from '@/components/css'
import { BANNER_MODULE, BANNER_TITLE } from './constants'
import { mvBarTextOf, proofTextOf, subTextOf } from './functions'
import { useJobsBoard } from './hooks'
import { BoardCards } from './boardcards'
import { BoardFilters } from './boardfilters'
import { BoardLoading } from './boardloading'
import { BoardModals } from './boardmodals'
import { BoardSub } from './boardsub'
import { BoardTable } from './boardtable'
import { MatchBar } from './matchbar'
import { MatchEntry } from './matchentry'
import { MatchGate } from './matchgate'
import { MoreLine } from './moreline'
import type { JobsIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染职位板。
 *
 * @param props 服务端门算好的全部输入。
 * @returns 整块板。
 */
export function Jobs(props: JobsIn) {
  const b = useJobsBoard(props)
  return (
    <div className={cssOf(css.page)}>
      <div className={cssOf(css.main)}>
        <Banner module={BANNER_MODULE} title={BANNER_TITLE} images={BANNER_IMGS.jobs}
          sub={
            <BoardSub text={subTextOf({
              t: b.t,
              anyFilter: b.filters.anyFilter,
              matchView: b.matchView,
              total: b.data.total,
            })}
              proof={proofTextOf({ t: b.t, named: b.proof.named, lmia: b.proof.lmia })} />
          } />
        <BoardFilters b={b} />
        {b.matchView === false && <MatchEntry label={b.t('mv.entry')} onClick={b.gate.onToggle} />}
        {b.matchView && (
          <MatchBar text={mvBarTextOf({ t: b.t, totals: b.data.matchTotals })}
            exit={b.t('mv.exit')}
            onExit={b.gate.onToggle} />
        )}
        {b.data.swapping && <BoardLoading text={b.t('loading')} />}
        <BoardTable b={b} />
        <BoardCards b={b} />
        <MoreLine b={b} />
      </div>
      <BoardModals b={b} />
      <MatchGate g={b.gate} />
    </div>
  )
}
