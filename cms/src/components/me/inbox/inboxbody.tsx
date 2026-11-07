'use client'
/**
 * me 桶子桶 inbox 的结构:收件箱正文(效果图 docs/design/我的/我的框架-20261107.md 2.2):一张卡,宽屏左清单右阅读区,
 * 窄屏只出清单、点一封弹框看;回信走弹框。拉失败、没信各一句。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { cssOf } from '@/components/css'
import { CARD_MD_CLS } from './constants'
import { InboxModal } from './inboxmodal'
import { InboxRead } from './inboxread'
import { InboxReply } from './inboxreply'
import { InboxRow } from './inboxrow'
import type { InboxPartIn } from './types'
import css from './inbox.module.css'

/**
 * 收件箱正文。
 *
 * @param props 收件箱状态与取词。
 * @returns 卡 + 弹框。
 */
export function InboxBody({ p, t }: InboxPartIn) {
  const rows = []
  if (p.data != null) {
    for (const m of p.data.items) {
      const on = p.narrow === false && p.cur != null && p.cur.id === m.id
      rows.push(<InboxRow key={m.id} m={m} on={on} onClick={p.pickOf(m.id)} t={t} />)
    }
  }
  return (
    <>
      {p.failed && <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t('mj.fail')}</div></section>}
      {p.data != null && rows.length === 0 && (
        <section className={CARD_MD_CLS}><div className={cssOf(css.note)}>{t('ib.empty')}</div></section>
      )}
      {rows.length > 0 && (
        <section className={`${CARD_MD_CLS} ${cssOf(css.ibCard)}`}>
          <div className={cssOf(css.ibPanes)}>
            <div className={cssOf(css.ibList)}>{rows}</div>
            {p.narrow === false && p.cur != null && (
              <div className={cssOf(css.ibPane)}><InboxRead p={p} m={p.cur} t={t} /></div>
            )}
          </div>
        </section>
      )}
      {p.narrow && p.cur != null && <InboxModal p={p} m={p.cur} t={t} />}
      {p.replying && p.cur != null && <InboxReply p={p} m={p.cur} t={t} />}
    </>
  )
}
