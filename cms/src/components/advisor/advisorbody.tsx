'use client'
/**
 * 顾问弹框正文的分组分叉:分类组走专用三卡面板(Frank 2026-07-21:三卡 + 中文对照 + AI 速读);
 * 公司组走专用平级卡面板(同日「参考类别重新设计」);地点组走专用五卡面板(E8-12);
 * 其余组照旧铺全组事实。
 * ⚠️ 公司面板点的是 components/companies 的**桶** —— 那一域反过来只点本桶的
 * jdadvisorsection 一个文件,不成环;jobs 那几条则必须点文件(职位板反过来要本桶两个弹框)。
 * 2026-08-28 换装批自 Advisor.tsx 的 AdvisorModal 正文分叉提出成件。
 * 2026-09-28 Frank「地点弹框 删了吧」:地点组(五卡两列的 LocationPanel)整支删 —— 09-14 起省 / 市 / 区三格就不再开它了。
 * 2026-10-09 N6 批:其余组的事实件不再收点公司的去处(AIP 名单招牌换 name 桶 CompanyName 自开),onOpenCompany 只递公司面板。
 * 2026-10-09 N6b 批:公司面板里的名字也由 name 桶自开,onOpenJob / onOpenCompany 与同公司在榜岗(companyJobs)三格撤。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { CompanyPanel } from '@/components/companies'
import { GROUP_CATEGORY, GROUP_COMPANY, TEXT_NONE } from './constants'
import { CategoryPanel } from './categorypanel'
import { GroupFacts } from './groupfacts'
import type { AdvisorGroupBodyIn } from './types'

/**
 * 渲染弹框正文。
 *
 * @param props 分组、入口格、公司面板两个回传口、重译代数与取数包(2026-09-14 AI 速读退役,分层态不再下传)。
 * @returns 这一组的正文。
 */
export function AdvisorBody({
  group, field, onCompanyAlias, onCompanyTransBusy, gen, f,
}: AdvisorGroupBodyIn) {
  if (group === GROUP_CATEGORY) {
    return <CategoryPanel job={f.job} lang={f.lang} nocDesc={f.nocDesc} srcField={field} />
  }
  if (group === GROUP_COMPANY) {
    return (
      <CompanyPanel key={gen} job={f.job} slug={TEXT_NONE} lang={f.lang}
        onAlias={onCompanyAlias} showTrans={f.showZh} onTransBusy={onCompanyTransBusy} />
    )
  }
  return <GroupFacts group={group} f={f} />
}
