'use client'
/**
 * 域内小件:一座楼(楼主 + 回复框 + 楼内回复 + 折叠开关)。官方置顶楼是蓝底卡;
 * 楼内回复 ≤3 条直接展开,更多的折成「展开 N 条回复」。
 * 2026-08-27 换装批自 News.tsx 的 CommentsSection 拆出成文件。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」:
 * 折叠开关换成 pager 桶 FoldLine(一楼一台 useFold,一次展开 20 条回复,展开着可收起),原「展开 N 条回复 / 收起回复」钮撤。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { FoldLine, useFold } from '@/components/pager'
import { K_REPLY_UNIT } from './constants'
import { CommentRow } from './commentrow'
import { replyHiddenOf, shownRepliesOf, threadClsOf } from './functions'
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
  onReply,
  replyBody,
  state,
  onReplyChange,
  onReplySubmit,
}: CommentThreadIn) {
  const hidden = replyHiddenOf(replies.length)
  const f = useFold({ hidden })
  const rows = []
  for (const r of shownRepliesOf({ replies, hidden, extra: f.extra })) {
    rows.push(<CommentRow key={r.id} cm={r} t={t} loggedIn={false} onReply={null} replying={false} />)
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
          <FoldLine t={t}
            unit={t(K_REPLY_UNIT)}
            hidden={hidden}
            extra={f.extra}
            busy={false}
            onMore={f.onMore}
            onFold={f.onFold} />
        </div>
      )}
    </div>
  )
}
