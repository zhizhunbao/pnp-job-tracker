'use client'
/**
 * 「我的收藏」一节(2026-10-06 Frank「也重新改一下」):收藏的岗,一岗一张横卡(薪资绿字、发布日期、能投的「投递」、取消收藏);
 * 顶上一枚「N 个收藏」。每周提醒开关由页面门拼在清单下面(account 桶的 WeeklyOptin)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { PeekStack } from '@/components/advisor'
import { Button } from '@/components/button'
import { KIND_SAVED, NOC_DESC_NONE, PRIMARY_KIND, URL_BOARD, URL_SAVED } from './constants'
import { myJobCellRowsOf } from './functions'
import { useMyJobs } from './hooks'
import { JobList } from './joblist'
import type { MyJobsListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染「我的收藏」。
 *
 * @param props 取词函数与分层态。
 * @returns 计数 + 横卡清单(或失败一句)。
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
      {p.items.length > 0 && (
        <div className={css.stages}>
          <span className={css.stageOnly}>{t('mj.savedCount', { n: p.items.length })}</span>
        </div>
      )}
      <JobList rows={rows}
        empty={(
          <div className={css.empty}>
            <div className={css.note}>{t('sj.empty')}</div>
            <Button kind={PRIMARY_KIND} sm href={URL_BOARD}>{t('mj.toBoard')}</Button>
          </div>
        )} />
      <PeekStack stack={p.stack} lang={p.lang} plan={plan} nocDesc={NOC_DESC_NONE} />
    </>
  )
}
