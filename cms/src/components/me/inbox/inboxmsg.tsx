'use client'
/**
 * me 桶子桶 inbox 的结构:阅读区里的一封信卡片(2026-11-07 照 Outlook 网页版的会话视图:一封一张白卡,
 * 卡头 头像 + 谁 + 「发给 谁」+ 时刻,下面正文保留换行)。来信与我的回信同一个件。
 * 2026-11-13 Frank「我的这个排版和 outlook 不一样啊」:卡头右边照 Outlook 上下两行 —— 上面是钮(来信的「回复」),下面是时刻。
 * 同日 Frank「这个算不算废话」:「发给 谁」那一行为空串时不出。
 * 同日 Frank「是不是像 outlook 一样 放到最下面呢?」:右上角那颗「回复」撤回会话最下面(见 InboxCompose),卡头右边只剩时刻。
 *
 * @author Frank
 * @time 2026-11-07 20:00:00
 */
import { Avatar } from '@/components/auth'
import { cssOf } from '@/components/css'
import { AVATAR_CARD, TEXT_NONE } from './constants'
import type { InboxMsgIn } from './types'
import css from './inbox.module.css'

/**
 * 一封信卡片。
 *
 * @param props 谁、头像名、发给谁、时刻与正文。
 * @returns 卡片。
 */
export function InboxMsg({ who, avatarName, toLine, at, text }: InboxMsgIn) {
  return (
    <div className={cssOf(css.ibMsg)}>
      <div className={cssOf(css.ibMsgHead)}>
        <Avatar name={avatarName} size={AVATAR_CARD} />
        <span className={cssOf(css.ibMsgWho)}>
          <b>{who}</b>
          {toLine !== TEXT_NONE && <span className={cssOf(css.ibMsgTo)}>{toLine}</span>}
        </span>
        <span className={cssOf(css.ibMsgAt)}>{at}</span>
      </div>
      <div className={cssOf(css.ibBody)}>{text}</div>
    </div>
  )
}
