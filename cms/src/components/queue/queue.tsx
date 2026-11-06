'use client'
/**
 * queue 域的结构:/queue 管理员队列页的正文(2026-11-05 Frank「我这个账号是管理员,我需要在 header 加一项,
 * 我能看到所有在排队的任务」「其他账号看不到」;范围四种、形态独立页面,当轮 AskUserQuestion 拍)。
 * **内部页**:数据由服务端门鉴权后洗好传进来,这里零业务逻辑;文案只有中文(同 /funnel)。
 * 版式:标题卡(H1 + 右上角更新时刻)下面四张分区白卡,一种排队一张,卡里一张通用 Table。
 * 2026-11-06 Frank「全都加一个删除按钮」:四张表最右加操作列「删除」,点了先弹确认框(modal 桶 ConfirmModal),
 * 删成了 router.refresh 重取;没成在标题卡挂一枚红胶囊「删除失败」。拨框手柄经上下文下发给每颗删除钮。
 * 同日「跑完的任务是不是应该有历史记录」:调度单元卡下面加「最近跑完」卡(etl_unit_runs,最近 100 轮),失败行下挂报错。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { useLang } from '@/components/i18n'
import { ConfirmModal } from '@/components/modal'
import { Shell } from '@/components/shell'
import { Table } from '@/components/table'
import { Tag } from '@/components/tag'
import { Updated } from '@/components/time'
import {
  ALIAS_MIN_W, APPLY_MIN_W, CANCEL_TEXT, CARD_MD_CLS, CLS_SEP, DEL_ASK_TEXT, DEL_FAIL_TEXT, DEL_TEXT, EMPTY_TEXT,
  EMPTY_RUNS_TEXT, EMPTY_UNITS_TEXT, RUNS_MIN_W, SEC_ALIAS_TEXT, SEC_APPLY_TEXT, SEC_RUNS_TEXT, VAR_BAD,
  SEC_SITES_TEXT, SEC_UNITS_TEXT, SITES_MIN_W, TITLE_TEXT, UNITS_MIN_W,
} from './constants'
import { aliasColsOf, applyColsOf, queueRowKeyOf, runColsOf, siteColsOf, unitColsOf } from './functions'
import { DelCell } from './delcell'
import { delCtxOf, useQueueDel } from './hooks'
import { QueueSection } from './queuesection'
import { RunError } from './runerror'
import type { AliasRow, ApplyRow, QueueIn, RunRow, SiteRow, UnitRow } from './types'
import css from './queue.module.css'

/**
 * 队列页正文。
 *
 * @param props 服务端门洗好的整块看板(逐格注释见 QueueBoard)。
 * @returns 正文(Shell 轨 + 标题卡 + 四张分区卡)。
 */
export function Queue({ board }: QueueIn) {
  const [, , t] = useLang()
  const del = useQueueDel()
  const Ctx = delCtxOf()
  return (
    <Shell>
      <Ctx.Provider value={del.setAsk}>
        <div className={CARD_MD_CLS + CLS_SEP + css.head}>
          <h1 className={css.h1}>{TITLE_TEXT}</h1>
          {del.failed && <Tag variant={VAR_BAD}>{DEL_FAIL_TEXT}</Tag>}
          <Updated iso={board.updatedAt} t={t} />
        </div>
        <QueueSection title={SEC_UNITS_TEXT} count={board.unitsCount}>
          <Table<UnitRow> cols={unitColsOf(DelCell)} rows={board.units} rowKey={queueRowKeyOf} bare
            minWidth={UNITS_MIN_W} empty={EMPTY_UNITS_TEXT} />
        </QueueSection>
        <QueueSection title={SEC_RUNS_TEXT} count={board.runsCount}>
          <Table<RunRow> cols={runColsOf()} rows={board.runs} rowKey={queueRowKeyOf} bare detailOf={RunError}
            minWidth={RUNS_MIN_W} empty={EMPTY_RUNS_TEXT} />
        </QueueSection>
        <QueueSection title={SEC_APPLY_TEXT} count={board.applyCount}>
          <Table<ApplyRow> cols={applyColsOf(DelCell)} rows={board.apply} rowKey={queueRowKeyOf} bare
            minWidth={APPLY_MIN_W} empty={EMPTY_TEXT} />
        </QueueSection>
        <QueueSection title={SEC_SITES_TEXT} count={board.sitesCount}>
          <Table<SiteRow> cols={siteColsOf(DelCell)} rows={board.sites} rowKey={queueRowKeyOf} bare
            minWidth={SITES_MIN_W} empty={EMPTY_TEXT} />
        </QueueSection>
        <QueueSection title={SEC_ALIAS_TEXT} count={board.aliasCount}>
          <Table<AliasRow> cols={aliasColsOf(DelCell)} rows={board.alias} rowKey={queueRowKeyOf} bare
            minWidth={ALIAS_MIN_W} empty={EMPTY_TEXT} />
        </QueueSection>
      </Ctx.Provider>
      {del.ask != null && (
        <ConfirmModal title={DEL_ASK_TEXT} body={del.ask.name} okText={DEL_TEXT} cancelText={CANCEL_TEXT}
          onOk={del.onOk} onCancel={del.onCancel} />
      )}
    </Shell>
  )
}
