'use client'
/**
 * 雇主板的一张手机卡(全站唯一卡片件 JobCard 的一次装配)。
 * 手机触控靶:卡内标题链只有 23px 高 —— 整张卡都可点(卡本身 ≥70px),点在标题上时
 * 交给 `<a>` 自己走,不重复导航。
 * 2026-09-13 雇主板批二:卡上四样 —— 名(落公司页)、行业注、所在地、在招话术;胶囊两枚:
 * 星级与「指定雇主」(非指定不出)。
 * 2026-08-27 换装批自 Employers.tsx 的 JobCard 装配段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { JobCard } from '@/components/card'
import { TEXT_NONE } from './constants'
import type { EmployerCardIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板的一张手机卡。
 *
 * @param props 这一行的展示行(卡上要的每一项都已经在洗行时算好)。
 * @returns 一张职位卡形态的雇主卡。
 */
export function EmployerCard({ r }: EmployerCardIn) {
  const title = { text: r.name, href: r.href, title: r.hrefTitle, onClick: r.onView }
  const chips = (
    <>
      <span className={css.star} title={r.starTitle}>{r.starText}</span>
      {r.designatedText !== TEXT_NONE && <span className={css.progChip}>{r.designatedText}</span>}
    </>
  )
  if (r.industry === TEXT_NONE) {
    return (
      <JobCard href={r.href}
        onCardClick={r.onCard}
        title={title}
        location={r.where}
        salary={r.cardSalary}
        chips={chips} />
    )
  }
  return (
    <JobCard href={r.href}
      onCardClick={r.onCard}
      title={title}
      note={r.industry}
      location={r.where}
      salary={r.cardSalary}
      chips={chips} />
  )
}
