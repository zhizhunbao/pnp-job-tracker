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
 * 2026-09-03「表右上角挂更新时间」那一格弹框递空串:心跳是页面门 SSR 取的 checkedAt,
 * 弹框走客户端取数拿不到它,空串让那一行整个不出(不渲「更新时间 —」这种半句)。
 * 2026-09-14 Frank「按钮都去掉」:顶部三钮条整排撤(CompanyPanelActs 件随撤);速读卡与对照开关的状态机先留。
 * 2026-09-14 Frank「下面要加中文翻译」「这个也默认带翻译」「参考一下职位描述的弹框 css」:别名经 onAlias 回传给
 * 页眉副题位(与职位弹框标题下的 NOC 译名同一形;库里没别名的开框懒翻一次落库,同日「公司名也做一个懒加载翻译」),AI 简介对照随界面语默认开;「加载中…」灰字换职位板同款转圈行
 * (Frank「统一改成那个动态的」)。
 * 2026-09-16 Frank「公司 加载中这部分是不是也应该删掉」「可以,就这样做」:开框转圈行撤(公司数据线上 0.15~0.6s 就到,留白即可),
 * 正文不再等翻译(见 CompanyBody);现场翻译在途经 onTransBusy 回报给页眉开关。上面 09-14「换职位板同款转圈行」作废。
 * 2026-09-14 Frank「加」:管理员在弹框顶部有一颗「重译」胶囊 —— 清这家公司的译文版本后整页刷新。
 * 2026-09-19 Frank「这种里面的链接都改成弹框显示」:点相似雇主经 onOpenCompany 交回上层(同框换一家);
 * 「新开页」不再由有没有 onOpenJob 推出来,弹框里恒新开(按着 Ctrl 点出去别把弹框关掉)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { useEffect } from 'react'
import { SponsorLeadCard } from '@/components/pnp'
import { makeT } from '@/lib/i18n'
import { CompanyBody } from './companybody'
import { LEAD_SRC_COMPANY, TEXT_NONE } from './constants'
import { aliasOf, makeResolveJob } from './functions'
import { useCompanyAlias, useCompanyPanel } from './hooks'
import type { CompanyPanelIn } from './types'

/**
 * 公司弹框。
 *
 * 2026-09-16 Frank「公司的也对照改一下」:中文对照开关上提到弹框页眉译名行,开合状态改由弹框递进来(showTrans)。
 * 2026-09-18 Frank「雇主弹框…可以和 job 的公司弹框保持一致吗」:雇主板点雇主名开的也是这一件 —— 那里没有职位,
 * job 给 null、按 slug 取,底部的雇主线索卡(要一条职位)不出,其余一字不差。
 *
 * @param props 当前职位、已载入职位、语言、点职位回调、别名回传与中文对照开合(逐格注释见 CompanyPanelIn)。
 * @returns 钮条 + AI 速读 + 公司身体 + 雇主线卡。
 */
export function CompanyPanel({
  job, slug, jobs, lang, onOpenJob, onOpenCompany, onAlias, showTrans, onTransBusy,
}: CompanyPanelIn) {
  const t = makeT(lang)
  const p = useCompanyPanel({ job, slug, lang })
  let cachedAlias = TEXT_NONE
  let companyName = TEXT_NONE
  if (p.data != null) {
    cachedAlias = aliasOf({ lang, aliasZh: p.data.company.aliasZh, aliasKo: p.data.company.aliasKo })
    companyName = p.data.company.name
  }
  const zhName = useCompanyAlias({ name: companyName, lang, cached: cachedAlias }).alias
  useEffect(function liftAlias() {
    onAlias(zhName)
  }, [zhName, onAlias])
  let body: React.ReactNode = null
  if (p.data != null) {
    body = (
      <CompanyBody company={p.data.company}
        similar={p.data.similar}
        t={t}
        lang={lang}
        updatedAt={TEXT_NONE}
        showTrans={showTrans}
        onTransBusy={onTransBusy}
        onSiteDone={p.reload}
        onOpenJob={onOpenJob}
        onOpenCompany={onOpenCompany}
        newTab
        resolveJob={makeResolveJob({ jobs })} />
    )
  }
  return (
    <>
      {body}
      {job != null && <SponsorLeadCard job={job} t={t} src={LEAD_SRC_COMPANY} />}
    </>
  )
}
