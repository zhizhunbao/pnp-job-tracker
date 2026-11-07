'use client'
/**
 * me 桶子桶 inbox 的结构:收件箱阅读区(照效果图:主题、发件人一行、来信与我的回信按先后排,最下面一颗「回复」;
 * 对得上投递的多一颗「打开这次投递」)。宽屏住右边一栏,窄屏装进弹框。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PRIMARY_KIND, SECONDARY_KIND } from './constants'
import { minuteOf, senderLineOf, senderOf, subjectOf } from './functions'
import type { InboxReadIn } from './types'
import css from './inbox.module.css'

/**
 * 阅读区。
 *
 * @param props 收件箱状态、那一封与取词。
 * @returns 一封信的往来。
 */
export function InboxRead({ p, m, t }: InboxReadIn) {
  const mine = []
  for (const r of m.replies) {
    mine.push(
      <div key={r.id} className={cssOf(css.ibMsg)}>
        <div className={cssOf(css.ibMsgHead)}>
          <span className={cssOf(css.ibMsgWho)}>{t('ib.mine')}</span>
          <span>{minuteOf(r.at)}</span>
        </div>
        <div className={cssOf(css.ibBody)}>{r.text}</div>
      </div>,
    )
  }
  return (
    <div className={cssOf(css.ibRead)}>
      <div className={cssOf(css.ibReadTitle)}>{subjectOf({ m, t })}</div>
      <div className={cssOf(css.ibReadFrom)}>{senderLineOf(m)}</div>
      <div className={cssOf(css.ibMsg)}>
        <div className={cssOf(css.ibMsgHead)}>
          <span className={cssOf(css.ibMsgWho)}>{senderOf(m)}</span>
          <span>{minuteOf(m.at)}</span>
        </div>
        <div className={cssOf(css.ibBody)}>{m.text}</div>
      </div>
      {mine}
      <div className={cssOf(css.ibActs)}>
        <Button kind={PRIMARY_KIND} onClick={p.onReply}>{t('ib.reply')}</Button>
        {m.appId != null && <Button kind={SECONDARY_KIND} onClick={p.onOpenApp}>{t('ib.openApp')}</Button>}
      </div>
    </div>
  )
}
