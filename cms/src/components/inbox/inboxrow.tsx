'use client'
/**
 * 收件箱清单一行(2026-10-10 批 3):左边首字母圆块;右边第一行发件人(没读的前面蓝点、加粗)+ 右端月-日,
 * 第二行标题(没读的加粗,一行截断),第三行相关职位灰字。选中的整行浅蓝底(网页端)。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { Button } from '@/components/button'
import { PLAIN_KIND, TEXT_NONE } from './constants'
import { dayOf, initialsOf, senderOf, subjectOf } from './functions'
import type { InboxRowIn } from './types'
import css from './inbox.module.css'

/**
 * 一行。
 *
 * @param props 那一封、选中、点击与取词函数。
 * @returns 一行(整行是一颗钮)。
 */
export function InboxRow({ m, on, onClick, t }: InboxRowIn) {
  let cls = css.row
  if (on) {
    cls = `${css.row} ${css.rowOn}`
  }
  if (m.read === false) {
    cls = `${cls} ${css.unread}`
  }
  return (
    <Button kind={PLAIN_KIND} className={cls} onClick={onClick}>
      <span className={css.avatar}>{initialsOf(m)}</span>
      <span className={css.rowMain}>
        <span className={css.rowTop}>
          <span className={css.sender}>
            {m.read === false && <span className={css.dot} />}
            {senderOf(m)}
          </span>
          <span className={css.day}>{dayOf(m.at)}</span>
        </span>
        <span className={css.subject}>{subjectOf({ m, t })}</span>
        {m.jobTitle !== TEXT_NONE && <span className={css.job}>{m.jobTitle}</span>}
      </span>
    </Button>
  )
}
