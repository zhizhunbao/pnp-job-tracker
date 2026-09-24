'use client'
/**
 * 一格字段的事实块分叉:点哪一格就渲哪一块。
 * 公司分支 2026-07-21 退役 —— 公司弹框走专用 CompanyPanel(平级卡),不再经本表。
 *
 * 出处的口径(两条,都还立着,只是眼下没有一条出处行真在渲):
 * · 每个字段来源各归其源(07-06 用户拍板:不能都链 jobbank 列表根)——
 *   帖内字段 → 记录级 applyUrl(这一岗的原帖,每岗不同);第三方数据字段 → field_sources
 *   注册表里各自的官方数据集页(分类 = StatCan NOC、中位 = ESDC 工资、AIP/PNP/EE = IRCC、
 *   LMIA = ESDC 名录);本站派生(评分/匹配)与公司(官网行即出处)不挂;
 *   vsMedian = 对比字段,帖子 + ESDC 两个输入都给。
 * · 来源行极简版(2026-07-06 用户拍板):「来源: 完整 applyUrl」一行可点击,
 *   **紧跟事实/JD 内容、在 AI 区之前**(出处跟着对应内容走,不吊在弹框底部);
 *   发布方/抓取时间/标签全不带 —— 合规已在 footer 统一声明。
 *   pnp/ee 字段例外:清单内容来自政策页,各通道行已带自己的 ↗ 官方链接,不加岗位帖来源行。
 *   field_sources 维度与 `/sources` 解释页照旧保留(E4-04 出处能力后置到解释页)。
 * #106 撤官方外链;2026-07-25 Frank「这些都是废话」:「来源: 本站算法」派生注也退役
 * —— 于是这一层现在只剩事实块本身。
 * 2026-08-28 换装批自 Advisor.tsx 的 FieldFactsSection / FieldFactsInner 重写落位
 * (两件合成一件:外层原先只是包着一条注释的纯转发)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { EeCategorySection, PnpListSection } from '@/components/pnp'
import {
  CLS_FIELDS, COL_TITLE, FIELD_ACCESSIBILITY, FIELD_AIP, FIELD_EE, FIELD_ELIGIBILITY, FIELD_LMIA, FIELD_PILOT,
  FIELD_PNP, LOC_FIELDS, SAL_FIELDS, SRC_FIELDS, TIME_FIELDS,
} from './constants'
import { AccessFacts } from './accessfacts'
import { AipFacts } from './aipfacts'
import { ClassFacts } from './classfacts'
import { EligFacts } from './eligfacts'
import { LmiaFacts } from './lmiafacts'
import { LocFacts } from './locfacts'
import { PilotFacts } from './pilotfacts'
import { SalaryFacts } from './salaryfacts'
import { SourceFacts } from './sourcefacts'
import { TimeFacts } from './timefacts'
import { TitleFacts } from './titlefacts'
import type { FieldFactsIn } from './types'

/**
 * 渲染一格字段的事实块。
 *
 * @param props 点开的是哪一格与取数包。
 * @returns 那一块事实;这一格还没接内容时给 null(不留空壳)。
 */
export function FieldFacts({ field, f }: FieldFactsIn) {
  if (field === FIELD_PNP) {
    return (
      <PnpListSection job={f.job} lang={f.lang} occ={f.pnpOcc} draws={f.pnpDraws} news={f.news}
        profileClb={f.profileClb} nocDesc={f.nocDesc} showZh={f.showZh} />
    )
  }
  if (field === FIELD_EE) {
    return (
      <EeCategorySection job={f.job} lang={f.lang} cats={f.eeOcc} draws={f.pnpDraws}
        nocDesc={f.nocDesc} showZh={f.showZh} />
    )
  }
  if (field === COL_TITLE) {
    return <TitleFacts job={f.job} lang={f.lang} />
  }
  if (field === FIELD_AIP) {
    return <AipFacts f={f} />
  }
  if (field === FIELD_PILOT) {
    return <PilotFacts f={f} />
  }
  if (field === FIELD_ELIGIBILITY) {
    return <EligFacts f={f} />
  }
  if (field === FIELD_LMIA) {
    return <LmiaFacts f={f} />
  }
  if (LOC_FIELDS.includes(field)) {
    return <LocFacts field={field} f={f} />
  }
  if (SAL_FIELDS.includes(field)) {
    return <SalaryFacts field={field} f={f} />
  }
  if (CLS_FIELDS.includes(field)) {
    return <ClassFacts field={field} f={f} />
  }
  if (SRC_FIELDS.includes(field)) {
    return <SourceFacts field={field} f={f} />
  }
  if (field === FIELD_ACCESSIBILITY) {
    return <AccessFacts f={f} />
  }
  if (TIME_FIELDS.includes(field)) {
    return <TimeFacts field={field} f={f} />
  }
  return null
}
