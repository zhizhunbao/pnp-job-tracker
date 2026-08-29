'use client'
/**
 * ── E8-11 B1(Frank「以弹框为准,一个来源」):公司域唯一骨架 CompanyBody ──
 * 公司弹框(CompanyPanel)与 /companies/[slug] 页面渲**同一组件、吃同一份 CompanyDetail**
 * (免额度,与页面同口径)。排版 = JD 扁平基准;顺序循 #192:身份 → 担保 → 简介 → 在招 →
 * 相似 → 雇主信号(判断殿后)。
 * 红线:分类/职位弹框不碰(Frank「这两个现在做的我很满意」)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位:各段成件(基本信息/担保/在招/相似/信号),
 * 这一件只剩顺序与那一条懒翻 effect(迁 hooks 的 useCompanyTrans)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyBasicCard } from './companybasiccard'
import { CompanyGradesView } from './companygradesview'
import { CompanyJobsCard } from './companyjobscard'
import { CompanySimilarCard } from './companysimilarcard'
import { CompanySponsorCard } from './companysponsorcard'
import { CompanyTopInfo } from './companytopinfo'
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import { hasDescOf, showSponsorOf } from './functions'
import { useCompanyTrans } from './hooks'
import type { CompanyBodyIn } from './types'
import css from './companies.module.css'

/**
 * 公司身体(详情页与弹框同源)。
 *
 * @param props 公司档案、相似雇主与五个开关/回调(逐格注释见 CompanyBodyIn)。
 * @returns 卡组。
 */
export function CompanyBody({
  company,
  similar,
  t,
  lang,
  showTrans = false,
  hideTopInfo = false,
  onOpenJob,
  resolveJob,
  afterSponsor = null,
}: CompanyBodyIn) {
  const trans = useCompanyTrans({
    name: company.name,
    aiBrief: company.aiBrief,
    hasDesc: hasDescOf({ company }),
    showTrans,
    lang,
  })
  const showSponsor = showSponsorOf({ company })
  const newTab = onOpenJob != null
  return (
    <div className={css.body}>
      {hideTopInfo === false && <CompanyTopInfo company={company} t={t} />}
      <CompanyBasicCard company={company}
        t={t}
        lang={lang}
        showTrans={showTrans}
        trans={trans}
        hideTopInfo={hideTopInfo} />
      {showSponsor && <CompanySponsorCard company={company} t={t} lang={lang} />}
      {afterSponsor}
      <CompanyJobsCard company={company}
        t={t}
        lang={lang}
        onOpenJob={onOpenJob}
        resolveJob={resolveJob}
        newTab={newTab} />
      <CompanySimilarCard similar={similar} t={t} newTab={newTab} />
      {company.scoreDetail != null && (
        <div className={CARD_MD_CLS}>
          <div className={CARD_HEAD_CLS}>{t('co.grades')}</div>
          <div>
            <CompanyGradesView detail={company.scoreDetail} t={t} hideSponsor={showSponsor} />
          </div>
        </div>
      )}
    </div>
  )
}
