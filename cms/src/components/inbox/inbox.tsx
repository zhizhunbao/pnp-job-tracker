'use client'
/**
 * 「收件箱」一节(2026-10-10 批 3,docs/design/我的/我的求职-20261009.md 1.5 / 2.5;图 网页端-改之后-8-收件箱 / 手机端-改之后-8-收件箱):
 * 两张分区白卡 —— ① 收件箱:投递邮箱(专属地址)+「同时转到 <账户邮箱>」勾选;② 网页端左清单右阅读区,手机只出清单,
 * 点一封弹阅读框(通用 modal 桶的窗口形,手机全屏)。回信框叠在上面。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { CARD_MD_CLS } from './constants'
import { useInbox } from './hooks'
import { InboxAddr } from './inboxaddr'
import { InboxModal } from './inboxmodal'
import { InboxRead } from './inboxread'
import { InboxRow } from './inboxrow'
import { ReplyBox } from './replybox'
import type { InboxIn } from './types'
import css from './inbox.module.css'

/**
 * 收件箱一节。
 *
 * @param props 取词函数。
 * @returns 两张白卡(还没拉回来不渲;拉失败一句)。
 */
export function Inbox({ t }: InboxIn) {
  const p = useInbox({ t })
  if (p.failed) {
    return <section className={CARD_MD_CLS}><div className={css.note}>{t('mj.fail')}</div></section>
  }
  if (p.data == null) {
    return null
  }
  const rows = []
  for (const m of p.data.items) {
    let on = false
    if (p.narrow === false && p.cur != null && p.cur.id === m.id) {
      on = true
    }
    rows.push(<InboxRow key={m.id} m={m} on={on} onClick={p.pickOf(m.id)} t={t} />)
  }
  return (
    <>
      <InboxAddr p={p} t={t} />
      <section className={CARD_MD_CLS}>
        {rows.length === 0 && <div className={css.note}>{t('ib.empty')}</div>}
        {rows.length > 0 && (
          <div className={css.panes}>
            <div className={css.list}>{rows}</div>
            {p.narrow === false && p.cur != null && (
              <div className={css.pane}><InboxRead p={p} m={p.cur} t={t} withTitle /></div>
            )}
          </div>
        )}
      </section>
      {p.narrow && p.cur != null && <InboxModal p={p} m={p.cur} t={t} />}
      {p.replying && p.cur != null && <ReplyBox p={p} m={p.cur} t={t} />}
    </>
  )
}
