'use client'
/**
 * 收件箱阅读区(2026-10-10 批 3;网页端右栏与手机阅读框共用):标题(手机在窗口标题栏,这里不重复)+ 右上「回复」「打开这次投递」
 * (没挂投递的不出后一颗),发件人一行 + 收到时刻,正文原样换行;本人在站内回过的接在下面「我的回复」。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { Button } from '@/components/button'
import { REPLY_KIND, SUB_KIND } from './constants'
import { minuteOf, senderLineOf, subjectOf } from './functions'
import type { InboxReadIn } from './types'
import css from './inbox.module.css'

/**
 * 阅读区。
 *
 * @param props 整机面板、那一封、取词函数与要不要画标题。
 * @returns 阅读区。
 */
export function InboxRead({ p, m, t, withTitle }: InboxReadIn) {
  const mine = []
  for (const r of m.replies) {
    mine.push(
      <div key={r.id} className={css.mine}>
        <div className={css.meta}>
          <span className={css.mineTag}>{t('ib.mine')}</span>
          <span>{minuteOf(r.at)}</span>
        </div>
        <div className={css.body}>{r.text}</div>
      </div>,
    )
  }
  return (
    <div className={css.read}>
      <div className={css.readHead}>
        {withTitle && <div className={css.readTitle}>{subjectOf({ m, t })}</div>}
        <span className={css.readActs}>
          <Button kind={REPLY_KIND} sm onClick={p.onReply}>{t('ib.reply')}</Button>
          {m.appId != null && <Button kind={SUB_KIND} sm onClick={p.onOpenApp}>{t('ib.openApp')}</Button>}
        </span>
      </div>
      <div className={css.meta}>
        <span>{senderLineOf(m)}</span>
        <span>{minuteOf(m.at)}</span>
      </div>
      <div className={css.body}>{m.text}</div>
      {mine}
    </div>
  )
}
