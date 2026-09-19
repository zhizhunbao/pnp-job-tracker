'use client'
/**
 * 公司弹框的轻壳(2026-09-18 Frank「接着做点雇主名开弹框,可以和 job 的公司弹框保持一致吗」):
 * 雇主板上没有职位,开不了 AdvisorModal(它从一条职位出发,要分层态与七张维度表);这一件只拼公司组用得到的那几样 ——
 * 同一个浮层外框 FloatPanel(可拖可缩、记位置)、同一个页眉 AdvisorHead(公司名 + 译名行 + 中文对照开关)、
 * 同一个正文 CompanyPanel(按 slug 取,与公司页同一份数据)。看起来、用起来与职位板点公司格开的那个一致;
 * 少的只有依赖职位的两样:底部雇主线索卡、管理员的「重译」胶囊。
 * 2026-09-18 晚雇主板那个入口改判撤了;2026-09-19 Frank「这种里面的链接都改成弹框显示」起,它是「点相似雇主」开的那个框 ——
 * 宿主(公司页 / 职位板)注两个回调:点在招职位叠开职位描述弹框、点相似雇主同框换一家。
 * CompanyPanel 点**文件**不走 companies 桶:那只桶里的公司页正文反过来要本件,走桶就成环。
 *
 * @author Frank
 * @time 2026-09-18 20:00:00
 */
import { CompanyPanel } from '@/components/companies/companypanel'
import { makeT } from '@/lib/i18n'
import { AdvisorHead } from './advisorhead'
import { ADV_PANEL_H, ADV_PANEL_W, ADV_PREF, GROUP_COMPANY, LANG_EN } from './constants'
import { FloatPanel } from './floatpanel'
import { useCompanyModal, useFloatPanel } from './hooks'
import type { CompanyModalIn } from './types'

/**
 * 渲染公司弹框(不带职位)。
 *
 * @param props 公司页 slug、公司名、界面语言、点职位 / 点相似雇主两个回调与关弹框的回调。
 * @returns 浮层。
 */
export function CompanyModal({ slug, name, lang, onOpenJob, onOpenCompany, onClose }: CompanyModalIn) {
  const t = makeT(lang)
  const m = useCompanyModal()
  const panel = useFloatPanel({ prefKey: ADV_PREF, defW: ADV_PANEL_W, defH: ADV_PANEL_H })
  const head = (
    <AdvisorHead t={t} group={GROUP_COMPANY}
      title={name}
      sub={m.alias}
      freeLeft={null}
      ctl={null} />
  )
  return (
    <FloatPanel panel={panel} head={head} onClose={onClose} t={t} tight={false} jdBody={false} actsStopDrag={false}
      onRefresh={null}>
      <CompanyPanel job={null} slug={slug} jobs={m.jobs} lang={lang} onOpenJob={onOpenJob}
        onOpenCompany={onOpenCompany}
        onAlias={m.onAlias} showTrans={lang !== LANG_EN} onTransBusy={m.onTransBusy} />
    </FloatPanel>
  )
}
