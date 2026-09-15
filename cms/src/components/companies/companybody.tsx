'use client'
/**
 * ── E8-11 B1(Frank「以弹框为准,一个来源」):公司域唯一骨架 CompanyBody ──
 * 公司弹框(CompanyPanel)与 /companies/[slug] 页面渲**同一组件、吃同一份 CompanyDetail**
 * (免额度,与页面同口径)。排版 = JD 扁平基准;顺序循 #192:身份 → 担保 → 简介 → 在招 →
 * 相似 → 雇主信号(判断殿后)。
 * 红线:分类/职位弹框不碰(Frank「这两个现在做的我很满意」)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位:各段成件(基本信息/担保/在招/相似/信号),
 * 这一件只剩顺序与那一条懒翻 effect(迁 hooks 的 useCompanyTrans)。
 * 2026-09-14 Frank「删掉」×2:「雇主信号」四维卡撤,「担保记录」卡撤(弹框与公司页都不出,同日再拍「这个删掉」);「相似雇主要加翻译」:相似卡收界面语,名下出别名。
 * 2026-09-14 Frank「公司这个弹框,等这个都加载完了之后,才全部显示,不然和 job 描述一样只显示加载中」:
 * 中 / 韩界面简介对照没回来前整个正文只出转圈行;懒抓简介那一档(aiBrief 空)由 CompanyAiSection 经 onBusy 回报在途,
 * 正文用 hidden 藏着(不能卸载,卸了懒抓就停),转圈行顶上。
 * 同日 Frank「所以肯定是渲染了好几次」:aiBusy 初值改按 needsAiFetchOf 算,要懒抓的首帧就藏,不再先露后藏。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyBasicCard } from './companybasiccard'
import { CompanyJobsCard } from './companyjobscard'
import { CompanySimilarCard } from './companysimilarcard'
import { CompanyTopInfo } from './companytopinfo'
import { useState } from 'react'
import { Loading } from '@/components/loading'
import { LANG_EN, TEXT_NONE } from './constants'
import { hasDescOf, needsAiFetchOf } from './functions'
import { useCompanyTrans } from './hooks'
import type { CompanyBodyIn } from './types'
import css from './companies.module.css'

/**
 * 公司身体(详情页与弹框同源)。
 *
 * @param props 公司档案、相似雇主、更新时刻与五个开关/回调(逐格注释见 CompanyBodyIn)。
 * @returns 卡组。
 */
export function CompanyBody({
  company,
  similar,
  t,
  lang,
  updatedAt,
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
  const newTab = onOpenJob != null
  const [aiBusy, setAiBusy] = useState(needsAiFetchOf({ company }))
  const transBusy = showTrans && lang !== LANG_EN && hasDescOf({ company }) === false
    && company.aiBrief !== TEXT_NONE && trans === null
  const busy = transBusy || aiBusy
  return (
    <>
      {busy && <Loading text={t('act.loadingText')} />}
      <div className={css.body} hidden={busy}>
      {hideTopInfo === false && <CompanyTopInfo company={company} t={t} />}
      <CompanyBasicCard company={company}
        t={t}
        lang={lang}
        showTrans={showTrans}
        trans={trans}
        hideTopInfo={hideTopInfo}
        onBusy={setAiBusy} />
      {afterSponsor}
      <CompanyJobsCard company={company}
        t={t}
        lang={lang}
        updatedAt={updatedAt}
        onOpenJob={onOpenJob}
        resolveJob={resolveJob}
        newTab={newTab} />
      <CompanySimilarCard similar={similar} t={t} lang={lang} newTab={newTab} />
      </div>
    </>
  )
}
