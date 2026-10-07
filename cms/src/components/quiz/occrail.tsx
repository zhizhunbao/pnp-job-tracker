'use client'
/**
 * quiz 域的结构:选职业控件大号档(访客第 3 题「你想做什么工作?」)的正文 —— 与第 2 题专业选择器同一副左右两栏
 * (2026-10-05 Frank「也改成左右 两部分吗?」「改啊」;照 majors 桶 MajorPicker 的形):搜索框 → 已选一行(OccTags,tag 桶 TagRow)
 * → 没在搜时两栏(tabs 桶 RailTabs:左栏「推荐」+ 全站大类,右边 OccCards),在搜时两栏整块换成单列命中(OccLines,一行一个、
 * 检索词标主色,在途摆 loading 桶那一行,一条都没搜到出原有的空态句)。两栏与单列都装在 pane 桶 Pane 里(定高、贴白卡边、
 * 上下细线;已选一行在的时候让出它的高),白卡总高在没选 / 选了 / 在搜 / 换大类之间不变、不出竖条。竖排、块间距与左栏宽见
 * quiz.module.css 的 .rail。
 * 数据与手柄全是选职业整机原有的:推荐 = 热门那一屏(给了专业码按专业取),大类 = 分类目录按需取(取过的不再取),
 * 搜索 = /api/quiz?q=(≥2 字、防抖),同组几个码合成一个职业、点一下整组选上 / 撤掉;命中点选照旧选完清空搜索框回到两栏。
 * 本件只换摆法:不设上限(第 3 题从来没有),钮区照旧归宿主(访客向导 GateFoot)。
 * 替掉原先大号胶囊那一屏(OccLgPill / OccPills / chip 桶大号胶囊排与占位;已选标签借 profile 桶 OnboardingTags 摆在最上面)。
 * 2026-10-05 同日收口:竖排外层换成 pane 桶 PaneStack(与第 2 题 MajorPicker 的竖排逐格相同,并成一份;块间距与 Pane 让高
 * 同住 pane.module.css),上面「竖排、块间距与左栏宽见 quiz.module.css 的 .rail」现只剩左栏宽(.rail 当 railCls 递过去);
 * 在不在搜改读整机的 d.searchOn(原本件与常规档 OccBody 各写一遍「去空白后够 QUERY_MIN 个字」,判定收回整机一处);
 * 已选一行 OccTags 只收它真读的取词函数与整机(不递界面语言码)。
 *
 * @author Frank
 * @time 2026-10-05 14:11:12
 */
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { Pane, PaneStack } from '@/components/pane'
import { Search } from '@/components/search'
import { RailTabs } from '@/components/tabs'
import { ARIA_LIVE_POLITE, LEN_ZERO, OCC_LOADING_KEY, OCC_RAIL_ID } from './constants'
import { occRailItemsOf, railKeyOf } from './functions'
import { OccCards } from './occcards'
import { OccLines } from './occlines'
import { OccTags } from './occtags'
import type { OccRailIn } from './types'
import css from './quiz.module.css'

/**
 * 大号档的答题区。
 *
 * @param props 取词函数、界面语言码与选职业整机(见 OccRailIn 逐格注释)。
 * @returns 搜索框 + 已选一行 + 单列命中(在搜时)或左栏两栏(没在搜时)。
 */
export function OccRail({ t, lang, d }: OccRailIn) {
  const tagged = d.picked.length > LEN_ZERO
  return (
    <PaneStack railCls={cssOf(css.rail)}>
      <Search value={d.q} onChange={d.onSearch} placeholder={t('occ.ph')} />
      <OccTags t={t} d={d} />
      {d.searchOn && (
        <Pane list belowTags={tagged} live={ARIA_LIVE_POLITE}>
          <OccLines items={d.hits} mark={d.q} picked={d.picked} lang={lang} pickOf={d.candPickOf} />
          {d.searching && <Loading text={t(OCC_LOADING_KEY)} />}
          {d.searching === false && d.hits.length === LEN_ZERO && (
            <div className={css.noResult}>{t('occ.noResult')}</div>
          )}
        </Pane>
      )}
      {d.searchOn === false && (
        <Pane list={false} belowTags={tagged}>
          <RailTabs items={occRailItemsOf({ t, cats: d.cats })}
            value={railKeyOf(d.cat)}
            onChange={d.onRail}
            ariaLabel={t('mkt.broad')}
            idPrefix={OCC_RAIL_ID}>
            <OccCards t={t} lang={lang} d={d} />
          </RailTabs>
        </Pane>
      )}
    </PaneStack>
  )
}
