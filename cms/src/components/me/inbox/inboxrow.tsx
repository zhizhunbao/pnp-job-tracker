'use client'
/**
 * me 桶子桶 inbox 的结构:收件箱清单里的一封(照效果图:发件人 + 日期一行、主题一行、摘要一行灰字;没读的前面一个蓝点、字加粗)。
 * 2026-11-07 照 Outlook 网页版(Frank「和 outlook 一致就行」):左边多一枚头像(auth 桶 Avatar:首字 + 按名字取的底色),
 * 没读的发件人与主题用主色、左边一个小蓝点。
 * 同日再照 Outlook(Frank「这部分 outlook 也是这样的吗」):小蓝点撤,没读的改左边一条主色竖条;选中的只铺浅底不带竖条。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
import { Avatar } from '@/components/auth'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { AVATAR_LIST, PLAIN_BTN_KIND } from './constants'
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
      <Avatar name={senderOf(m)} email={m.fromAddr} size={AVATAR_LIST} />
      <span className={cssOf(css.ibRowMain)}>
        <span className={cssOf(css.ibTop)}>
          <span className={cssOf(css.ibSender)}>{senderOf(m)}</span>
          <span className={cssOf(css.ibDay)}>{dayOf(m.at)}</span>
        </span>
        <span className={cssOf(css.ibSubject)}>{subjectOf({ m, t })}</span>
        <span className={cssOf(css.ibSnippet)}>{snippetOf(m)}</span>
      </span>
    </Button>
  )
}
