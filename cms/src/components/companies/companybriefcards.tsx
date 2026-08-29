'use client'
/**
 * 公司 K 调查简介的渲染(纯展示,#181 抽出):公司弹框(懒查回来)与公司详情页
 * (服务端 ai_brief)共用同一件 —— 改一处两边生效。
 * 五节标记切节;存量散文整段一块;缺项不占卡;检索声明 + 官网小注各归其位。
 * bare(#197 Frank「合并」):只出内容体(不带标题/AI 声明/外壳/官网),供合并进
 * 「公司」块 —— 声明由调用方在顶部渲。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyAiNote } from './companyainote'
import { CompanyBriefBody } from './companybriefbody'
import { CompanySite } from './companysite'
import { AI_NOTE_BRIEF, TEXT_NONE } from './constants'
import { briefHeadClsOf, briefWrapClsOf } from './functions'
import type { CompanyBriefCardsIn } from './types'

/**
 * K 调查简介(整卡或裸内容体)。
 *
 * @param props 正文、官网、检索日期与四个开关(逐格注释见 CompanyBriefCardsIn)。
 * @returns 简介;正文为空时整块不渲。
 */
export function CompanyBriefCards({
  brief,
  website,
  fetched,
  t,
  trans,
  sources,
  flat = false,
  bare = false,
  skipBase = false,
}: CompanyBriefCardsIn) {
  if (brief === TEXT_NONE) {
    return null
  }
  const body = <CompanyBriefBody brief={brief} trans={trans} t={t} flat={flat} skipBase={skipBase} />
  if (bare) {
    return body
  }
  return (
    <div className={briefWrapClsOf({ flat })}>
      <div className={briefHeadClsOf({ flat })}>{t('fact.coIntro')}</div>
      <CompanyAiNote t={t} fetched={fetched} sources={sources} kind={AI_NOTE_BRIEF} />
      {body}
      <CompanySite website={website} t={t} flat={flat} />
    </div>
  )
}
