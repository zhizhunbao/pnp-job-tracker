'use client'
/**
 * 「我的求职」一节(2026-10-06 Frank「先做我的求职」):投递记录。还在拉时不渲;拉失败出「刷新再试」,不冒充「还没有投递」。
 * 2026-10-08 进度板:顶上一排阶段胶囊带计数(全部 / 草稿 / 待投 / 已投递 / 雇主回复 / 退信,点了只看那一档),
 * 下面一岗一张横卡;空态一行「还没有投递」+ 「去职位板」。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { PeekStack } from '@/components/advisor'
import { Button } from '@/components/button'
import { KIND_APPLIED, NOC_DESC_NONE, PRIMARY_KIND, URL_APPLIED, URL_BOARD } from './constants'
import { byStageOf, makePick, myJobCellRowsOf, stagePillsOf } from './functions'
import { useMyJobs } from './hooks'
import { JobList } from './joblist'
import { StageBar } from './stagebar'
import type { MyJobsListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染「我的求职」。
 *
 * @param props 取词函数与分层态。
 * @returns 胶囊排 + 横卡清单(或失败一句)。
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
    items: byStageOf({ items: p.items, stage: p.stage }),
    lang: p.lang,
    t,
    setItems: p.setItems,
    onOpenCompany: p.onOpenCompany,
    onOpenJob: p.onOpenJob,
  })
  const empty = (
    <div className={css.empty}>
      <div className={css.note}>{t('mj.emptyApplied')}</div>
      <Button kind={PRIMARY_KIND} sm href={URL_BOARD}>{t('mj.toBoard')}</Button>
    </div>
  )
  return (
    <>
      {p.items.length > 0 && (
        <StageBar pills={stagePillsOf({ items: p.items, stage: p.stage, t })}
          onPick={makePick({ setStage: p.setStage })} />
      )}
      <JobList rows={rows} empty={empty} />
      <PeekStack stack={p.stack} lang={p.lang} plan={plan} nocDesc={NOC_DESC_NONE} />
    </>
  )
}
