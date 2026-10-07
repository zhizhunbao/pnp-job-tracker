'use client'
/**
 * quiz 域的结构:选职业的搜索结果区(计数行 + 命中胶囊,一条都没搜到时出空态框)。
 * 搜索口径与三问同源、不新写端点:`/api/quiz?q=`(≥2 字、防抖),chip 上挂真在招数。
 * 计数行挂 aria-live:结果条数变了要念出来。
 * 2026-08-28 换装批自 OccPicker.tsx 提出成件。
 * 2026-10-04 A2:大号档(访客第 3 题)的命中换 OccLgPill(chip 桶大号胶囊,不挂五位码小注),排距同热门那一屏。
 * 同日收口:一排的外框交给 OccPills(原体内按档挑类名,值的二选一提成具名件)。
 * 同日收口审查:大号档不出计数行(「找到 3 个职业」那一行与在途的省略号同一格,访客向导里不加解释性的字);
 * 在途改摆一小排 chip 桶大号胶囊占位(OCC_LG_HIT_SKEL_N 颗,同第 2 题专业搜索),结果到了原位替换。常规档一字不变。
 * 2026-10-05:命中按职业摆(同组几个候选合成一颗,如搜「software」命中的 21231 / 21232),计数行按职业数;
 * 常规档的五位码小注给代表码,点一下整组选上 / 撤掉。
 * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:大号档改走 OccRail(在搜时两栏整块换成单列命中,一行一个、检索词标主色、
 * 在途摆 loading 桶那一行),本件只剩常规档 —— 上面 A2 那几句(大号胶囊、不出计数行、大号占位 OCC_LG_HIT_SKEL_N 颗、外框交 OccPills)
 * 随大号档撤;一排的外框回到全局类 .occPills 那一排(常规档原本经 OccPills 渲的就是它,DOM 不变)。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { ARIA_LIVE_POLITE, CLS_OCC_PILLS, CLS_OCC_RESULTS_HEAD, LEN_ZERO, MARK_ELLIPSIS } from './constants'
import { OccCandPill } from './occcandpill'
import { itemNocsOf, itemOnOf, occLabelOf } from './functions'
import type { OccResultsIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染搜索结果区。
 *
 * @param props 取词函数、界面语言码、在途标、命中职业、已选职业与逐候选手柄工厂。
 * @returns 搜索结果区。
 */
export function OccResults({ t, lang, searching, hits, picked, pickOf }: OccResultsIn) {
  const pills = []
  for (const item of hits) {
    const c = item.head
    const label = occLabelOf({ row: c, lang })
    const on = itemOnOf({ key: item.key, picked })
    const onPick = pickOf({ key: item.key, nocs: itemNocsOf(item), name: label })
    pills.push(
      <OccCandPill key={c.noc}
        noc={c.noc}
        label={label}
        on={on}
        onPick={onPick} />,
    )
  }
  return (
    <div className={css.results} aria-live={ARIA_LIVE_POLITE}>
      {searching && <div className={CLS_OCC_RESULTS_HEAD}>{MARK_ELLIPSIS}</div>}
      {searching === false && (
        <div className={CLS_OCC_RESULTS_HEAD}>{t('occ.resultN', { n: hits.length })}</div>
      )}
      {searching === false && hits.length === LEN_ZERO && (
        <div className={css.noResult}>{t('occ.noResult')}</div>
      )}
      {(searching || hits.length > LEN_ZERO) && <div className={CLS_OCC_PILLS}>{pills}</div>}
    </div>
  )
}
