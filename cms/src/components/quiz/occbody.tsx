'use client'
/**
 * quiz 域的结构:选职业控件的正文(搜索框 → 搜索结果 / 分类导航 + 胶囊排 → 已选汇总
 * → 动作条)。搜索词满 2 个字就换成结果那一屏,不满就回到分类与热门。
 * 弹层里用(职位板/详情页)也要带上答题壳的 CSS —— 铺在答题卡里那条路由由 plan 桶
 * 自己挂了同一份,所以只在弹层形态补。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 * 2026-10-04 A2:大号档(访客第 3 题)—— 最上面一行已选标签(借 profile 桶 OnboardingTags,只回显这一屏胶囊外的码,
 * 名字取控件自己的名字表)→ 搜索框 → 结果 / 热门胶囊;分类导航、底部汇总、动作条都不出(钮区归宿主访客向导)。
 * 同日收口:已选标签那一行提成 OccTags(按专业取的热门还在路上时不渲,免得热门一到最上面一行跳一下)。
 * 同日收口审查:大号档的搜索框占位换短的 occ.ph(「搜索职业」;原借职位板那句举例长句 quiz.q2ph,英文 / 韩文手机上截半句,
 * 与第 2 题「搜索专业」也不成对);常规档照旧 quiz.q2ph,职位板一字不变。
 * 2026-10-05:交给各件的已选码换成已选职业(同组几个码算一个),搜索命中换成按职业合成的那份。
 * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:大号档(访客第 3 题)整个交给 OccRail(与第 2 题专业选择器同一副左右两栏:
 * 搜索框 → 已选一行 → 两栏 / 单列命中),本件只剩常规档;上面 A2 起几句大号档的摆法(已选标签在最上面、OccTags 借 OnboardingTags、
 * 占位 occ.ph 的来由)现归 OccRail 头注 —— 短占位 occ.ph 照用。常规档(职位板 / 详情页 / 决策页)渲出来一字不变。
 * 同日收口:在不在搜改读整机的 d.searchOn(原本件与 OccRail 各写一遍「去空白后够 QUERY_MIN 个字」),判定一字不变。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CLS_OCC_SEARCH_WRAP } from './constants'
import { OccActions } from './occactions'
import { OccCats } from './occcats'
import { OccHead } from './occhead'
import { OccList } from './occlist'
import { OccRail } from './occrail'
import { OccResults } from './occresults'
import { OccSelected } from './occselected'
import { OccStyle } from './occstyle'
import { QuizStyle } from './quizstyle'
import { Search } from '@/components/search'
import type { OccBodyIn } from './types'

/**
 * 渲染选职业控件的正文。
 *
 * @param props 取词函数、界面语言码、整机、四个形态档与两个出口。
 * @returns 控件正文;大号档 = OccRail 的左右两栏。
 */
export function OccBody({ t, lang, d, inline, hideDone, doneLabel, finishLabel, onClose, onFinish, lg }: OccBodyIn) {
  if (lg) {
    return <OccRail t={t} lang={lang} d={d} />
  }
  const searchMode = d.searchOn
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
          hits={d.hits}
          picked={d.picked}
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
          picked={d.picked}
          dupCount={d.dupCount}
          pickOf={d.pickOf} />
      )}
      {hideDone !== true && (
        <OccSelected t={t} picked={d.picked} titles={d.titles} pickOf={d.pickOf} />
      )}
      <OccActions t={t}
        inline={inline}
        picked={d.picked}
        doneLabel={doneLabel}
        finishLabel={finishLabel}
        onNext={d.onNext}
        onFinish={onFinish} />
    </>
  )
}
