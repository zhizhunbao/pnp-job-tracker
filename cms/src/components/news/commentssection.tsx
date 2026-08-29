'use client'
/**
 * 域内小件:评论区整块(v3 ④ → F 件 v2,E8-07 2026-07-20)—— 登录可评 → 人工审核
 * (approved)后显示;未登录 = 引导登录。
 * #95 暂藏后亮回(Frank「新闻资讯板块完全参考」内容站评论形态,拍板 = 开;日审归 Frank):
 * v2 形态 = 计数头 + 官方置顶楼(admin 号发 + pinned,蓝底卡)+ 楼中楼一层
 * (「展开 N 条回复」折叠,≤3 直接展开)。不学匿名直发(信任边界):登录 + pending
 * 审核制原样;脱敏昵称快照照旧。
 * 楼序:顶层 = 置顶先、再时间倒序;楼内回复 = 时间正序(SSR 给的就是 ASC,分组即得)。
 * 2026-08-27 换装批自 News.tsx 提出成文件,表单状态收进 hooks 的 useComments。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { ANCHOR_COMMENTS, URL_LOGIN } from './constants'
import { CommentForm } from './commentform'
import { CommentThread } from './commentthread'
import { isThreadOpen, repliesAtOf, repliesOf, topCommentsOf } from './functions'
import { useComments } from './hooks'
import type { CommentsSectionIn } from './types'
import css from './news.module.css'

/**
 * 渲染评论区。
 *
 * @param props 取词函数、slug、过审评论与登录态。
 * @returns 计数头 + 表单(或去登录的引导)+ 楼。
 */
export function CommentsSection({ t, slug, comments, loggedIn }: CommentsSectionIn) {
  const panel = useComments({ slug })
  const table = repliesOf({ comments })
  const threads = []
  for (const top of topCommentsOf({ comments })) {
    const rs = repliesAtOf({ table, id: top.id })
    threads.push(
      <CommentThread key={top.id}
        t={t}
        top={top}
        replies={rs}
        loggedIn={loggedIn}
        replying={panel.replyTo === top.id}
        open={isThreadOpen({ count: rs.length, id: top.id, expanded: panel.expanded })}
        onReply={panel.replyToggleOf(top.id)}
        onToggle={panel.expandToggleOf(top.id)}
        replyBody={panel.replyBody}
        state={panel.state}
        onReplyChange={panel.onReplyChange}
        onReplySubmit={panel.onReplySubmit} />,
    )
  }
  return (
    <section id={ANCHOR_COMMENTS} className={css.cmtSec}>
      <h3 className={css.cmtTitle}>{t('news.cmt.title', { n: comments.length })}</h3>
      {loggedIn && (
        <CommentForm t={t}
          body={panel.body}
          state={panel.state}
          onChange={panel.onChange}
          onSubmit={panel.onSubmit} />
      )}
      {loggedIn === false && (
        <LinkButton className={cssOf(css.loginLink)} href={URL_LOGIN}>{t('news.cmt.login')}</LinkButton>
      )}
      {threads}
    </section>
  )
}
