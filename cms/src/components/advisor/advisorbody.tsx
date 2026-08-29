'use client'
/**
 * 顾问弹框正文的分组分叉:分类组走专用三卡面板(Frank 2026-07-21:三卡 + 中文对照 + AI 速读);
 * 公司组走专用平级卡面板(同日「参考类别重新设计」);地点组走专用五卡面板(E8-12);
 * 其余组照旧铺全组事实。
 * ⚠️ 公司面板点的是 components/companies 的**桶** —— 那一域反过来只点本桶的
 * jdadvisorsection 一个文件,不成环;jobs 那几条则必须点文件(职位板反过来要本桶两个弹框)。
 * 2026-08-28 换装批自 Advisor.tsx 的 AdvisorModal 正文分叉提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { CompanyPanel } from '@/components/companies'
import { GROUP_CATEGORY, GROUP_COMPANY, GROUP_LOCATION } from './constants'
import { CategoryPanel } from './categorypanel'
import { GroupFacts } from './groupfacts'
import { LocationPanel } from './locationpanel'
import type { AdvisorGroupBodyIn } from './types'

/**
 * 渲染弹框正文。
 *
 * @param props 分组、入口格、分层态、在榜岗、点岗回调与取数包。
 * @returns 这一组的正文。
 */
export function AdvisorBody({ group, field, plan, companyJobs, onOpenJob, f }: AdvisorGroupBodyIn) {
  if (group === GROUP_CATEGORY) {
    return <CategoryPanel job={f.job} lang={f.lang} plan={plan} nocDesc={f.nocDesc} srcField={field} />
  }
  if (group === GROUP_LOCATION) {
    return (
      <LocationPanel job={f.job} lang={f.lang} plan={plan} srcField={field}
        pnpDraws={f.pnpDraws} news={f.news} desigEmp={f.desigEmp} />
    )
  }
  if (group === GROUP_COMPANY) {
    return <CompanyPanel job={f.job} jobs={companyJobs} lang={f.lang} plan={plan} onOpenJob={onOpenJob} />
  }
  return <GroupFacts group={group} f={f} />
}
