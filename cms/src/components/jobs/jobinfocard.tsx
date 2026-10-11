'use client'
/**
 * 职位页 / 职位框的「职位信息」分区卡(2026-10-11 批 4 全站卡片字段,照我的求职只读投递框「职位信息」卡的行形):
 * 地址(照 Indeed 一行,整行去 Google 地图 + 「市译名,省译名」灰字)、薪资(绿)、工时、雇佣期(英文黑字 + 界面语灰字)、
 * 发布日期、截止日期。公司另有公司信息卡,这里不重复;没值的行不出。
 * 日期两行原挂在职位名旁(JobDates,2026-10-02 起贴译名行右端),同批收进本卡,职位名旁那一处撤(一个事实一处)。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { cssOf } from '@/components/css'
import { HoursName, PlaceName, TermName } from '@/components/name'
import { Row } from '@/components/row'
import { TimeText } from '@/components/time'
import { makeT } from '@/lib/i18n'
import { placeLineOf } from '@/lib/location'
import { CARD_HEAD_CLS, CARD_MD_CLS, TEXT_NONE, TIME_TONE_NORMAL } from './constants'
import { useJobDates } from './hooks'
import type { JobInfoCardIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染「职位信息」卡。
 *
 * @param props 这一岗与界面语言。
 * @returns 一张分区卡。
 */
export function JobInfoCard({ job, lang }: JobInfoCardIn) {
  const t = makeT(lang)
  const dates = useJobDates({ job, t })
  const line = placeLineOf({ address: job.address, city: job.city, province: job.province })
  const dateRows = []
  for (const c of dates) {
    dateRows.push(
      <Row key={c.k} k={c.label}><TimeText iso={c.iso} tone={TIME_TONE_NORMAL} /></Row>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('detail.info')}</div>
      {line !== TEXT_NONE && (
        <Row k={t('col.address')}>
          <PlaceName line={line} cityZh={job.cityZh} cityKo={job.cityKo} province={job.province} />
        </Row>
      )}
      {job.salaryText !== TEXT_NONE && (
        <Row k={t('col.salary')}><span className={cssOf(css.money)}>{job.salaryText}</span></Row>
      )}
      {job.employmentHours !== TEXT_NONE && <Row k={t('col.empHours')}><HoursName v={job.employmentHours} /></Row>}
      {job.employmentTerm !== TEXT_NONE && <Row k={t('col.empTerm')}><TermName v={job.employmentTerm} /></Row>}
      {dateRows}
    </div>
  )
}
