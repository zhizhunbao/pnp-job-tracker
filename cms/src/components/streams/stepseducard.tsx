'use client'
/**
 * 域内小件:「申请步骤」页的教育经历分区卡 —— 一段一行(院校所在地 / 公立或私立 / 课程时长三只下拉并排,行尾 ✕),
 * 至多两段,不满两段时卡底「+ 再加一段」;填过东西卡头右侧出「清空」。
 * 2026-10-11 申请步骤分区筛选批 1(Frank「学历 改成 教育经历。最近两年 和 两个 最重要」「这两个看着复杂」「这个好像不太重要」:
 * 一段一行不带小标题、专业不问)。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */
import { Button } from '@/components/button'
import { BTN_GHOST, CARD_MD_CLS, EDU_ROWS_MAX, K_ADD_ROW, K_CLEAR, K_EDU_HEAD, TEXT_NONE } from './constants'
import { EduLine } from './eduline'
import type { StepsCardIn } from './types'
import css from './streams.module.css'

/**
 * 渲染教育经历卡。
 *
 * @param props 整机面板。
 * @returns 分区卡。
 */
export function StepsEduCard({ p }: StepsCardIn) {
  const lines = []
  let filled = false
  for (const [i, row] of p.s.edu.entries()) {
    if (row.prov !== TEXT_NONE || row.kind !== TEXT_NONE || row.len !== TEXT_NONE) {
      filled = true
    }
    lines.push(<EduLine key={i} p={p} i={i} row={row} />)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={css.cardHeadRow}>
        <span className={css.cardHeadText}>{p.t(K_EDU_HEAD)}</span>
        {filled && (
          <Button kind={BTN_GHOST} className={css.clearBtn} onClick={p.clearEdu}>{p.t(K_CLEAR)}</Button>
        )}
      </div>
      <div className={css.eduLines}>{lines}</div>
      {p.s.edu.length < EDU_ROWS_MAX && (
        <Button kind={BTN_GHOST} className={css.linkBtn} onClick={p.addEdu}>{p.t(K_ADD_ROW)}</Button>
      )}
    </div>
  )
}
