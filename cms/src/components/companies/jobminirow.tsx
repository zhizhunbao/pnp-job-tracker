'use client'
/**
 * 卡片内职位列表的**唯一行形态**(2026-08-11 抽出):左 = 岗名蓝链 + 灰字小注,
 * 右 = 薪资 + 城市。原本只长在公司弹框「在招职位」里;职位详情页下架岗的「相似职位」
 * 要同一副皮,于是抽成组件两处共用 —— 照 JobBody「一骨架两处」先例,样式逐像素照搬。
 * #200(Frank「技能岗显示有什么意义」):裸通道档标签撤(无表头没上下文);
 * 通道信号在主表「通道」列与职位弹框里。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(消费方 jobs/Job.tsx 只改 import 行)。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:岗名一律是真链接(原先弹框内能开 JD 的行换成钮、丢了 href);
 * 给了 onOpenJob 就拦普通左键叠开职位描述弹框,整行没载入的点了现取。
 * 2026-09-22 Frank「即使没显示出来薪资,也要占位吧。地点怎么跑上去了」:右侧薪资行一律渲(没薪资渲不折行空格占住行高),
 * 城市恒在第二行,各行对齐。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CompanyLink } from './companylink'
import { CLS_SEP, LINK_CLS, TEXT_NONE, URL_JOB_HEAD } from './constants'
import { makeOpenJob, payShownOf } from './functions'
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
  onOpenJob,
  row = null,
  newTab = false,
}: JobMiniRowIn) {
  let head = (
    <CompanyLink href={URL_JOB_HEAD + String(id)}
      newTab={newTab}
      className={cssOf(css.jobLink) + CLS_SEP + LINK_CLS}>
      {title}
    </CompanyLink>
  )
  if (onOpenJob != null) {
    head = (
      <CompanyLink href={URL_JOB_HEAD + String(id)}
        newTab={newTab}
        onClick={makeOpenJob({ id, row, onOpenJob })}
        className={cssOf(css.jobLink) + CLS_SEP + LINK_CLS}>
        {title}
      </CompanyLink>
    )
  }
  return (
    <div className={css.jobRow}>
      <span className={css.jobL}>
        {head}
        {sub !== TEXT_NONE && <div className={css.jobSub}>{sub}</div>}
      </span>
      <span className={css.jobR}>
        <div className={css.jobPay}>{payShownOf(salaryText)}</div>
        <div className={css.jobCity}>{city !== TEXT_NONE && <span>{city}</span>}</div>
      </span>
    </div>
  )
}
