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
 * 2026-09-16 改判(Frank「公司 加载中这部分是不是也应该删掉」→ 方案「先铺库里有的,翻译后到」→「可以,就这样做」):上两条作废 ——
 * 线上实测公司数据 0.15~0.6s 就到,转圈 2.7~10s 全是在等现场翻译。正文不再整框等:弹框(hold)首拍只查库里存好的译文,
 * 在途正文留白(半秒内),有就与正文一起铺;没存的先铺英文、译文后到,在途经 onTransBusy 回报给页眉开关显「翻译中…」。
 * 懒抓简介那一档只在简介位出一行「AI 调查中…」。同日「在招职位 和 相似雇主 下面的也算中文翻译」:那两卡名下的对照行跟开关走。
 * 2026-09-17 Frank「自动拨开去掉,但是后台要自动翻译」:译文一开框就在后台拉好存着(不看开关),开关默认关、只管显不显;
 * hold 留白与 hidden 随之撤,「翻译中…」只在开关拨开而译文未到时回报(后台在译不打扰关着的开关)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyBasicCard } from './companybasiccard'
import { CompanyJobsCard } from './companyjobscard'
import { CompanySimilarCard } from './companysimilarcard'
import { useEffect, useState } from 'react'
import { hasDescOf, ignoreDone } from './functions'
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
  onOpenJob,
  resolveJob,
  onOpenCompany,
  newTab = false,
  afterSponsor = null,
  onTransBusy,
  onSiteDone = ignoreDone,
}: CompanyBodyIn) {
  const tr = useCompanyTrans({
    name: company.name,
    aiBrief: company.aiBrief,
    hasDesc: hasDescOf({ company }),
    lang,
  })
  const [aiTransBusy, setAiTransBusy] = useState(false)
  const busy = showTrans && (tr.busy || aiTransBusy)
  useEffect(function reportTransBusy() {
    if (onTransBusy != null) {
      onTransBusy(busy)
    }
  }, [busy, onTransBusy])
  return (
    <div className={css.body}>
      <CompanyBasicCard company={company}
        t={t}
        lang={lang}
        showTrans={showTrans}
        trans={tr.trans}
        onBusy={setAiTransBusy}
        onSiteDone={onSiteDone} />
      {afterSponsor}
      <CompanyJobsCard company={company}
        t={t}
        lang={lang}
        updatedAt={updatedAt}
        onOpenJob={onOpenJob}
        resolveJob={resolveJob}
        newTab={newTab}
        showTrans={showTrans} />
      <CompanySimilarCard similar={similar} t={t} lang={lang} onOpenCompany={onOpenCompany} newTab={newTab}
        showTrans={showTrans} />
    </div>
  )
}
