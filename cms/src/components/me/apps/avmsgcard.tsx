'use client'
/**
 * me 桶子桶 apps 的只读投递框「雇主回复」卡里的一封(2026-10-10 批 3,照效果图 网页端-改之后-4-点打开):发件人粗体 + 右边收到时刻,
 * 下面正文;本人在站内回过的,接在下面一块「我的回复」(时刻 + 正文)。2026-11-07 自 myjobs 桶在新域重写。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import type { AvMsgIn } from './types'
import css from './apps.module.css'

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
      <div key={r.id} className={cssOf(css.avMine)}>
        <div className={cssOf(css.avMsgHead)}>
          <span className={cssOf(css.avMineTag)}>{t('ib.mine')}</span>
          <span className={cssOf(css.avAt)}>{r.at}</span>
        </div>
        <div className={cssOf(css.avText)}>{r.text}</div>
      </div>,
    )
  }
  return (
    <div className={cssOf(css.avMsg)}>
      <div className={cssOf(css.avMsgHead)}>
        <span className={cssOf(css.avFrom)}>{m.from}</span>
        <span className={cssOf(css.avAt)}>{m.at}</span>
      </div>
      <div className={cssOf(css.avText)}>{m.text}</div>
      {mine}
    </div>
  )
}
