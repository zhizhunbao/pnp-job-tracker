'use client'
/**
 * me 桶子桶 inbox 的结构:收件箱清单里的一封(照效果图:发件人 + 日期一行、主题一行、摘要一行灰字;没读的前面一个蓝点、字加粗)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { dayOf, inboxRowClsOf, senderOf, snippetOf, subjectOf } from './functions'
import type { InboxRowIn } from './types'
import css from './inbox.module.css'

/**
 * 清单里的一封。
 *
 * @param props 那一封、当前否、点击回调与取词。
 * @returns 一行钮。
 */
export function InboxRow({ m, on, onClick, t }: InboxRowIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} className={inboxRowClsOf({ on, unread: m.read === false })} onClick={onClick}>
      <span className={cssOf(css.ibTop)}>
        <span className={cssOf(css.ibSender)}>
          {m.read === false && <span className={cssOf(css.ibDot)} />}
          {senderOf(m)}
        </span>
        <span className={cssOf(css.ibDay)}>{dayOf(m.at)}</span>
      </span>
      <span className={cssOf(css.ibSubject)}>{subjectOf({ m, t })}</span>
      <span className={cssOf(css.ibSnippet)}>{snippetOf(m)}</span>
    </Button>
  )
}
