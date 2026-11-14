'use client'
/**
 * 对话里的一条气泡:访客说的靠右,助手说的靠左;助手的回复下面把站内链接排成一行行(页名取词条,当前标签页打开)。
 * 不谈移民、答不了两类没有正文,出各自固定的一句话(字由 functions 的 sayOf 取)。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { ROLE_USER } from './constants'
import { bubbleClsOf, sayOf } from './functions'
import type { AssistantBubbleIn } from './types'
import css from './assistant.module.css'

/**
 * 一条气泡。
 *
 * @param props 这一条与取词函数。
 * @returns 气泡。
 */
export function AssistantBubble({ msg, t }: AssistantBubbleIn) {
  const links = []
  for (const l of msg.links) {
    links.push(<LinkButton key={l.url} href={l.url} className={cssOf(css.link)}>{t(l.labelKey)}</LinkButton>)
  }
  return (
    <div className={bubbleClsOf(msg.role)}>
      {msg.role === ROLE_USER && <span className={cssOf(css.sr)}>{t('asst.you')}</span>}
      {msg.role !== ROLE_USER && <span className={cssOf(css.sr)}>{t('asst.title')}</span>}
      <p className={cssOf(css.say)}>{sayOf({ msg, t })}</p>
      {links.length > 0 && <div className={cssOf(css.links)}>{links}</div>}
    </div>
  )
}
