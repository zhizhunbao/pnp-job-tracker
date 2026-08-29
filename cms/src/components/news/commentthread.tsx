'use client'
/**
 * 域内小件:一座楼(楼主 + 回复框 + 楼内回复 + 折叠开关)。官方置顶楼是蓝底卡;
 * 楼内回复 ≤3 条直接展开,更多的折成「展开 N 条回复」。
 * 2026-08-27 换装批自 News.tsx 的 CommentsSection 拆出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND, REPLIES_OPEN_MAX } from './constants'
import { CommentRow } from './commentrow'
import { expandLabelOf, threadClsOf } from './functions'
import { ReplyBox } from './replybox'
import type { CommentThreadIn } from './types'
import css from './news.module.css'

/**
 * 渲染一座楼。
 *
 * @param props 楼主、楼内回复与回复框的状态手柄(逐格注释见 CommentThreadIn)。
 * @returns 一座楼。
 */
export function CommentThread({
  t,
  top,
  replies,
  loggedIn,
  replying,
  open,
  onReply,
  onToggle,
  replyBody,
  state,
  onReplyChange,
  onReplySubmit,
}: CommentThreadIn) {
  const rows = []
  if (open) {
    for (const r of replies) {
      rows.push(<CommentRow key={r.id} cm={r} t={t} loggedIn={false} onReply={null} replying={false} />)
    }
  }
  return (
    <div className={threadClsOf({ pinned: top.pinned })}>
      <CommentRow cm={top} t={t} loggedIn={loggedIn} onReply={onReply} replying={replying} />
      {replying && (
        <ReplyBox t={t} body={replyBody} state={state} onChange={onReplyChange} onSubmit={onReplySubmit} />
      )}
      {replies.length > 0 && (
        <div className={css.replies}>
          {rows}
          {replies.length > REPLIES_OPEN_MAX && (
            <Button kind={PLAIN_BTN_KIND} className={css.expand} onClick={onToggle}>
              {expandLabelOf({ t, open, count: replies.length })}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
