'use client'
/**
 * K 公司懒探索(#158,2026-07-19 Frank 批):库里没有缓存简介时,首开自动去查
 * (命中缓存秒回);查不到/掉线整块消失不留孤儿 —— 不拿空壳假装查过。
 * 渲染委托 CompanyBriefCards(与公司详情页同源),这一件只管「查」与三态。
 * bare(#197):懒查命中在合并后的「公司」块内出 —— 顶部无缓存无法预挂声明,
 * 所以在这里紧贴内容渲一行 AI 声明(仍守披露红线)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(两条 effect 迁 hooks 的 useCompanyAi)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyAiNote } from './companyainote'
import { CompanyBriefCards } from './companybriefcards'
import { AI_NOTE_LAZY, SPARKLE } from './constants'
import { useCompanyAi } from './hooks'
import type { CompaniesLang, CompanyAiSectionIn } from './types'
import css from './companies.module.css'

/**
 * 懒查回来的公司简介。
 *
 * @param props 公司名、取词函数与四个开关(逐格注释见 CompanyAiSectionIn)。
 * @returns 简介;还在查时是一行占位,查不到时整块不渲。
 */
export function CompanyAiSection({
  company,
  t,
  showTrans = false,
  lang,
  flat = false,
  bare = false,
  skipBase = false,
}: CompanyAiSectionIn) {
  let hookLang: CompaniesLang | null = null
  if (lang != null) {
    hookLang = lang
  }
  const p = useCompanyAi({ company, showTrans, lang: hookLang })
  if (p.loading) {
    return <div className={css.aiWorking}>{SPARKLE} {t('fact.aiWorking')}</div>
  }
  if (p.fact == null) {
    return null
  }
  let trans = null
  if (showTrans) {
    trans = p.trans
  }
  if (bare) {
    return (
      <>
        <CompanyAiNote t={t} fetched={p.fact.fetched} sources={p.fact.sources} kind={AI_NOTE_LAZY} />
        <CompanyBriefCards brief={p.fact.brief}
          website={p.fact.website}
          fetched={p.fact.fetched}
          t={t}
          trans={trans}
          flat={flat}
          sources={p.fact.sources}
          bare
          skipBase={skipBase} />
      </>
    )
  }
  return (
    <CompanyBriefCards brief={p.fact.brief}
      website={p.fact.website}
      fetched={p.fact.fetched}
      t={t}
      trans={trans}
      flat={flat}
      sources={p.fact.sources} />
  )
}
