'use client'
/**
 * 只读投递框「雇主回复」卡里的一封(2026-10-10 批 3,照效果图 网页端-改之后-4-点打开):发件人粗体 + 右边收到时刻,下面正文;
 * 本人在站内回过的,接在下面一块「我的回复」(时刻 + 正文)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import type { AvMsgIn } from './types'
import css from './myjobs.module.css'

/**
 * 一封雇主回信。
 *
 * @param props 那一封与取词函数。
 * @returns 一块。
 */
export function AvMsgCard({ m, t }: AvMsgIn) {
  const mine = []
  for (const r of m.replies) {
    mine.push(
      <div key={r.id} className={css.avMine}>
        <div className={css.avMsgHead}>
          <span className={css.avMineTag}>{t('ib.mine')}</span>
          <span className={css.avAt}>{r.at}</span>
        </div>
        <div className={css.avText}>{r.text}</div>
      </div>,
    )
  }
  return (
    <div className={css.avMsg}>
      <div className={css.avMsgHead}>
        <span className={css.avFrom}>{m.from}</span>
        <span className={css.avAt}>{m.at}</span>
      </div>
      <div className={css.avText}>{m.text}</div>
      {mine}
    </div>
  )
}
