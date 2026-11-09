'use client'
/**
 * me 桶子桶 sub 的提醒列表(2026-11-08 Frank 选「并成一张提醒列表」;清单第 5、6 条,出处 Job Bank Job Alerts):
 * 第一行按档案推荐,后面按筛选条件,每行选频率(不发 = 停用)、改条件、删除。
 *
 * @author Frank
 * @time 2026-11-08 23:30:00
 */
import { cssOf } from '@/components/css'
import { ConfirmModal } from '@/components/modal'
import { Table } from '@/components/table'
import { AlertItem } from './alertitem'
import { alertColsOf, alertKeyOf } from './functions'
import type { AlertListIn } from './types'
import css from './sub.module.css'

/**
 * 提醒列表:宽屏表格,窄屏一条一张;删除先确认。
 *
 * @param props 列表状态与取词函数。
 * @returns 列表。
 */
export function AlertList({ a, t }: AlertListIn) {
  const items = []
  if (a.narrow) {
    for (const row of a.rows) {
      items.push(<AlertItem key={row.key} row={row} />)
    }
  }
  return (
    <>
      {a.failed && <div className={cssOf(css.note)}>{t('mj.fail')}</div>}
      {a.narrow && <div>{items}</div>}
      {a.narrow === false && <Table cols={alertColsOf(t)} rows={a.rows} rowKey={alertKeyOf} bare />}
      {a.ask != null && (
        <ConfirmModal title={t('al.delAsk')} body={a.ask.name} okText={t('al.del')} cancelText={t('al.cancel')}
          onOk={a.onAskOk} onCancel={a.onAskClose} />
      )}
    </>
  )
}
