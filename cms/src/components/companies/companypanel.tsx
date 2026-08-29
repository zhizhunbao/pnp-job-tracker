'use client'
/**
 * 公司弹框(E8-11 B1 重写):三钮壳(#185 对照/AI 速读/完整页)+ /api/jobs/company
 * 同源取数 + CompanyBody 同源骨架。job 行字段拼凑与 scoredetail/companyinfo 双 fetch
 * 退役;数据与 /companies/[slug] 页面完全同一份(免额度)。
 * AI 速读(点了才出,置顶;coRead = 公司级接地速读,不联网不凭名字编)是弹框壳独有,
 * 页面不带;B1 雇主线卡只渲职业链接(凭证/在招职位上面的卡已有,再出 = 重复)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(取数与两个开关迁 hooks 的 useCompanyPanel)。
 *
 * AI 速读段 2026-08-28 随 Frank 拍板改指 components/advisor:公司速读与 JD 速读是同一台机器
 * (同一道额度闸、同一套壳),而它答的是顾问的问题,所以那一件搬进了顾问域。
 * 仍然点**文件**不走 advisor 桶:桶里的完整弹框反过来要本桶的 CompanyPanel,走桶就成环。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { SponsorLeadCard } from '@/components/pnp'
import { TvEntryCard } from '@/components/verdict'
import { JdAdvisorSection } from '@/components/advisor/jdadvisorsection'
import { makeT } from '@/lib/i18n'
import { CompanyBody } from './companybody'
import { CompanyPanelActs } from './companypanelacts'
import { AI_FIELD_CO_READ, CARD_MD_CLS, CLS_SEP, LEAD_SRC_COMPANY, TEXT_NONE } from './constants'
import { canTransOf, makeResolveJob, makeTvOpen, panelSlugOf } from './functions'
import { useCompanyPanel } from './hooks'
import type { CompanyPanelIn } from './types'
import css from './companies.module.css'

/**
 * 公司弹框。
 *
 * @param props 当前职位、已载入职位、语言、付费态与点职位回调(逐格注释见 CompanyPanelIn)。
 * @returns 钮条 + AI 速读 + 公司身体 + 雇主线卡。
 */
export function CompanyPanel({ job, jobs, lang, plan, onOpenJob }: CompanyPanelIn) {
  const t = makeT(lang)
  const p = useCompanyPanel({ job })
  let company = null
  if (p.data != null) {
    company = p.data.company
  }
  let jobSlug = TEXT_NONE
  if (job.companySlug !== TEXT_NONE) {
    jobSlug = job.companySlug
  }
  let body = <p className={css.note}>{t('act.loadingText')}</p>
  if (p.loading === false && p.data == null) {
    body = <p className={css.note}>{t('advisor.unavail')}</p>
  }
  if (p.data != null) {
    body = (
      <CompanyBody company={p.data.company}
        similar={p.data.similar}
        t={t}
        lang={lang}
        showTrans={p.showTrans}
        hideTopInfo
        onOpenJob={onOpenJob}
        resolveJob={makeResolveJob({ jobs })}
        afterSponsor={<TvEntryCard t={t} onOpen={makeTvOpen({ jobId: job.id })} />} />
    )
  }
  return (
    <>
      <CompanyPanelActs t={t}
        canTrans={canTransOf({ company, lang })}
        showTrans={p.showTrans}
        onToggleTrans={p.onToggleTrans}
        aiOn={p.aiOn}
        onToggleAi={p.onToggleAi}
        slug={panelSlugOf({ jobSlug, company })} />
      {p.aiOn && (
        <div className={CARD_MD_CLS + CLS_SEP + cssOf(css.aiCard)}>
          <JdAdvisorSection job={job} lang={lang} plan={plan} title={t('cat.aiRead')} field={AI_FIELD_CO_READ} />
        </div>
      )}
      {body}
      <SponsorLeadCard job={job} t={t} src={LEAD_SRC_COMPANY} />
    </>
  )
}
