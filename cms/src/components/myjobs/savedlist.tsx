'use client'
/**
 * 「我的收藏」一节(2026-10-06 Frank「也重新改一下」):职位 / 公司 / 市 / 薪资 / 发布日期 / 状态 / 操作(打开、取消收藏),
 * 与「我的求职」同一套格子;投过的岗在状态格写「已投」。每周提醒开关由页面门拼在表下面(account 桶的 WeeklyOptin)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { PeekStack } from '@/components/advisor'
import { KIND_SAVED, NOC_DESC_NONE, URL_SAVED } from './constants'
import { myJobCellRowsOf, savedColsOf } from './functions'
import { useMyJobs } from './hooks'
import { MyJobsView } from './myjobsview'
import type { MyJobsListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染「我的收藏」。
 *
 * @param props 取词函数与分层态。
 * @returns 表与卡片流(或失败一句)。
 */
export function SavedList({ t, plan }: MyJobsListIn) {
  const p = useMyJobs({ url: URL_SAVED })
  if (p.items == null) {
    return null
  }
  if (p.failed) {
    return <div className={css.note}>{t('mj.fail')}</div>
  }
  const rows = myJobCellRowsOf({
    kind: KIND_SAVED,
    items: p.items,
    lang: p.lang,
    t,
    setItems: p.setItems,
    onOpenCompany: p.onOpenCompany,
    onOpenJob: p.onOpenJob,
  })
  return (
    <>
      <MyJobsView cols={savedColsOf(t)} rows={rows} empty={<div className={css.note}>{t('sj.empty')}</div>} />
      <PeekStack stack={p.stack} lang={p.lang} plan={plan} nocDesc={NOC_DESC_NONE} />
    </>
  )
}
