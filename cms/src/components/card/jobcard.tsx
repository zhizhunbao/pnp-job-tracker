'use client'
/**
 * card 域的职位卡(手机形态)—— **全站唯一一套**,2026-08-02 Frank
 * 「卡片也用 jobtable 的卡片」「以后这个定死」。形态来自职位板窄屏卡,
 * 由职位板与 landing 职位榜共用:左列 = 身份(公司、地点),右列 = 数字(薪资、时间),
 * 右对齐后在卡片流里连成一条竖线,手指下滑只走右边就能比(#148 拍板)。
 * 组件只管版式不管数据与交互:可点的一律由调用方给 href/onClick,
 * 胶囊排/右上钮/页脚都是插槽。
 * 2026-08-24 自 ui/Card.tsx 拆出(内嵌 Row/TextButton 提成域内小件,展开与 ?? 清零)。
 * 2026-10-09 N6 批(Frank「职位名、公司名、地点同形」):标题位加 head 插槽 —— 名字两行(英文在上、译名灰字在下)由调用方
 * 用 name 桶渲染好放进来,卡只给字号与位置;原 title 文字链照旧可用,两者二选一。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { cssOf } from '@/components/css'
import { JobCardRow } from './jobcardrow'
import { TextButton } from './textbutton'
import type { CardLink, JobCardIn } from './types'
import css from './card.module.css'

/**
 * 职位卡。
 *
 * @param props 各插槽(见 JobCardIn 逐格注释)。
 * @returns 职位卡。
 */
export function JobCard({
  href,
  onCardClick,
  title,
  head,
  note,
  company,
  companyBadge,
  salary,
  location,
  date,
  chips,
  action,
  footer,
}: JobCardIn) {
  let titleLink: CardLink | null = null
  if (title != null) {
    titleLink = title
  }
  if (title != null && title.href == null && href != null) {
    titleLink = {
      text: title.text,
      href,
      onClick: title.onClick,
      title: title.title,
      target: title.target,
    }
  }

  let companyCell = null
  if (company != null || companyBadge != null) {
    companyCell = (
      <>
        {company != null && <TextButton v={company} className={cssOf(css.co)} />}
        {companyBadge}
      </>
    )
  }
  let salaryCell = null
  if (salary != null) {
    salaryCell = <span className={css.pay}>{salary}</span>
  }
  let locationCell = null
  if (location != null) {
    locationCell = <span className={css.loc}>{location}</span>
  }
  let dateCell = null
  if (date != null) {
    dateCell = <span className={css.date}>{date}</span>
  }

  return (
    <div data-tap-card onClick={onCardClick} className={css.jcard}>
      <div className={css.top}>
        {head != null && <span className={css.title}>{head}</span>}
        {titleLink != null && <TextButton v={titleLink} className={cssOf(css.title)} />}
        {action != null && <span className={css.actSlot}>{action}</span>}
      </div>
      {note != null && <div className={css.note}>{note}</div>}
      <JobCardRow left={companyCell} right={salaryCell} />
      <JobCardRow left={locationCell} right={dateCell} />
      {chips != null && <div className={css.chips}>{chips}</div>}
      {footer != null && <div className={css.foot}>{footer}</div>}
    </div>
  )
}
