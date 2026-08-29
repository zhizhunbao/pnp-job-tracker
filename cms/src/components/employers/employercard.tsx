'use client'
/**
 * 雇主板的一张手机卡(全站唯一卡片件 JobCard 的一次装配)。
 * 手机触控靶:卡内标题链只有 23px 高 —— 整张卡都可点(卡本身 ≥70px),点在标题上时
 * 交给 `<a>` 自己走,不重复导航。
 * 名录口径与在招口径的差别只在「有没有职业说明」这一处,所以按它分两支返回:
 * 名录出职业说明与制度胶囊,在招出岗数 —— JobCard 的职业说明槽只认字符串,
 * 传空串会渲出一条空行,只能靠不传把它整条摘掉。
 * 2026-08-27 换装批自 Employers.tsx 的 JobCard 装配段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { JobCard } from '@/components/card'
import { TEXT_NONE } from './constants'
import { makeCardClick } from './functions'
import type { EmployerCardIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板的一张手机卡。
 *
 * @param props 这一行的展示行(卡上要的每一项都已经在洗行时算好)。
 * @returns 一张职位卡形态的雇主卡。
 */
export function EmployerCard({ r }: EmployerCardIn) {
  const title = { text: r.name, href: r.href, title: r.hrefTitle }
  const onCardClick = makeCardClick({ href: r.href })
  let salary = null
  if (r.cardSalary !== TEXT_NONE) {
    salary = r.cardSalary
  }
  let chips = null
  if (r.programChip !== TEXT_NONE) {
    chips = <span className={css.progChip}>{r.programChip}</span>
  }
  if (r.cardNote === TEXT_NONE) {
    return (
      <JobCard href={r.href}
        onCardClick={onCardClick}
        title={title}
        location={r.where}
        salary={salary}
        chips={chips} />
    )
  }
  return (
    <JobCard href={r.href}
      onCardClick={onCardClick}
      title={title}
      note={r.cardNote}
      location={r.where}
      salary={salary}
      chips={chips} />
  )
}
