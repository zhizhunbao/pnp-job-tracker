'use client'
/**
 * ops 组件域的正文:一页运维看板(四格加一到两张表)。所有页面共用这一个模板,
 * 加观察维度只动 lib/ops 的清单与取数。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { NumCards } from '@/components/card'
import { useLang } from '@/components/i18n'
import { ConfirmModal } from '@/components/modal'
import { Shell } from '@/components/shell'
import { Tag } from '@/components/tag'
import { CANCEL_TEXT, DEL_ASK_TEXT, DEL_FAIL_TEXT, DEL_TEXT, SHELL_BOTTOM, SHELL_TOP, VAR_BAD } from './constants'
import { cardsSayOf } from './functions'
import { delCtxOf, useOpsDel, useReportUpdated } from './hooks'
import { OpsTableCard } from './opstablecard'
import type { OpsViewIn } from './types'
import css from './ops.module.css'

/**
 * 运维页正文。
 *
 * @param props 这一页的看板。
 * @returns 四格与表。
 */
export function OpsView({ board }: OpsViewIn) {
  useReportUpdated(board.updatedAt)
  const [, , t] = useLang()
  const del = useOpsDel()
  const Ctx = delCtxOf()
  const tables = []
  for (const t of board.tables) {
    tables.push(<OpsTableCard key={t.title} table={t} />)
  }
  return (
    <Shell top={SHELL_TOP} bottom={SHELL_BOTTOM}>
      <Ctx.Provider value={del.setAsk}>
        <NumCards cards={cardsSayOf({ cards: board.cards, t })} />
        <div className={css.tables}>
          {del.failed && <Tag variant={VAR_BAD}>{t(DEL_FAIL_TEXT)}</Tag>}
          {tables}
        </div>
      </Ctx.Provider>
      {del.ask != null && (
        <ConfirmModal title={t(DEL_ASK_TEXT)} body={del.ask.name} okText={t(DEL_TEXT)} cancelText={t(CANCEL_TEXT)}
          onOk={del.onOk} onCancel={del.onCancel} />
      )}
    </Shell>
  )
}
