'use client'
/**
 * queue 域的结构:/queue 管理员队列页的正文(2026-11-05 Frank「我这个账号是管理员,我需要在 header 加一项,
 * 我能看到所有在排队的任务」「其他账号看不到」;范围四种、形态独立页面,当轮 AskUserQuestion 拍)。
 * **内部页**:数据由服务端门鉴权后洗好传进来,这里零业务逻辑;文案只有中文(同 /funnel)。
 * 版式:标题卡(H1 + 右上角更新时刻)下面四张分区白卡,一种排队一张,卡里一张通用 Table。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { Table } from '@/components/table'
import { Updated } from '@/components/time'
import {
  ALIAS_MIN_W, APPLY_MIN_W, CARD_MD_CLS, CLS_SEP, EMPTY_TEXT, EMPTY_UNITS_TEXT, SEC_ALIAS_TEXT, SEC_APPLY_TEXT,
  SEC_SITES_TEXT, SEC_UNITS_TEXT, SITES_MIN_W, TITLE_TEXT, UNITS_MIN_W,
} from './constants'
import { aliasColsOf, applyColsOf, queueRowKeyOf, siteColsOf, unitColsOf } from './functions'
import { QueueSection } from './queuesection'
import type { AliasRow, ApplyRow, QueueIn, SiteRow, UnitRow } from './types'
import css from './queue.module.css'

/**
 * 队列页正文。
 *
 * @param props 服务端门洗好的整块看板(逐格注释见 QueueBoard)。
 * @returns 正文(Shell 轨 + 标题卡 + 四张分区卡)。
 */
export function Queue({ board }: QueueIn) {
  const [, , t] = useLang()
  return (
    <Shell>
      <div className={CARD_MD_CLS + CLS_SEP + css.head}>
        <h1 className={css.h1}>{TITLE_TEXT}</h1>
        <Updated iso={board.updatedAt} t={t} />
      </div>
      <QueueSection title={SEC_UNITS_TEXT} count={board.unitsCount}>
        <Table<UnitRow> cols={unitColsOf()} rows={board.units} rowKey={queueRowKeyOf} bare
          minWidth={UNITS_MIN_W} empty={EMPTY_UNITS_TEXT} />
      </QueueSection>
      <QueueSection title={SEC_APPLY_TEXT} count={board.applyCount}>
        <Table<ApplyRow> cols={applyColsOf()} rows={board.apply} rowKey={queueRowKeyOf} bare
          minWidth={APPLY_MIN_W} empty={EMPTY_TEXT} />
      </QueueSection>
      <QueueSection title={SEC_SITES_TEXT} count={board.sitesCount}>
        <Table<SiteRow> cols={siteColsOf()} rows={board.sites} rowKey={queueRowKeyOf} bare
          minWidth={SITES_MIN_W} empty={EMPTY_TEXT} />
      </QueueSection>
      <QueueSection title={SEC_ALIAS_TEXT} count={board.aliasCount}>
        <Table<AliasRow> cols={aliasColsOf()} rows={board.alias} rowKey={queueRowKeyOf} bare
          minWidth={ALIAS_MIN_W} empty={EMPTY_TEXT} />
      </QueueSection>
    </Shell>
  )
}
