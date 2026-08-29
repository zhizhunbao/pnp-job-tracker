'use client'
/**
 * 卡片内职位列表的**唯一行形态**(2026-08-11 抽出):左 = 岗名蓝链 + 灰字小注,
 * 右 = 薪资 + 城市。原本只长在公司弹框「在招职位」里;职位详情页下架岗的「相似职位」
 * 要同一副皮,于是抽成组件两处共用 —— 照 JobBody「一骨架两处」先例,样式逐像素照搬。
 * #200(Frank「技能岗显示有什么意义」):裸通道档标签撤(无表头没上下文);
 * 通道信号在主表「通道」列与职位弹框里。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(消费方 jobs/Job.tsx 只改 import 行)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CompanyLink } from './companylink'
import { CLS_SEP, LINK_CLS, PLAIN_BTN_KIND, TEXT_NONE, URL_JOB_HEAD } from './constants'
import type { JobMiniRowIn } from './types'
import css from './companies.module.css'

/**
 * 一行迷你职位。
 *
 * @param props 岗位号、岗名与右侧两格(逐格注释见 JobMiniRowIn)。
 * @returns 一行。
 */
export function JobMiniRow({
  id,
  title,
  sub = TEXT_NONE,
  salaryText = TEXT_NONE,
  city = TEXT_NONE,
  onOpen = null,
  newTab = false,
}: JobMiniRowIn) {
  let head = (
    <CompanyLink href={URL_JOB_HEAD + String(id)}
      newTab={newTab}
      className={cssOf(css.jobLink) + CLS_SEP + LINK_CLS}>
      {title}
    </CompanyLink>
  )
  if (onOpen != null) {
    head = <Button kind={PLAIN_BTN_KIND} onClick={onOpen} className={cssOf(css.jobBtn)}>{title}</Button>
  }
  return (
    <div className={css.jobRow}>
      <span className={css.jobL}>
        {head}
        {sub !== TEXT_NONE && <div className={css.jobSub}>{sub}</div>}
      </span>
      <span className={css.jobR}>
        {salaryText !== TEXT_NONE && <div className={css.jobPay}>{salaryText}</div>}
        <div className={css.jobCity}>{city !== TEXT_NONE && <span>{city}</span>}</div>
      </span>
    </div>
  )
}
