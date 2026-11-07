'use client'
/**
 * me 桶子桶 apps 的只读投递框「职位信息」卡(2026-10-10 批 3):职位(点了叠开职位框)/ 公司(点了叠开公司框)/ 地址(去 Google 地图)/
 * 薪资(绿字)/ 工时 / 雇佣期 / 发布日期 / 截止日期,一行一项(row 桶 Row);格子口径同我的投递清单。
 * 2026-11-07 自 myjobs 桶 appview 的第一张卡拆出、在新域重写(清单的单元格住兄弟子桶 jobs,不跨桶借,这里直接摆 name 桶的件)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { CompanyName, JobName, Name } from '@/components/name'
import { Row } from '@/components/row'
import { CARD_HEAD_CLS, CARD_MD_CLS, TEXT_NONE } from './constants'
import type { AvJobCardIn } from './types'
import css from './apps.module.css'

/**
 * 「职位信息」卡。
 *
 * @param props 卡的洗净形与取词函数。
 * @returns 白卡。
 */
export function AvJobCard({ j, t }: AvJobCardIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('av.job')}</div>
      <Row k={t('mj.col.title')}>
        {j.jobId != null && <JobName id={j.jobId} title={j.title} sub={j.titleSub} />}
        {j.jobId == null && <Name en={j.title} sub={j.titleSub} />}
      </Row>
      <Row k={t('mj.col.company')}>
        <CompanyName name={j.company} slug={j.companySlug} zh={j.companyZh} ko={j.companyKo} />
      </Row>
      <Row k={t('mj.col.addr')}>
        {j.addressHref !== TEXT_NONE && <Name en={j.address} sub={j.addressSub} href={j.addressHref} />}
      </Row>
      {j.salary !== TEXT_NONE && <Row k={t('mj.col.pay')}><span className={cssOf(css.pay)}>{j.salary}</span></Row>}
      <Row k={t('mj.col.hours')}>{j.hoursEn !== TEXT_NONE && <Name en={j.hoursEn} sub={TEXT_NONE} />}</Row>
      <Row k={t('mj.col.term')}>{j.termEn !== TEXT_NONE && <Name en={j.termEn} sub={TEXT_NONE} />}</Row>
      <Row k={t('mj.col.posted')}>{j.posted}</Row>
      <Row k={t('mj.col.deadline')}>{j.deadline}</Row>
    </div>
  )
}
