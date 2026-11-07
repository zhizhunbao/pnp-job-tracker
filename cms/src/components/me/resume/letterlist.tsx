'use client'
/**
 * me 桶子桶 resume 的结构:「求职信」页签的内容(2026-10-08 照 AIApply 的 My Cover Letters 立,数据 = 投递表里有信的行;
 * 11-07 卡片网格换成通用表格 职位 / 公司 / 状态 / 写于,手机一条条)。点职位名 = 原卡片的「继续」(草稿去投递框)
 * 或「打开」(发出去的信的 PDF)。没回来先占位,一封没有出一句。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Table } from '@/components/table'
import { letterColsOf, letterKeyOf } from './functions'
import { LetterItem } from './letteritem'
import type { ResumePartIn } from './types'
import css from './resume.module.css'

/**
 * 「求职信」页签的内容。
 *
 * @param props 「我的简历」整机面板与取词。
 * @returns 占位、空态一句、表或一条条。
 */
export function LetterList({ r, t }: ResumePartIn) {
  if (r.lettersChecked === false) {
    return <div className={cssOf(css.skel)} />
  }
  if (r.lettersFailed) {
    return <div className={cssOf(css.note)}>{t('mj.fail')}</div>
  }
  if (r.letters.length === 0) {
    return <div className={cssOf(css.note)}>{t('rl.empty')}</div>
  }
  if (r.narrow === false) {
    return <Table cols={letterColsOf(t)} rows={r.letterRows} rowKey={letterKeyOf} bare />
  }
  const rows = []
  for (const row of r.letterRows) {
    rows.push(<LetterItem key={row.key} row={row} />)
  }
  return <div>{rows}</div>
}
