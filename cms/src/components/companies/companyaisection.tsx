'use client'
/**
 * K 公司懒探索(#158,2026-07-19 Frank 批):库里没有缓存简介时,首开自动去查
 * (命中缓存秒回);查不到/掉线整块消失不留孤儿 —— 不拿空壳假装查过。
 * 渲染委托 CompanyBriefCards(与公司详情页同源),这一件只管「查」与三态。
 * bare(#197):懒查命中在合并后的「公司」块内出 —— 顶部无缓存无法预挂声明,
 * 所以在这里紧贴内容渲一行 AI 声明(仍守披露红线)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位(两条 effect 迁 hooks 的 useCompanyAi)。
 * 2026-09-14 Frank「也不需要显示」:「✨ AI 调查中…」在途行撤,简介到了直接出(基本信息卡本身已在,不会白屏);同日「这个删掉」:「✨ AI 检索整理(非官方自述)+ 日期」注也撤。
 * 2026-09-14 Frank「这个不要提前显示」「要等都翻译完了,才全部显示」:懒抓与对照在途经 onBusy 回报,弹框正文整体等它。
 * 2026-09-20 Frank「就是 AI 探索的时候,显示 抓取官网,然后才是生成内容 和 翻译」:官网那条工种还在办时简介位出进度行(CompanySteps),
 * 这期间只查库不联网现查;办完 / 查无 / 工人不在线再放开现查兜底(不空白)。
 * 2026-09-21 Frank「先一个小框，然后在放大。然后页面在一部分一部分渲染出来」:「AI 调查中…」只在联网现查那一拍出 ——
 * 开框那一拍只是查库(零点几秒),原先也出这一行,一闪就没;进度行照旧(同日 Frank「怎么不探索了」:职位页的公司卡也要看得见探索)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyBriefCards } from './companybriefcards'
import { CompanySteps } from './companysteps'
import { TEXT_NONE, LANG_EN } from './constants'
import { useEffect } from 'react'
import { shownStageOf } from './functions'
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
  baseZh = TEXT_NONE,
  onBusy,
  stage = TEXT_NONE,
  hasSite = false,
}: CompanyAiSectionIn) {
  let hookLang: CompaniesLang | null = null
  if (lang != null) {
    hookLang = lang
  }
  const p = useCompanyAi({ company, lang: hookLang, stage })
  const transWait = showTrans && hookLang !== null && hookLang !== LANG_EN && p.fact != null && p.trans === null
  useEffect(function reportBusy() {
    if (onBusy != null) {
      onBusy(transWait)
    }
  }, [transWait, onBusy])
  const shown = shownStageOf({ stage, hasFact: p.fact != null, transWait })
  if (shown !== TEXT_NONE) {
    return <CompanySteps stage={shown} hasSite={hasSite} lang={hookLang} t={t} />
  }
  if (p.live && bare) {
    return <div className={css.descSrc}>{t('fact.aiWorking')}</div>
  }
  if (p.loading) {
    return null
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
        <CompanyBriefCards brief={p.fact.brief}
          website={p.fact.website}
          fetched={p.fact.fetched}
          t={t}
          trans={trans}
          flat={flat}
          sources={p.fact.sources}
          bare
          skipBase={skipBase}
          baseZh={baseZh} />
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
