'use client'
/**
 * quiz 域的结构:选职业控件的正文(搜索框 → 搜索结果 / 分类导航 + 胶囊排 → 已选汇总
 * → 动作条)。搜索词满 2 个字就换成结果那一屏,不满就回到分类与热门。
 * 弹层里用(职位板/详情页)也要带上答题壳的 CSS —— 铺在答题卡里那条路由由 plan 桶
 * 自己挂了同一份,所以只在弹层形态补。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_OCC_SEARCH_WRAP, QUERY_MIN } from './constants'
import { OccActions } from './occactions'
import { OccCats } from './occcats'
import { OccHead } from './occhead'
import { OccList } from './occlist'
import { OccResults } from './occresults'
import { OccSelected } from './occselected'
import { OccStyle } from './occstyle'
import { QuizStyle } from './quizstyle'
import { Search } from '@/components/search'
import type { OccBodyIn } from './types'

/**
 * 渲染选职业控件的正文。
 *
 * @param props 取词函数、界面语言码、整机、三个形态档与两个出口。
 * @returns 控件正文。
 */
export function OccBody({ t, lang, d, inline, hideDone, doneLabel, finishLabel, onClose, onFinish }: OccBodyIn) {
  const searchMode = d.q.trim().length >= QUERY_MIN
  return (
    <>
      {inline !== true && <QuizStyle />}
      <OccStyle />
      {inline !== true && <OccHead t={t} onClose={onClose} />}
      <div className={CLS_OCC_SEARCH_WRAP}>
        <Search value={d.q} onChange={d.onSearch} placeholder={t('quiz.q2ph')} />
      </div>
      {searchMode && (
        <OccResults t={t}
          lang={lang}
          searching={d.searching}
          cands={d.cands}
          nocs={d.nocs}
          pickOf={d.candPickOf} />
      )}
      {searchMode === false && (
        <OccCats t={t} cat={d.cat} cats={d.cats} onSelect={d.onCatSelect} pickOf={d.catPickOf} />
      )}
      {searchMode === false && (
        <OccList t={t}
          lang={lang}
          cat={d.cat}
          catLoading={d.catLoading}
          topLoaded={d.topLoaded}
          list={d.list}
          nocs={d.nocs}
          dupCount={d.dupCount}
          pickOf={d.pickOf} />
      )}
      {hideDone !== true && (
        <OccSelected t={t} nocs={d.nocs} titles={d.titles} pickOf={d.pickOf} />
      )}
      <OccActions t={t}
        inline={inline}
        nocs={d.nocs}
        doneLabel={doneLabel}
        finishLabel={finishLabel}
        onNext={d.onNext}
        onFinish={onFinish} />
    </>
  )
}
