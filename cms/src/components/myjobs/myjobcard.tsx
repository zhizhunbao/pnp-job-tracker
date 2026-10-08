'use client'
/**
 * 两张表的手机卡(全站职位卡 card/JobCard 的形,照定稿手机图):职位名链到职位页、公司、薪资、城市、日期,
 * 状态挂在胶囊排;我的收藏右上角是「取消收藏」;公司名可点(开公司弹框,同表格)。整卡不挂去处 —— 右上角的钮要能点,点它不许跳页。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
import { Button, LinkButton } from '@/components/button'
import { JobCard } from '@/components/card'
import { ACT_KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import { slotOf } from './functions'
import type { CardCompany, CardTitle, MyJobCardIn } from './types'
import css from './myjobs.module.css'

/**
 * 渲染一张卡。
 *
 * @param props 这一行的展示行。
 * @returns 职位卡。
 */
export function MyJobCard({ r }: MyJobCardIn) {
  let title: CardTitle = { text: r.title }
  if (r.href !== TEXT_NONE) {
    title = { text: r.title, href: r.href, onClick: r.onTitle }
  }
  let chips = null
  if (r.statusText !== TEXT_NONE || r.closedText !== TEXT_NONE) {
    chips = (
      <>
        {r.statusText !== TEXT_NONE && <span className={css.chip}>{r.statusText}</span>}
        {r.closedText !== TEXT_NONE && <span className={css.closed}>{r.closedText}</span>}
      </>
    )
  }
  let action = null
  if (r.onUnsave != null) {
    action = <Button kind={ACT_KIND} className={css.act} onClick={r.onUnsave}>{r.unsaveText}</Button>
  }
  let footer = null
  if (r.resumeHref !== TEXT_NONE) {
    footer = (
      <div className={css.files}>
        <LinkButton href={r.resumeHref} target={TARGET_BLANK}>{r.resumeText}</LinkButton>
        <LinkButton href={r.coverHref} target={TARGET_BLANK}>{r.coverText}</LinkButton>
      </div>
    )
  }
  let company: CardCompany = { text: r.company }
  if (r.onCompany != null) {
    company = { text: r.company, onClick: r.onCompany }
  }
  return (
    <JobCard title={title}
      company={company}
      salary={slotOf(r.salary)}
      location={slotOf(r.cityName)}
      date={slotOf(r.date)}
      chips={chips}
      action={action}
      footer={footer} />
  )
}
