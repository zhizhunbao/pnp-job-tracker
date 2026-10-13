'use client'
/**
 * 「我的求职」一节(2026-10-06 Frank「先做我的求职」):投递记录。还在拉时不渲;拉失败出「刷新再试」,不冒充「还没有投递」。
 * 2026-10-08 进度板:顶上一排阶段胶囊带计数(全部 / 草稿 / 待投 / 已投递 / 雇主回复 / 退信,点了只看那一档),
 * 下面一岗一张横卡;空态一行「还没有投递」+ 「去职位板」。
 * 2026-10-09 N 批(Frank「一个全站宿主,并掉各页那 5 套」):本页不再自己画 PeekStack,改摆 modal 桶的报件 PeekContext
 * (报本页的分层态与职业名表),弹框由全站骨架上的 PeekHost 画。
 * 2026-10-09 Frank 测「我的求职」:「去职位板 删掉吧」—— 空态只留一行「还没有投递」(顶栏「职位」就是去职位板)。
 * 2026-10-10 批 2「我的求职」四段(16b):本件成「我的投递 N」那张分区白卡(section 桶内件 Section);胶囊改 全部 / 未发出 / 已投 /
 * 雇主回复 / 退信,计数为 0 的不出(见 constants 的 STAGE_FILTERS 与 functions 的 stagePillsOf)。
 * 同日 lead 对效果图:清单网页端改通用表格(… / 状态 / 投递于 / 操作),手机一岗一张卡(JobList)。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { useLang } from '@/components/i18n'
import { PeekContext } from '@/components/modal'
import { AskDelModal } from './askdelmodal'
import { ANCHOR_APPLIED, KIND_APPLIED, NOC_DESC_NONE, URL_APPLIED } from './constants'
import { appliedColsOf, byStageOf, countOf, listRowsOf, makePick, stagePillsOf } from './functions'
import { useAskDel, useLazyCompanies, useLazyTitles, useMyJobs } from './hooks'
import { JobList } from './joblist'
import { Section } from './section'
import { StageBar } from './stagebar'
import type { MyJobsListIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染「我的求职」。
 *
 * @param props 取词函数与分层态。
 * @returns 「我的投递」白卡:胶囊排 + 横卡清单(或失败一句)。
 */
export function AppliedList({ t, plan }: MyJobsListIn) {
  const [lang] = useLang()
  const p = useMyJobs({ url: URL_APPLIED })
  const titles = useLazyTitles({ items: p.items, lang })
  const cos = useLazyCompanies({ items: p.items, lang })
  const del = useAskDel()
  if (p.items == null) {
    return null
  }
  if (p.failed) {
    return (
      <Section title={t('mj.appliedTitle')} count={null} anchor={ANCHOR_APPLIED}>
        <div className={css.note}>{t('mj.fail')}</div>
      </Section>
    )
  }
  const rows = listRowsOf({
    kind: KIND_APPLIED,
    filter: p.stage,
    items: byStageOf({ items: p.items, stage: p.stage }),
    t,
    setItems: p.setItems,
    lang,
    titles,
    cos,
    setAsk: del.setAsk,
  })
  const empty = <div className={css.note}>{t('mj.emptyApplied')}</div>
  return (
    <Section title={t('mj.appliedTitle')} count={countOf(p.items.length)} anchor={ANCHOR_APPLIED}>
      {p.items.length > 0 && (
        <StageBar pills={stagePillsOf({ items: p.items, stage: p.stage, t })}
          onPick={makePick({ setStage: p.setStage })} />
      )}
      <JobList rows={rows} cols={appliedColsOf({ t })} empty={empty} />
      <PeekContext plan={plan} nocDesc={NOC_DESC_NONE} />
      <AskDelModal t={t} a={del} />
    </Section>
  )
}
