'use client'
/**
 * 域内小件:一条评论(头像 + 昵称/标/日期 + 正文 + 回复钮)。
 * 脱敏昵称快照照旧(信任边界:不学匿名直发,登录 + pending 审核制原样)。
 * 2026-08-27 换装批自 News.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { authorClsOf, avatarClsOf, initialOf, pinnedTagClsOf, replyBtnClsOf } from './functions'
import type { CommentRowIn } from './types'
import css from './news.module.css'

/**
 * 渲染一条评论。
 *
 * @param props 这条评论、取词函数、登录态与回复钮的两格(逐格注释见 CommentRowIn)。
 * @returns 一条评论。
 */
export function CommentRow({ cm, t, loggedIn, onReply, replying }: CommentRowIn) {
  return (
    <div className={css.cmt}>
      <span className={avatarClsOf({ official: cm.official })}>{initialOf({ name: cm.authorName })}</span>
      <div className={css.cmtMain}>
        <div className={css.cmtHead}>
          <span className={authorClsOf({ official: cm.official })}>{cm.authorName}</span>
          {cm.official && <span className={css.cmtTag}>{t('news.cmt.official')}</span>}
          {cm.pinned && <span className={pinnedTagClsOf()}>{t('news.cmt.pinnedTag')}</span>}
          <span className={css.cmtDate}>{cm.date}</span>
        </div>
        <div className={css.cmtText}>{cm.body}</div>
        {loggedIn && onReply != null && (
          <Button kind={PLAIN_BTN_KIND} className={replyBtnClsOf({ on: replying })} onClick={onReply}>
            {t('news.cmt.reply')}
          </Button>
        )}
      </div>
    </div>
  )
}
