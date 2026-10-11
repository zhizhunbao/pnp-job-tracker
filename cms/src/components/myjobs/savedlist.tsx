'use client'
/**
 * 「我的收藏」一节(2026-10-06 Frank「也重新改一下」):收藏的岗,一岗一张横卡(薪资绿字、发布日期、能投的「投递」、取消收藏);
 * 顶上一枚「N 个收藏」。每周提醒开关由页面门拼在清单下面(account 桶的 WeeklyOptin)。
 * 2026-10-09 N 批(Frank「一个全站宿主,并掉各页那 5 套」):本页不再自己画 PeekStack,改摆 modal 桶的报件 PeekContext
 * (报本页的分层态与职业名表),弹框由全站骨架上的 PeekHost 画。
 * 2026-10-10 批 2「我的求职」四段(16b,Frank「单独一个我的收藏没意义」「收藏之后,下一步就是准备投递了」):「我的收藏」页签撤,
 * 本件搬进「我的求职」成「我的收藏 N」那张分区白卡(计数挪到卡头,「N 个收藏」胶囊撤);空态一行「还没有收藏」,「去职位板」撤
 * (10-09 Frank「去职位板 删掉吧」);旧深链 `?sec=favs` 挂上后滚到这张卡;周报开关 WeeklyOptin 由「新岗推送」卡接替。
 * 同日 lead 对效果图:清单网页端改通用表格(… / 收藏于 / 操作「投递」「取消收藏」),手机一岗一张卡(JobList)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { useLang } from '@/components/i18n'
import { PeekContext } from '@/components/modal'
import { ANCHOR_SAVED, KIND_SAVED, NOC_DESC_NONE, STAGE_ALL, URL_SAVED } from './constants'
import { countOf, listRowsOf, savedColsOf } from './functions'
import { useMyJobs, useScrollSaved } from './hooks'
import { JobList } from './joblist'
import { Section } from './section'
import type { MyJobsListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染「我的收藏」。
 *
 * @param props 取词函数与分层态。
 * @returns 「我的收藏」白卡:横卡清单(或失败一句)。
 */
export function SavedList({ t, plan }: MyJobsListIn) {
  const [lang] = useLang()
  const p = useMyJobs({ url: URL_SAVED })
  useScrollSaved(p.items != null)
  if (p.items == null) {
    return null
  }
  if (p.failed) {
    return (
      <Section title={t('fav.title')} count={null} anchor={ANCHOR_SAVED}>
        <div className={css.note}>{t('mj.fail')}</div>
      </Section>
    )
  }
  const rows = listRowsOf({
    kind: KIND_SAVED,
    filter: STAGE_ALL,
    items: p.items,
    t,
    setItems: p.setItems,
    lang,
  })
  return (
    <Section title={t('fav.title')} count={countOf(p.items.length)} anchor={ANCHOR_SAVED}>
      <JobList rows={rows} cols={savedColsOf({ t })} empty={<div className={css.note}>{t('sj.empty')}</div>} />
      <PeekContext plan={plan} nocDesc={NOC_DESC_NONE} />
    </Section>
  )
}
