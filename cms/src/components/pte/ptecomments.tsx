'use client'
/**
 * 域内小件:题下评论区两栏 —— 考试记录(一行「日期 城市」+「我考到了」钮,免审当场入栏)与
 * 留言(复用新闻评论那套:登录 → pending → 过审显示)。未登录两栏都只给「登录后可发」。
 * 设计判据见设计稿「题下评论区」(三家收敛;不做点赞 / 分类 / 匿名 / 录音榜)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CLS_SEP, KIND_PRIMARY, URL_LOGIN } from './constants'
import { usePteComments } from './hooks'
import { PteExamForm } from './pteexamform'
import { PteNoteForm } from './ptenoteform'
import type { PteCommentsViewIn } from './types'
import css from './pte.module.css'

/**
 * 渲染题下评论区。
 *
 * @param props 取词函数、题键、评论与登录态。
 * @returns 一张卡两栏。
 */
export function PteComments({ t, qid, comments, loggedIn }: PteCommentsViewIn) {
  const c = usePteComments({ qid, comments })
  const examRows = []
  let i = 0
  for (const e of c.exams) {
    examRows.push(
      <div key={i} className={css.examRow}>
        <span>{e.examDate}</span>
        <span className={css.examCity}>{e.examCity}</span>
      </div>,
    )
    i = i + 1
  }
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
        <div className={css.secTitle}>{t('pte.c.exam')}<span className={css.secN}>{c.exams.length}</span></div>
        {loggedIn && <Button kind={KIND_PRIMARY} onClick={c.onExamToggle}>{t('pte.c.iSat')}</Button>}
        {loggedIn === false && <LinkButton href={URL_LOGIN}>{t('pte.c.login')}</LinkButton>}
      </div>
      {c.examOpen && <PteExamForm t={t} c={c} />}
      {examRows}
      {c.exams.length === 0 && <div className={css.emptyLine}>{t('pte.none')}</div>}
      <div className={css.factNote}>{t('pte.disclaimer')}</div>
      <div className={cssOf(css.secHead) + CLS_SEP + cssOf(css.secGap)}>
        <div className={css.secTitle}>{t('pte.c.notes')}<span className={css.secN}>{c.notes.length}</span></div>
      </div>
      {noteRows}
      {c.notes.length === 0 && <div className={css.emptyLine}>{t('pte.c.empty')}</div>}
      {loggedIn && <PteNoteForm t={t} c={c} />}
    </div>
  )
}
