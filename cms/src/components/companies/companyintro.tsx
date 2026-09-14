'use client'
/**
 * 基本信息卡里的简介内容:名录厚简介 > 缓存的 K 调查五节 > 懒查,三者**互斥**
 * (#197 合并后标题与声明不再另起,由卡自己出)。
 * 名录厚简介是抓自官网的原文,底下一句小注说明出处;K 调查那两条走 CompanyBriefCards
 * 的 bare 形态。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的三岔渲染重写成件。
 * 2026-09-14 Frank「这个也没加翻译」:官网抓来的简介也出中 / 韩对照(懒翻,useCompanyDescTrans)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyAiSection } from './companyaisection'
import { CompanyZhLine } from './companyzhline'
import { CompanyBriefCards } from './companybriefcards'
import { TEXT_NONE } from './constants'
import { hasDescOf } from './functions'
import { useCompanyDescTrans } from './hooks'
import type { CompanyIntroIn } from './types'
import css from './companies.module.css'

/**
 * 简介内容。
 *
 * @param props 公司档案、取词函数、界面语言与对照三格(逐格注释见 CompanyIntroIn)。
 * @returns 简介;三条路都走不通(连公司名都没有)时不渲。
 */
export function CompanyIntro({
  company, t, lang, showTrans, trans, skipBase, baseOverride = TEXT_NONE, baseOverrideZh = TEXT_NONE, onBusy,
}: CompanyIntroIn) {
  const descZh = useCompanyDescTrans({ name: company.name, lang, has: hasDescOf({ company }) })
  if (hasDescOf({ company })) {
    return (
      <div className={css.descWrap}>
        <div className={css.desc}>{company.description}</div>
        {descZh !== TEXT_NONE && <CompanyZhLine text={descZh} prose />}
        <div className={css.descSrc}>{t('fact.coIntroSrc')}</div>
      </div>
    )
  }
  if (company.aiBrief !== TEXT_NONE) {
    let shown = null
    if (showTrans) {
      shown = trans
    }
    return (
      <div>
        <CompanyBriefCards brief={company.aiBrief}
          website={company.aiWebsite}
          fetched={company.aiFetched}
          t={t}
          trans={shown}
          sources={company.aiSources}
          bare
          skipBase={skipBase}
          baseOverride={baseOverride}
          baseOverrideZh={baseOverrideZh} />
      </div>
    )
  }
  if (company.name !== TEXT_NONE) {
    return (
      <div className={css.descWrap}>
        <CompanyAiSection company={company.name} t={t} showTrans={showTrans} lang={lang} bare skipBase={skipBase}
          baseOverride={baseOverride}
          baseOverrideZh={baseOverrideZh} onBusy={onBusy} />
      </div>
    )
  }
  return null
}
