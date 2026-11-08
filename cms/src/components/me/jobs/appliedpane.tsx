'use client'
/**
 * me 桶子桶 jobs 的「我的投递」页签(2026-10-06 Frank「先做我的求职」):投递记录。拉失败出「刷新再试」,不冒充「还没有投递」。
 * 2026-10-08 进度板:顶上一排阶段筛选带计数(全部 / 未发出 / 已投 / 雇主回复 / 退信,计数为 0 的不出);
 * 2026-10-09 Frank「去职位板 删掉吧」—— 空态只留一行「还没有投递」。2026-10-13 Frank「每个 table 都有分页吧」:分页壳,换档从头列。
 * 2026-11-07 效果图:分区白卡换成页签;一行一颗钮 —— 发出去的「打开」(只读投递框)、草稿「继续」;「删除」与简历 / 求职信链接撤。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { useLang } from '@/components/i18n'
import { KIND_APPLIED } from './constants'
import { appliedColsOf, byStageOf, listRowsOf, stagePillsOf } from './functions'
import { AskDelModal } from './askdelmodal'
import { useAskDel, useLazyCompanies, useLazyTitles } from './hooks'
import { PagedJobList } from './pagedjoblist'
import { StageBar } from './stagebar'
import type { ListPaneIn } from './types'
import css from './jobs.module.css'

/**
 * 「我的投递」页签。
 *
 * @param props 取词函数、投递清单整机与开投递框。
 * @returns 筛选排 + 表(或失败一句);还没拉到不渲。
 */
export function AppliedPane({ t, l, openApp }: ListPaneIn) {
  const [lang] = useLang()
  const titles = useLazyTitles({ items: l.items, lang })
  const cos = useLazyCompanies({ items: l.items, lang })
  const a = useAskDel()
  if (l.failed) {
    return <div className={cssOf(css.note)}>{t('mj.fail')}</div>
  }
  if (l.items == null) {
    return null
  }
  const items = byStageOf({ items: l.items, stage: l.stage })
  const rows = listRowsOf({
    kind: KIND_APPLIED, ask: a.onAsk, remove: l.remove, filter: l.stage, items, t, lang, titles, cos, openApp,
  })
  return (
    <>
      {l.items.length > 0 && (
        <StageBar pills={stagePillsOf({ items: l.items, stage: l.stage, t })} setStage={l.setStage} />
      )}
      <PagedJobList key={l.stage} rows={rows} cols={appliedColsOf({ t })} t={t}
        empty={<div className={cssOf(css.note)}>{t('mj.emptyApplied')}</div>} />
      <AskDelModal t={t} a={a} />
    </>
  )
}
