'use client'
/**
 * 「我的求职」一节(2026-10-06 Frank「先做我的求职」「这个不应该拆成多个字段吗」「进度这个用户会自己点吗」):
 * 职位 / 公司 / 市 / 投递日期 / 状态 / 操作,进度只读。还在拉时不渲;拉失败出「刷新再试」,不冒充「还没有投递」。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { PeekStack } from '@/components/advisor'
import { KIND_APPLIED, NOC_DESC_NONE, URL_APPLIED } from './constants'
import { appliedColsOf, myJobCellRowsOf } from './functions'
import { useMyJobs } from './hooks'
import { MyJobsView } from './myjobsview'
import type { MyJobsListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染「我的求职」。
 *
 * @param props 取词函数与分层态。
 * @returns 表与卡片流(或失败一句)。
 */
export function AppliedList({ t, plan }: MyJobsListIn) {
  const p = useMyJobs({ url: URL_APPLIED })
  if (p.items == null) {
    return null
  }
  if (p.failed) {
    return <div className={css.note}>{t('mj.fail')}</div>
  }
  const rows = myJobCellRowsOf({
    kind: KIND_APPLIED,
    items: p.items,
    lang: p.lang,
    t,
    setItems: p.setItems,
    onOpenCompany: p.onOpenCompany,
    onOpenJob: p.onOpenJob,
  })
  return (
    <>
      <MyJobsView cols={appliedColsOf(t)} rows={rows} empty={<div className={css.note}>{t('mj.emptyApplied')}</div>} />
      <PeekStack stack={p.stack} lang={p.lang} plan={plan} nocDesc={NOC_DESC_NONE} />
    </>
  )
}
