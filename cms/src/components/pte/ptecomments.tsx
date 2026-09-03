'use client'
/**
 * 域内小件:题下留言卡 —— 头行「留言 N | 写评论」,过审留言逐条列,点「写评论」才展开表单
 * (复用新闻评论那套:登录 → pending → 过审显示;未登录「写评论」原地弹登录框)。
 * 「考过」钮 2026-09-04 挪到题卡头(Frank「就考过就完事了」),本卡不再列考试记录。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { KIND_SECONDARY } from './constants'
import { PteNoteForm } from './ptenoteform'
import type { PteCommentsViewIn } from './types'
import css from './pte.module.css'

/**
 * 渲染留言卡。
 *
 * @param props 取词函数、评论面板与登录态。
 * @returns 一张卡。
 */
export function PteComments({ t, c, loggedIn }: PteCommentsViewIn) {
  const noteRows = []
  for (const n of c.notes) {
    noteRows.push(
      <div key={n.id} className={css.note}>
        <div className={css.noteHead}>{n.authorName}<span className={css.noteDate}>{n.date}</span></div>
        <div className={css.noteBody}>{n.body}</div>
      </div>,
    )
  }
  return (
    <div className={css.card}>
      <div className={css.secHead}>
        <div className={css.secTitle}>{t('pte.c.notes')}<span className={css.secN}>{c.notes.length}</span></div>
        {loggedIn && <Button kind={KIND_SECONDARY} sm onClick={c.onNoteOpen}>{t('pte.c.write')}</Button>}
        {loggedIn === false && <Button kind={KIND_SECONDARY} sm onClick={c.onLoginOpen}>{t('pte.c.write')}</Button>}
      </div>
      {c.noteOpen && loggedIn && <PteNoteForm t={t} c={c} />}
      {noteRows}
      {c.notes.length === 0 && <div className={css.emptyLine}>{t('pte.c.empty')}</div>}
    </div>
  )
}
