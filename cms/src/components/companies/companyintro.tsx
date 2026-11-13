'use client'
/**
 * 基本信息卡里的简介内容:名录厚简介 > 缓存的 K 调查五节 > 懒查,三者**互斥**
 * (#197 合并后标题与声明不再另起,由卡自己出)。
 * 名录厚简介是抓自官网的原文,底下一句小注说明出处;K 调查那两条走 CompanyBriefCards
 * 的 bare 形态。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的三岔渲染重写成件。
 * 2026-09-14 Frank「这个也没加翻译」:官网抓来的简介也出中 / 韩对照(懒翻,useCompanyDescTrans)。
 * 2026-09-17 Frank「这个 公司的 弹框 也 默认关闭」:官网简介的对照行也跟页眉开关走 —— 开关关着不翻不出
 *(原先它不看开关、中 / 韩界面一开框就翻就出,开关默认关后成了唯一漏网的中文行)。
 * 2026-09-17 同日 Frank「自动拨开去掉,但是后台要自动翻译」:翻回后台预翻(不看开关),只有那一行的出不出跟开关走。
 * 2026-09-18 Frank「简介抓取自官网 这几个字删掉」:官网简介下那行来源小注撤。
 * 2026-09-22 Frank「我是查的 localhost 也没显示排队中啊」(Ciena):进度行原先只活在懒查那一岔 ——
 * 厚简介与缓存简介两岔直渲内容,重探时卡上没动静。探索进行中三岔都出进度行(CompanySteps)。
 * 同日 Frank「排队中这个位置是不是不合适,如果下面之前有主营业务」:铺着内容的两岔进度行挪到内容**下方**当状态行,
 * 不打断简介阅读;懒查岔照旧(简介位本来空着)。
 * 2026-10-13 Frank「这个主营业务那几个字怎么没了」:官网简介那一岔也挂「主营业务」小标题(与 K 调查五节第一节同一个类),
 * 正文照旧整段保留换行。
 * 2026-11-13 Frank「主营业务也应该是 AI 整理的 bullets」「选项一」:官网抓来的原文那一岔撤 —— 原文没人整理过,
 * 抓到导航菜单、样式代码、「86 likes」都照登(Caressant Care 一屏菜单文字,AI 整理版被它盖住)。现在只剩两岔:
 * 缓存的 AI 整理五节 > 点开时现查;原文的对照懒翻(useCompanyDescTrans)随之撤。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyAiSection } from './companyaisection'
import { CompanySteps } from './companysteps'
import { CompanyBriefCards } from './companybriefcards'
import { TEXT_NONE } from './constants'
import { isSiteActive } from './functions'
import type { CompanyIntroIn } from './types'
import css from './companies.module.css'

/**
 * 简介内容。
 *
 * @param props 公司档案、取词函数、界面语言与对照三格(逐格注释见 CompanyIntroIn)。
 * @returns 简介;三条路都走不通(连公司名都没有)时不渲。
 */
export function CompanyIntro({
  company, t, lang, showTrans, trans, skipBase, baseZh = TEXT_NONE, onBusy, stage = TEXT_NONE, ahead = 0,
}: CompanyIntroIn) {
  let steps = null
  if (isSiteActive(stage)) {
    steps = <CompanySteps stage={stage} ahead={ahead} hasSite={company.website !== TEXT_NONE} lang={lang} t={t} />
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
          baseZh={baseZh} />
        {steps}
      </div>
    )
  }
  if (company.name !== TEXT_NONE) {
    return (
      <div className={css.descWrap}>
        <CompanyAiSection company={company.name} t={t} showTrans={showTrans} lang={lang} bare skipBase={skipBase}
          baseZh={baseZh} onBusy={onBusy} stage={stage} ahead={ahead} hasSite={company.website !== TEXT_NONE} />
      </div>
    )
  }
  return null
}
