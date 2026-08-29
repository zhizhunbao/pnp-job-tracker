'use client'
/**
 * 字段顾问弹框:点表格里的一格 → 开这一格背后的事实。
 * E8-10:入参从 24 值的 field 改为 3 值的 group;field 保留仅用于「打开时锚到哪一节」
 * 与该行高亮,不再参与内容分支。
 * 「对我意味着什么」(E5-00)个人相关性放最上,依据链同源 match();#161
 * (Frank「公司显示这些信息也不合适吧」):公司面板不渲它 —— 表里七个维度
 * (职业方向/所在省/省提名粗筛/EE/技能层级/薪资)全是**岗位级**事实,挂在
 * 「Agilent Technologies」这个标题下答非所问(用户点公司是想了解公司)。岗位级判定留在岗位面板。
 * 建档 CTA 删(2026-07-25 Frank「这个去掉没什么意义」);免责/AI 声明不进弹框
 * (2026-07-06 用户拍板:合规统一在 footer 说明)。
 * 2026-08-28 换装批自 Advisor.tsx 重写落位(浮层机器与三台状态机迁 hooks,
 * 页眉/钮栏/正文/AI 卡各成一件)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { MeansForMe } from '@/components/pnp'
import { makeT } from '@/lib/i18n'
import {
  ADV_PANEL_H, ADV_PANEL_W, ADV_PREF, GROUP_CATEGORY, GROUP_COMPANY, GROUP_IMMIGRATION, GROUP_LOCATION,
} from './constants'
import { AdvisorAiCard } from './advisoraicard'
import { AdvisorBody } from './advisorbody'
import { AdvisorHead } from './advisorhead'
import { FieldActs } from './fieldacts'
import { FloatPanel } from './floatpanel'
import { headSubOf, modalTitleOf, planClbOf } from './functions'
import { useAdvisorModal, useFloatPanel } from './hooks'
import type { AdvisorFacts, AdvisorModalIn } from './types'

/**
 * 渲染字段顾问弹框。
 *
 * @param props 分组、入口格、这一岗、标题、语言、分层态、七张维度表与两个回调。
 * @returns 浮层。
 */
export function AdvisorModal({
  group,
  field,
  job,
  title,
  lang,
  plan,
  pnpOcc,
  pnpDraws,
  news,
  eeOcc,
  desigEmp,
  nocDesc,
  onClose,
  onOpenJob,
}: AdvisorModalIn) {
  const t = makeT(lang)
  const m = useAdvisorModal({ group, field, job, lang })
  const panel = useFloatPanel({ prefKey: ADV_PREF, defW: ADV_PANEL_W, defH: ADV_PANEL_H })
  const f: AdvisorFacts = {
    job,
    lang,
    pnpOcc,
    pnpDraws,
    news,
    profileClb: planClbOf({ plan }),
    eeOcc,
    desigEmp,
    nocDesc,
    showZh: m.showZh,
  }
  const head = (
    <AdvisorHead t={t} group={group}
      title={modalTitleOf({ group, job, title })}
      sub={headSubOf({ group, nocDesc, job, lang })}
      freeLeft={m.freeLeft} />
  )
  const ownActs = group === GROUP_CATEGORY || group === GROUP_LOCATION || group === GROUP_COMPANY
  return (
    <FloatPanel panel={panel} head={head} onClose={onClose} t={t} tight={false} jdBody={false} actsStopDrag={false}>
      {ownActs === false && <FieldActs t={t} lang={lang} showZh={m.showZh} onToggleZh={m.onToggleZh} />}
      {group === GROUP_IMMIGRATION && (
        <MeansForMe job={job} lang={lang} plan={plan} pnpOcc={pnpOcc} eeOcc={eeOcc} nocDesc={nocDesc} />
      )}
      <AdvisorBody group={group} field={field} plan={plan}
        companyJobs={m.companyJobs}
        onOpenJob={onOpenJob}
        f={f} />
      {m.aiOn && (
        <AdvisorAiCard t={t} loggedIn={plan.loggedIn} status={m.status} text={m.text} onRetry={m.onRetry} />
      )}
    </FloatPanel>
  )
}
