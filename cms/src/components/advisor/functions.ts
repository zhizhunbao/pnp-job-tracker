'use client'
/**
 * advisor 域的函数:事实块的派生与行构造、面板的类名预算与浮层几何、
 * 各处流式取数与取数工厂。零 JSX 零 hook —— 排版归 tsx,状态机归 hooks,死值归 constants.ts。
 * 2026-08-28 拆域批随 JdAdvisorSection 自 components/jobs/Jd.tsx 迁入;
 * 同日换装批把 Advisor.tsx 整件重写进本桶,它的散落派生逐个落位到这里。
 *
 * ⚠️ 两条跨桶依赖,都点 components/jobs 的**文件**不走桶:extractSug(尾行建议问题的
 * ❓ 协议)与 fetchJobText(JD 正文取数的三态口径)。**行为不许复制** —— 复制一份等于
 * 给「哪一行是建议问题」「429 算不算没正文」各开一个岔;走 jobs 桶会成环
 * (jobs 的职位板反过来要本桶的两个弹框),所以点文件,与本域既有的过渡边同一处置。
 * 2026-09-28 AI 顾问卡删(Frank「AI 顾问卡删了吧」):用 extractSug 的长文打字机随之删,只剩 fetchJobText 这一条。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { fetchJobText } from '@/components/jobs/functions'
import { normName } from '@/components/pnp'
import { blockedSrc, isDirect } from '@/lib/jobs'
import { isExemptSector, lmiaWageClass } from '@/lib/lmia'
import { catName, pickName } from '@/lib/noc'
import { daysSince } from '@/lib/time'
import { track } from '@/lib/track'
import {
  ACC_UNKNOWN, AIP_ON, BAND_KEY_HIGH, BAND_KEY_LOW, BAND_KEY_MED, CARET_DOWN, CARET_RIGHT, CAT_NONE, CLS_DEPTH_BROAD,
  CLS_DEPTH_NONE, CLS_SEP, CREDENTIALS_INCLUDE, DASH, FIELD_ACCESSIBILITY, FIELD_BROAD, FIELD_COMPANY, FIELD_NOC,
  FIELD_NOC_CODE, FIELD_SALARY, FIELD_SCORE, FIELD_TEER, FIELD_VS_MEDIAN, FIELD_WAGE_MED_HR, GROUP_COMPANY,
  K_GROUP_HEAD, GROUP_SECTIONS, HDR_CONTENT_TYPE, HUNDRED, JOB_TEXT_LIMITED, K_ACC_HEAD, K_AIP_HEAD, K_BROAD_HEAD,
  K_COL_HEAD, K_ELIG_HEAD, K_ORIGIN_HEAD, K_TEER_HEAD, LAYER_CO, LAYER_JOB, LEVEL_PROVINCE, LIST_SEP, METHOD_POST,
  MIME_JSON, MONEY_HEAD, NEWLINE, PAREN_CLOSE, PAREN_OPEN, PEEK_KEY_SEP, PER_HOUR_TAIL, PER_YEAR_TAIL, PILOT_OCC_YES,
  POOL_KEY_HEAD, ROW_KEY_BROAD, ROW_KEY_NOC, ROW_KEY_NOC_TITLE, ROW_KEY_OCC, ROW_KEY_TEER, STATUS_CLOSED, STATUS_OPEN,
  TEER_HEAD, TEXT_NONE, THOUSAND, THOUSAND_TAIL, TONE_FAIL, TONE_NA, TONE_OK, TONE_WARN, TRACK_CAT_TRANSLATE,
  TRANS_ERROR, TRANS_IDLE, TRANS_LOADING, URL_API_EMPLOYERS_RETRANSLATE, URL_API_JOBS_COMPANY, URL_API_JOBS_RETRANSLATE,
  URL_API_NOC_TRANSLATE, URL_COMPANY_HEAD, URL_PAGE_FIRST, WAGE_HIGH, WAGE_LOW,
} from './constants'
import type {
  AdvisorDesigEmps, AdvisorJob, AdvisorJobIn, AdvisorNocDesc, AdvisorPillFact, AipBlockedNameIn, AipMatchIn,
  AipMatchTextIn, AipPillIn, CardHeadIn, CatTextIn, CompanyJobsJson, CompanyPeek, CompanyRefreshIn, DaysUpIn, DeadFlag,
  EsdcRowFact, FactsReadyIn, FieldFactsIn, FieldPageIn, FirstTextIn, GapClsIn, KickerIn, GroupFactsIn, HeadSubIn,
  IdRowFact, IdRowsIn, OccNameOfIn, JobRefreshIn, LmiaFeasibleFact, LmiaFeasibleIn, LoadCompanyJobsIn, LoadFn,
  LoadJobTextIn, LoadNocTransIn, ModalTitleIn, NarrowClsIn, NocFindIn, NocTransJson, TransTitleIn, OnClsIn,
  OpenCompanyFn, OpenJobFn, OriginTextIn, PairLabelIn, PeekKeyIn, PeekStackRef, PilotPillIn, PlanClbIn, RefreshFn,
  TFnJobIn, ToggleIn, TransPillIn, ZhItemsIn, ZhLabelIn,
} from './types'
import css from './advisor.module.css'

/**
 * 这一格有没有事实可铺 —— 没有就整块跳过,**绝不留孤儿小标题**(既有规范 §2「空段规则」)。
 *
 * @param x 点开的是哪一格与取数包。
 * @returns 有没有。逐格口径:
 * · score = 有通道档或有分;
 * · pnp / ee / aip / pilot 恒有 —— 未命中也要说「未命中」,那是结论不是空。
 *   (ee 见 #155 已收成一行 + 折叠;aip 是批A 修的空壳 —— 原先按「这一岗有没有 AIP」判,
 *   未命中的岗点开是整框空的,第 25 轮 AIP P3;pilot 见 E6-11,未命中给「不在试点社区」的结论行);
 * · noc / company / accessibility = 那一格有值;
 * · vsMedian = 帖面年薪或 ESDC 年薪中位有一个就能比;
 * · wageMedHr = ESDC 有中位才出那张表卡(批A:无中位 = 整卡不出);
 * · salary = 帖面原文或规范值有一个;
 * · title 与其余字段恒有。
 */
export function hasFactsOf(x: FieldFactsIn): boolean {
  const job = x.f.job
  switch (x.field) {
    case FIELD_SCORE: return job.gradeChannel != null || job.score != null
    case FIELD_NOC: return job.noc !== TEXT_NONE
    case FIELD_VS_MEDIAN: return job.salaryAnnual != null || job.wageMedAnnual != null
    case FIELD_WAGE_MED_HR: return job.wageMedHourly != null || job.wageMedAnnual != null
    case FIELD_SALARY: return job.salaryText !== TEXT_NONE || job.salary !== TEXT_NONE
    case FIELD_ACCESSIBILITY: return job.accessibility !== TEXT_NONE
    case FIELD_COMPANY: return job.company !== TEXT_NONE
    default: return true
  }
}

/**
 * 这一组要铺哪几格(明表 GROUP_SECTIONS 里那一行,再筛掉没有事实的)。
 *
 * @param x 铺哪一组与取数包。
 * @returns 字段清单;表里没有这一组时给空清单(不渲,不炸)。
 */
export function groupKeysOf(x: GroupFactsIn): string[] {
  const all = GROUP_SECTIONS[x.group]
  if (all == null) {
    return []
  }
  const keys: string[] = []
  for (const k of all) {
    if (hasFactsOf({ field: k, f: x.f })) {
      keys.push(k)
    }
  }
  return keys
}

/**
 * 一张字段卡的标题。分类卡与薪资两卡的标题**人话化**:`col.noc` 是列名「NOC」,
 * 当卡标题裸奔(#176 实测抓到);批A 薪资两卡同理 —— 帖面一张、ESDC 一张,
 * 各自说清自己装的是谁家的数。其余字段照旧复用列名。
 *
 * @param x 取词函数与这张卡装的字段。
 * @returns 卡标题。
 */
export function cardHeadOf(x: CardHeadIn): string {
  if (x.field === FIELD_NOC) {
    return x.t('grp.category')
  }
  if (x.field === FIELD_SALARY) {
    return x.t('sal.cardPosted')
  }
  if (x.field === FIELD_WAGE_MED_HR) {
    return x.t('sal.cardEsdc')
  }
  return x.t(K_COL_HEAD + x.field)
}

/**
 * 一串候选里第一个非空的文本。
 *
 * @param x 候选文本(按优先级排)。
 * @returns 第一个非空的;全空给「—」。
 */
export function firstTextOf(x: FirstTextIn): string {
  for (const s of x.list) {
    if (s !== TEXT_NONE) {
      return s
    }
  }
  return DASH
}

/**
 * 弹框页眉的灰色小标(分组名)。2026-09-23 Frank「这个地方应该是点那个省 就显示那个省」:省提名组带上本岗的省 ——
 * 「新不伦瑞克省提名(PNP)」;没有省、魁省(不参加 PNP)照旧写分组名。
 * 同日「这里面还包含了 AIP 哈 不光是 PNP」:抽选卡带 AIP 轮次的省(AIP_DRAW_PROVS)写「{省}提名(PNP)及 AIP」。
 * 2026-09-28 省提名弹框自立(Frank「pnp 弹框自己管自己」):上面两条那一支随它迁进 pnp 桶(pnpKickerOf),这里只剩分组名。
 *
 * @param x 取词函数与分组。
 * @returns 小标文字。
 */
export function kickerOf(x: KickerIn): string {
  return x.t(K_GROUP_HEAD + x.group)
}

/**
 * 弹框的大标题。E8-10 S6:页眉写**分组名**、大标题写**岗位/公司名** —— 收编前取的是
 * 被点单元格的值,于是点「通道」列开出来的弹框标题写着「技能岗」:一个胶囊的值
 * 当不了一屏内容的标题。现在:公司弹框=公司名、职位与移民弹框=岗位名,
 * 与弹框里铺开的整组事实对得上。
 *
 * @param x 铺哪一组、这一岗与调用方指定的标题。
 * @returns 大标题。
 */
export function modalTitleOf(x: ModalTitleIn): string {
  let given = TEXT_NONE
  if (x.title != null) {
    given = x.title
  }
  if (x.group === GROUP_COMPANY) {
    return firstTextOf({ list: [x.job.company, given, x.job.title] })
  }
  return firstTextOf({ list: [x.job.title, given, x.job.company] })
}

/**
 * 这一岗的 NOC 官方描述行。
 *
 * @param x 描述表与要找的五位码。
 * @returns 那一行;表里没有给 null。
 */
export function nocOf(x: NocFindIn): AdvisorNocDesc | null {
  for (const d of x.nocDesc) {
    if (d.noc === x.noc) {
      return d
    }
  }
  return null
}

/**
 * 发布渠道的显示名。渠道值是数据层写的,界面语文案表里未必配齐 ——
 * 取回来还是键本身(说明没配)时退回原值,不把 `origin.foo` 这种键摆给用户看。
 *
 * @param x 取词函数与渠道值。
 * @returns 显示名。
 */
export function originTextOf(x: OriginTextIn): string {
  const v = x.t(K_ORIGIN_HEAD + x.origin)
  if (v.startsWith(K_ORIGIN_HEAD)) {
    return x.origin
  }
  return v
}

/**
 * 年薪折成 K(读得快;年薪一律这么显示)。
 *
 * @param n 年薪。
 * @returns 「$85K」这样的文本。
 */
export function kOf(n: number): string {
  return MONEY_HEAD + String(Math.round(n / THOUSAND)) + THOUSAND_TAIL
}

/**
 * 年薪一格的完整文本。
 *
 * @param n 年薪;null = 没有。
 * @returns 「$85K/yr」;没有给空串。
 */
export function yearTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  return kOf(n) + PER_YEAR_TAIL
}

/**
 * 时薪一格的完整文本。
 *
 * @param n 时薪;null = 没有。
 * @returns 「$24/hr」;没有给空串。
 */
export function hourTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  return MONEY_HEAD + String(n) + PER_HOUR_TAIL
}

/**
 * 千位分隔的数字。
 *
 * @param n 数。
 * @returns 带千位分隔的文本。
 */
export function numOf(n: number): string {
  return Number(n).toLocaleString()
}

/**
 * 点哪一级分类字段就看到第几级(07-06 用户点名:大分类弹窗不该混进中/小分类)。
 * 2026-09-23 职业分类改两级:中 / 小两级撤,只剩大类一级。
 *
 * @param field 点开的是哪一格。
 * @returns 层级;NOC 字段给 0 —— 它要全链 + 官方职责/任职要求,不按级裁。
 */
export function clsDepthOf(field: string): number {
  if (field === FIELD_BROAD) {
    return CLS_DEPTH_BROAD
  }
  return CLS_DEPTH_NONE
}

/**
 * 同名雇主在 AIP 指定雇主名录里的命中行。命中清单**放开跨省**(原限本省):
 * 同雇主在其他大西洋省上榜 = 更强信号,一并列出。
 *
 * @param x 这一岗与名录。
 * @returns 命中行;这一岗不是 AIP 或没有公司名时给空清单。
 */
export function aipMatchesOf(x: AipMatchIn): AdvisorDesigEmps {
  const cn = normName(x.job.company)
  if (x.job.aip === false || cn === TEXT_NONE) {
    return []
  }
  const hits: AdvisorDesigEmps = []
  for (const e of x.desigEmp) {
    if (normName(e.name) === cn) {
      hits.push(e)
    }
  }
  return hits
}

/**
 * 命中雇主那一行的说明(所在地、省、科技岗标)。
 *
 * @param x 取词函数与名录里的一行。
 * @returns 顿号连起来的说明(全站禁「·」「/」杂糅,枚举一律顿号)。
 */
export function aipMatchTextOf(x: AipMatchTextIn): string {
  const parts: string[] = []
  if (x.emp.location !== TEXT_NONE) {
    parts.push(x.emp.location)
  }
  if (x.emp.province !== TEXT_NONE) {
    parts.push(x.emp.province)
  }
  if (x.emp.isTech) {
    parts.push(x.t('fact.aipTech'))
  }
  return parts.join(LIST_SEP)
}

/**
 * 省里点名不受理的那条职业叫什么(E6-09:省里逐条点名「这些职业的 AIP 背书不受理」
 * —— 与雇主是否指定雇主是两件事,两条都要说)。
 *
 * @param x 点名清单与这一岗的五位码。
 * @returns 职业名;清单里查不到名字就退回五位码(不留空)。
 */
export function aipBlockedNameOf(x: AipBlockedNameIn): string {
  for (const o of x.occupations) {
    if (o.noc === x.noc) {
      return o.name
    }
  }
  return x.noc
}

/**
 * LMIA 今天这条路通不通(E8-04:把「历史记录」升级为前瞻可行性)——
 * 按本岗高/低薪 + 豁免行业判,数据在 lib/lmia。
 *
 * @param x 取词函数与这一岗。
 * @returns 判词与色档;缺工资或够不着门槛时给 null(不猜)。
 */
export function lmiaFeasibleOf(x: LmiaFeasibleIn): LmiaFeasibleFact | null {
  const wc = lmiaWageClass({ province: x.job.province, salaryAnnual: x.job.salaryAnnual })
  if (wc === WAGE_HIGH) {
    return { cls: cssOf(css.lmiaOk), text: x.t('lmia.high') }
  }
  if (wc === WAGE_LOW && isExemptSector(x.job.noc)) {
    return { cls: cssOf(css.lmiaOk), text: x.t('lmia.exempt') }
  }
  if (wc === WAGE_LOW) {
    return { cls: cssOf(css.lmiaWarn), text: x.t('lmia.lowFrozen') }
  }
  return null
}

/**
 * 帖面年薪比 ESDC 年薪中位高/低几个百分点。
 *
 * @param x 这一岗。
 * @returns 百分点;两个数缺一个就比不了,给 null。
 */
export function vsPctOf(x: AdvisorJobIn): number | null {
  const a = x.job.salaryAnnual
  const m = x.job.wageMedAnnual
  if (a == null || m == null || m === 0) {
    return null
  }
  return Math.round((a / m - 1) * HUNDRED)
}

/**
 * ESDC 中位一格的文本:有年薪中位先给年薪,只有时薪中位就给时薪。
 *
 * @param x 这一岗。
 * @returns 中位文本;两个都没有给空串。
 */
export function medianTextOf(x: AdvisorJobIn): string {
  if (x.job.wageMedAnnual != null) {
    return yearTextOf(x.job.wageMedAnnual)
  }
  return hourTextOf(x.job.wageMedHourly)
}

/**
 * ESDC 三档工资表(Frank 2026-07-26「换算成年薪,同时显示,多一列」):
 * 三档 × 时薪 + 折算年薪两列。年薪由数据层折算(04d 时薪 × 2080,单一口径),
 * 前端只显示不换算;某档两个值都缺 = 该行不出(宁缺勿滥)。
 *
 * @param x 取词函数与这一岗。
 * @returns 逐档行。
 */
export function esdcRowsOf(x: TFnJobIn): EsdcRowFact[] {
  const bands: EsdcRowFact[] = [
    {
      key: BAND_KEY_LOW,
      label: x.t('sal.low'),
      hr: hourTextOf(x.job.wageLowHourly),
      yr: yearTextOf(x.job.wageLowAnnual),
    },
    {
      key: BAND_KEY_MED,
      label: x.t('sal.med'),
      hr: hourTextOf(x.job.wageMedHourly),
      yr: yearTextOf(x.job.wageMedAnnual),
    },
    {
      key: BAND_KEY_HIGH,
      label: x.t('sal.high'),
      hr: hourTextOf(x.job.wageHighHourly),
      yr: yearTextOf(x.job.wageHighAnnual),
    },
  ]
  const rows: EsdcRowFact[] = []
  for (const b of bands) {
    if (b.hr === TEXT_NONE && b.yr === TEXT_NONE) {
      continue
    }
    let hr = DASH
    let yr = DASH
    if (b.hr !== TEXT_NONE) {
      hr = b.hr
    }
    if (b.yr !== TEXT_NONE) {
      yr = b.yr
    }
    rows.push({ key: b.key, label: b.label, hr, yr })
  }
  return rows
}

/**
 * TEER 一格的文本:档位 + 人话说明。
 *
 * @param x 取词函数与这一岗。
 * @returns 「TEER 2(技术岗)」这样的文本;没有档位给空串。
 */
export function teerTextOf(x: TFnJobIn): string {
  if (x.job.teer == null) {
    return TEXT_NONE
  }
  const n = String(x.job.teer)
  return TEER_HEAD + n + PAREN_OPEN + x.t(K_TEER_HEAD + n) + PAREN_CLOSE
}

/**
 * 分类名的显示名:数据层写的是中文分类值,按界面语取显示列(lib/noc 单一来源)。
 * 「未分类」不是一个分类 —— 那一行整行不出,不摆上去当噪音。
 *
 * @param x 取词函数与分类值。
 * @returns 显示名;未分类或没值时给空串。
 */
export function catTextOf(x: CatTextIn): string {
  if (x.value === TEXT_NONE || x.value === CAT_NONE) {
    return TEXT_NONE
  }
  return catName({ t: x.t, value: x.value })
}

/**
 * 职业名(2026-09-23 职业分类改两级,取代 fineTextOf「小类的显示名」—— 官方层级里 36 个中类只有一个小类、两级同名时小类留空,
 * 那一套随中 / 小类一起撤):界面语言的短名,一路回退完整译名、官方英文名(lib/noc 的 pickName,与职位板「职业」下拉同一个出口)。
 *
 * @param x 这一岗的 NOC 官方描述与界面语言。
 * @returns 职业名;表里没有这一码给空串。
 */
export function occNameOf(x: OccNameOfIn): string {
  return pickName({ row: x.noc, lang: x.lang })
}

/**
 * 挂帖时长(痛点盘点 P0 零抓取项):新鲜度信号。已下架的岗不算 —— 那是「挂了多久」
 * 不是「还挂着多久」。
 *
 * @param x 这一岗与弹框打开的时刻。
 * @returns 天数;没有发布日、已下架或算不出时给 null。
 */
export function daysUpOf(x: DaysUpIn): number | null {
  if (x.job.datePosted === TEXT_NONE) {
    return null
  }
  let status = STATUS_OPEN
  if (x.job.status !== TEXT_NONE) {
    status = x.job.status
  }
  if (status === STATUS_CLOSED) {
    return null
  }
  return daysSince({ iso: x.job.datePosted, now: x.openedAt })
}

/**
 * 分类身份卡的各行(点击字段=该行高亮;NOC 与职业名同属 `noc` 字段,点 NOC 两行齐亮)。
 * 2026-09-23 职业分类改两级:中 / 小类两行撤,首行换成职业名(与职位板「职业」列同名),码那一行改叫「职业码」。
 * ⚠️ 大类这里走文案表直取(`broad.<值>`),与字段事实块里走 catName 的那一处不同 ——
 * 两处口径本来就不一样,换装批逐字保留,不顺手统一。
 * 同日 Frank 两条:「点击职业,不用都高亮吧」→ 一格点进来只亮一行(职业格亮职业行、NOC 格亮码那一行,官方职业名自成一格、
 * 不随任何一格亮;码那一行的标签与表格 NOC 列同名);「TEER 应该放到最上面吧」→ TEER 行挪到第一行。
 *
 * @param x 取词函数、这一岗与它的 NOC 官方描述。
 * @returns 身份行(值为空的那几行由渲染方筛掉)。
 */
export function idRowsOf(x: IdRowsIn): IdRowFact[] {
  let title = TEXT_NONE
  if (x.noc != null) {
    title = x.noc.title
  }
  let broad = TEXT_NONE
  if (x.job.broad !== TEXT_NONE && x.job.broad !== CAT_NONE) {
    broad = x.t(K_BROAD_HEAD + x.job.broad)
  }
  return [
    { key: ROW_KEY_TEER, field: FIELD_TEER, label: x.t('col.teer'), value: teerTextOf({ t: x.t, job: x.job }) },
    { key: ROW_KEY_OCC, field: FIELD_NOC, label: x.t('col.noc'), value: occNameOf({ noc: x.noc, lang: x.lang }) },
    { key: ROW_KEY_NOC, field: FIELD_NOC_CODE, label: x.t('col.nocCode'), value: x.job.noc },
    { key: ROW_KEY_NOC_TITLE, field: ROW_KEY_NOC_TITLE, label: x.t('fact.nocTitle'), value: title },
    { key: ROW_KEY_BROAD, field: FIELD_BROAD, label: x.t('col.broad'), value: broad },
  ]
}

/**
 * 职责/要求逐条拆行(数据层存的是一段带换行的文本)。
 *
 * @param text 全文。
 * @returns 逐条;空行剔掉。
 */
export function listItemsOf(text: string): string[] {
  const items: string[] = []
  for (const line of text.split(NEWLINE)) {
    const s = line.trim()
    if (s !== TEXT_NONE) {
      items.push(s)
    }
  }
  return items
}

/**
 * 对照译文逐条(开着对照且真翻到了才拆)。
 *
 * @param x 对照开关与译文全文。
 * @returns 逐条;不出对照时给空清单。
 */
export function zhItemsOf(x: ZhItemsIn): string[] {
  if (x.show === false || x.text === TEXT_NONE) {
    return []
  }
  return listItemsOf(x.text)
}

/**
 * 药丸钮的类名(开着的那个换蓝底蓝字)。药丸形自带一份本域的类:它压在 button 域的
 * `.btn`/`.ghost` 之上,加倍写抬权重、不赌打包顺序(先例 account 的 .logoutBtn)。
 *
 * @param x 开合。
 * @returns 类名。
 */
export function pillClsOf(x: OnClsIn): string {
  if (x.on) {
    return cssOf(css.pill) + CLS_SEP + cssOf(css.pillOn)
  }
  return cssOf(css.pill)
}

/**
 * 身份行的类名(点哪个字段哪一行亮)。
 *
 * @param x 是不是点进来的那一格。
 * @returns 类名。
 */
export function hlRowClsOf(x: OnClsIn): string {
  const base = cssOf(css.kv) + CLS_SEP + cssOf(css.hl)
  if (x.on) {
    return base + CLS_SEP + cssOf(css.kvOn)
  }
  return base
}

/**
 * 身份行标签列的类名(地点卡 64 档,分类卡 88 档)。
 *
 * @param x 窄档没有。
 * @returns 类名。
 */
export function kvKeyClsOf(x: NarrowClsIn): string {
  if (x.narrow) {
    return cssOf(css.kvK) + CLS_SEP + cssOf(css.w64)
  }
  return cssOf(css.kvK) + CLS_SEP + cssOf(css.w88)
}

/**
 * JD 摘录小标题的类名(上面有别的行时才留上距)。
 *
 * @param x 上面有没有别的行。
 * @returns 类名。
 */
export function excerptHeadClsOf(x: GapClsIn): string {
  if (x.gap) {
    return cssOf(css.excerptHead) + CLS_SEP + cssOf(css.excerptGap)
  }
  return cssOf(css.excerptHead)
}

/**
 * 同公司在榜岗的取数(E10-01 P3:blob 没了 → 打开公司弹框时按公司名现拉,
 * 不再靠父级全量列表)。带登录 cookie:按登录态给字段。
 *
 * @param x 公司名与落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadCompanyJobs(x: LoadCompanyJobsIn): LoadFn {
  return function loadCompanyJobs(flag: DeadFlag): void {
    function read(r: Response): Promise<CompanyJobsJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: CompanyJobsJson): void {
      if (flag.dead || j == null) {
        return
      }
      let rows: AdvisorJob[] = []
      if (j.rows != null) {
        rows = j.rows
      }
      x.setJobs(rows)
    }
    function fall(): void {
      return
    }
    const url = URL_API_JOBS_COMPANY + encodeURIComponent(x.company) + URL_PAGE_FIRST
    fetch(url, { credentials: CREDENTIALS_INCLUDE }).then(read).then(land).catch(fall)
  }
}

/**
 * 详情页 JD 正文的取数(取数与三态口径在 components/jobs 的 fetchJobText 一处,
 * 这里只管落格)。#201:429 = JD 宽松防滥用闸偶发 —— JD 已免费,不是付费墙,
 * 所以单独落一个「忙」的态,不谎报成「本站暂未收录正文」。
 *
 * @param x 原帖链接、中断信号与两个落格。
 * @returns 取数函数。
 */
export function makeLoadJobText(x: LoadJobTextIn): () => void {
  async function pump(): Promise<void> {
    const got = await fetchJobText({ applyUrl: x.applyUrl, id: x.id, signal: x.signal })
    if (got.status === JOB_TEXT_LIMITED) {
      x.setLimited(true)
      x.setText(TEXT_NONE)
      return
    }
    x.setText(got.text)
  }
  function fail(): void {
    if (x.signal.aborted) {
      return
    }
    x.setText(TEXT_NONE)
  }
  return function loadJobText(): void {
    pump().catch(fail)
  }
}

/**
 * 职责/要求的懒翻(首次点才调;拿到后前端存一份,切换英/中零延迟)。
 * 翻砸了落 error 态 —— 钮上说人话让人再点一次,不静默变回原样。
 *
 * @param x 五位码、界面语言与三个落格。
 * @returns 点一下就跑的取数函数。
 */
export function makeLoadNocTrans(x: LoadNocTransIn): () => void {
  async function pump(): Promise<void> {
    const res = await fetch(URL_API_NOC_TRANSLATE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ noc: x.noc, lang: x.lang }),
    })
    const d: NocTransJson = await res.json()
    if (d == null || d.ok !== true) {
      x.setStatus(TRANS_ERROR)
      return
    }
    let duties = TEXT_NONE
    let requirements = TEXT_NONE
    if (d.duties != null) {
      duties = d.duties
    }
    if (d.requirements != null) {
      requirements = d.requirements
    }
    x.setTrans({ duties, requirements })
    x.setShow(true)
    x.setStatus(TRANS_IDLE)
  }
  function fail(): void {
    x.setStatus(TRANS_ERROR)
  }
  return function loadNocTrans(): void {
    track(TRACK_CAT_TRANSLATE)
    x.setStatus(TRANS_LOADING)
    pump().catch(fail)
  }
}

/**
 * AIP 直判药丸(批A #134 三态直判,空壳修 —— 未命中也要说,是结论不是空)。
 * 省里点名不受理时一律 fail:那是官方明说的「这些岗不受理」,与雇主是不是指定雇主
 * 是两件事,两条都要说。
 *
 * @param x 取词函数、三态直判与省里点名没有。
 * @returns 药丸色档与话。
 */
export function aipPillOf(x: AipPillIn): AdvisorPillFact {
  if (x.blocked) {
    if (x.verdict === AIP_ON) {
      return { tone: TONE_FAIL, text: x.t('ch.aip.onBlocked') }
    }
    return { tone: TONE_FAIL, text: x.t('ch.aip.blocked') }
  }
  if (x.verdict === AIP_ON) {
    return { tone: TONE_OK, text: x.t(K_AIP_HEAD + x.verdict) }
  }
  return { tone: TONE_NA, text: x.t(K_AIP_HEAD + x.verdict) }
}

/**
 * 试点社区直判药丸(E6-11 三态直判:城市在 RCIP/FCIP 参与社区 = 命中,粗筛;
 * 否则「不在试点社区」)。未命中给灰不给红 —— 这条路不通不等于坏消息。
 *
 * @param x 取词函数与在不在试点社区。
 * @returns 药丸色档与话。
 */
export function pilotPillOf(x: PilotPillIn): AdvisorPillFact {
  if (x.on) {
    return { tone: TONE_OK, text: x.t('ch.pilot.on') }
  }
  return { tone: TONE_NA, text: x.t('ch.pilot.na') }
}

/**
 * 试点社区那一行的标签:有社区名用社区名,没有退回市名。
 *
 * @param x 这一岗。
 * @returns 标签。
 */
export function pilotAreaOf(x: AdvisorJobIn): string {
  if (x.job.pilotCommunity !== TEXT_NONE) {
    return x.job.pilotCommunity
  }
  return x.job.city
}

/**
 * 职业 × 社区在不在收清单(批C 尾巴)。`no` 是可写的:RCIP 制度要求 offer 职业在清单内,
 * 官方清单为据;空串 = 判不了(岗无 NOC 或清单无 NOC),照红线不硬判 —— 那时整行不出。
 *
 * @param x 取词函数与这一岗。
 * @returns 判词。
 */
export function pilotOccTextOf(x: TFnJobIn): string {
  if (x.job.pilotOcc === PILOT_OCC_YES) {
    return x.t('fact.pilotOccYes')
  }
  return x.t('fact.pilotOccNo')
}

/**
 * 担保红旗那一格(GAP1③:红旗 + JD 命中原句,可核验)。
 * 「—」的口径是**未检出**,不是「保证不担保」—— 这条写在卡下的口径注里。
 *
 * @param x 取词函数与这一岗。
 * @returns 红旗档的话;没检出给「—」。
 */
export function eligTextOf(x: TFnJobIn): string {
  if (x.job.eligibilityFlag === TEXT_NONE) {
    return DASH
  }
  return x.t(K_ELIG_HEAD + x.job.eligibilityFlag)
}

/**
 * 公司级 LMIA 获批史那一格(E6-02:ESDC 近 8 季聚合,纯事实;股别/季度语境必带)。
 *
 * @param x 取词函数与这一岗。
 * @returns 获批数与季度;没有给「—」。
 */
export function lmiaCountTextOf(x: TFnJobIn): string {
  if (x.job.lmiaPositions == null) {
    return DASH
  }
  return x.t('cell.lmiaYes', { n: x.job.lmiaPositions, q: x.job.lmiaLastQuarter })
}

/**
 * 无障碍那一格。未知时显式写「未知(帖内未写)」—— 列值的「—」会被事实行的空值守卫
 * 隐藏,那样弹框里只剩孤零零一句口径注(文案审计抓到过)。
 *
 * @param x 取词函数与这一岗。
 * @returns 无障碍的话。
 */
export function accTextOf(x: TFnJobIn): string {
  if (x.job.accessibility === TEXT_NONE || x.job.accessibility === ACC_UNKNOWN) {
    return x.t('acc.none')
  }
  return x.t(K_ACC_HEAD + x.job.accessibility)
}

/**
 * 一手/转帖那一格。
 *
 * @param x 取词函数与这一岗。
 * @returns 判词。
 */
export function directTextOf(x: TFnJobIn): string {
  if (isDirect(x.job)) {
    return x.t('fact.firstParty')
  }
  return x.t('fact.repost')
}

/**
 * 来源板那一格:显示标签优先(Job Bank 自己聚合 indeed/Talent 等 → 统一显示「Job Bank」),
 * 没有标签才退回原始板名。
 *
 * @param x 这一岗。
 * @returns 来源名;两个都没有给空串(整行不出)。
 */
export function sourceTextOf(x: AdvisorJobIn): string {
  if (x.job.sourceLabel !== TEXT_NONE) {
    return x.job.sourceLabel
  }
  return x.job.source
}

/**
 * 在招/下架那一格。
 *
 * @param x 取词函数与这一岗。
 * @returns 状态的话。
 */
export function statusTextOf(x: TFnJobIn): string {
  if (x.job.status === STATUS_CLOSED) {
    return x.t('cell.closed')
  }
  return x.t('cell.open')
}

/**
 * JD 摘录取不到正文时的那句话。空态要解释原因(第 9 轮 #26):被源站挡下的说是哪家挡的,
 * 其余说「本站暂未收录正文」。原帖链接不再内联(2026-07-11 用户指出与下方来源行重复)。
 *
 * @param x 取词函数与这一岗。
 * @returns 空态话术。
 */
export function noTextOf(x: TFnJobIn): string {
  const src = blockedSrc(x.job)
  if (src !== TEXT_NONE) {
    return x.t('act.noTextBlocked', { src })
  }
  return x.t('act.noText')
}

/**
 * 帖面薪资那一格:原文优先(原文是雇主自己写的,规范值是我们算的)。
 *
 * @param x 这一岗。
 * @returns 帖面薪资;两个都没有给空串。
 */
export function postedSalaryTextOf(x: AdvisorJobIn): string {
  if (x.job.salaryText !== TEXT_NONE) {
    return x.job.salaryText
  }
  return x.job.salary
}

/**
 * 比 ESDC 中位高/低的直判药丸。高于给绿、低于给琥珀 —— 低于是提醒不是否定
 * (中位只是中位,不是这一岗该给多少)。
 *
 * @param x 取词函数与这一岗。
 * @returns 药丸;比不了时给 null(那一行不出)。
 */
export function vsPillOf(x: TFnJobIn): AdvisorPillFact | null {
  const vs = vsPctOf({ job: x.job })
  if (vs == null) {
    return null
  }
  if (vs >= 0) {
    return { tone: TONE_OK, text: x.t('sal.above', { p: Math.abs(vs) }) }
  }
  return { tone: TONE_WARN, text: x.t('sal.below', { p: Math.abs(vs) }) }
}

/**
 * vs 中位卡的口径注:ESDC 一个中位都没有时说清「没有中位可比」——
 * 不解释就成了「我们算不出来」。
 *
 * @param x 取词函数与这一岗。
 * @returns 口径注;有中位时给空串(有值即事实,不加注)。
 */
export function medianNoteOf(x: TFnJobIn): string {
  if (x.job.wageMedHourly == null && x.job.wageMedAnnual == null) {
    return x.t('fact.noMedian')
  }
  return TEXT_NONE
}

/**
 * 事实块回来了没有。没回来不给点 AI 解读 —— 它解读的就是这些数,
 * 数还没到就生成,模型只能瞎编(advisor 路由的接地规则也拦不住没有事实的那一步)。
 *
 * @param x 层级与两级取数。
 * @returns 回来了没有。
 */
export function factsReadyOf(x: FactsReadyIn): boolean {
  if (x.level === LEVEL_PROVINCE) {
    return x.prov != null
  }
  return x.cityInfo != null
}

/**
 * 用户自报的语言档(清单里的语言门槛按它标「你够不够」)。
 *
 * @param x 分层态。
 * @returns 语言档;没填给 null(清单照列,只是不标)。
 */
export function planClbOf(x: PlanClbIn): number | null {
  if (x.plan.profile == null) {
    return null
  }
  return x.plan.profile.clb
}

/**
 * 弹框大标题下的副标:岗位名的界面语译名。公司弹框不挂
 * (2026-07-24 Frank「公司名下面的中文还是删掉」;了解公司改靠知名/政府章)。
 * 2026-07-26 Frank「所有弹框的 job 名称下面都应该有中文翻译,像点击 job 弹框一样」:与英文标题相同则不重复挂一遍
 * (原 nocZhOf 的口径:NOC 官方职业名的界面语译名)。
 * 2026-09-28 改走全站口径:职位描述弹框 09-23 起挂的是**标题译名**(Frank「统一成标题译名」「应该优先使用详情下的翻译
 * 更准吧」,jobtitle 桶 useTitleTrans),那一批漏了字段弹框(盘点实查:省提名等字段弹框标题下仍是职业名)——
 * 「像点击 job 弹框一样」这条今天才算兑现;nocZhOf 随之退役。
 *
 * @param x 分组、按岗懒翻回来的标题译名与公司别名。
 * @returns 副标;不该出时给空串。
 */
export function headSubOf(x: HeadSubIn): string {
  if (x.group === GROUP_COMPANY) {
    return x.companyAlias
  }
  return x.trans
}

/**
 * 按岗懒翻哪一个标题:公司组不翻(页眉副题是公司别名,不是岗名译名 —— 给空串 useTitleTrans 就不发请求)。
 *
 * @param x 分组与这一岗。
 * @returns 要翻的岗名;公司组给空串。
 */
export function transTitleOf(x: TransTitleIn): string {
  if (x.group === GROUP_COMPANY) {
    return TEXT_NONE
  }
  return x.job.title
}

/**
 * 中文对照钮的类名(在翻时压暗,开着时蓝底)。
 *
 * @param x 状态档与开合。
 * @returns 类名。
 */
export function transPillClsOf(x: TransPillIn): string {
  if (x.status === TRANS_LOADING) {
    return pillClsOf({ on: false }) + CLS_SEP + cssOf(css.pillBusy)
  }
  return pillClsOf({ on: x.show })
}

/**
 * 页眉中文对照开关的字:现场翻译在途给「翻译中…」,平时「中文对照」(2026-09-16)。
 *
 * @param x 取词函数与在途没。
 * @returns 开关的字。
 */
export function pairLabelOf(x: PairLabelIn): string {
  if (x.busy) {
    return x.t('cat.translating')
  }
  return x.t('cat.pair')
}

/**
 * 中文对照钮上的话(不带状态的那一处:地点弹框与字段弹框的对照钮)。
 *
 * @param x 取词函数与开合。
 * @returns 钮上的话。
 */
export function zhLabelOf(x: ZhLabelIn): string {
  if (x.show) {
    return x.t('cat.hideZh')
  }
  return x.t('cat.showZh')
}

/**
 * 折叠开关的记号。
 *
 * @param x 开合。
 * @returns 记号。
 */
export function caretOf(x: OnClsIn): string {
  if (x.on) {
    return CARET_DOWN
  }
  return CARET_RIGHT
}

/**
 * 字段弹框箭头钮的去处(2026-09-21 Frank「这个改成 箭头,点击直接跳到落地页」):只有公司组有落地页
 * (这一岗的公司页);其余组(移民、分类、地点 …)没有,照旧出全屏钮。
 *
 * @param x 铺的哪一组与这一岗的公司 slug。
 * @returns 公司页地址;没有 = ''。
 */
export function fieldPageOf(x: FieldPageIn): string {
  if (x.group !== GROUP_COMPANY) {
    return TEXT_NONE
  }
  return companyPageOf(x.slug)
}

/**
 * 公司弹框箭头钮的去处:公司页;slug 空、或是雇主池键(`n:` 开头,这家没有公司页)= 没有落地页,
 * 不出箭头、照旧出全屏钮。
 *
 * @param slug 公司弹框的 slug。
 * @returns 公司页地址;没有 = ''。
 */
export function companyPageOf(slug: string): string {
  if (slug === TEXT_NONE || slug.startsWith(POOL_KEY_HEAD)) {
    return TEXT_NONE
  }
  return URL_COMPANY_HEAD + slug
}

/**
 * 开合手柄(组件体内不许声明函数,所以开关的翻转做成工厂)。
 *
 * @param x 当前开合与落格。
 * @returns 点击手柄。
 */
export function makeToggle(x: ToggleIn): () => void {
  return function toggle(): void {
    x.set(x.on === false)
  }
}

/**
 * 职位弹框右上角刷新钮(2026-09-14 Frank「右上角加一个刷新的按钮吧」):管理员才有;点了打「重译」接口清这一岗译文与版本,
 * 成败都交回调让弹框代数加一、正文与副题重挂重翻。
 *
 * @param x 分层态、这一岗与回调。
 * @returns 点击处理;非管理员 null。
 */
export function jobRefreshOf(x: JobRefreshIn): RefreshFn | null {
  if (x.plan.isAdmin === false) {
    return null
  }
  return function refreshJob(): void {
    fetch(URL_API_JOBS_RETRANSLATE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ id: x.job.id, title: x.job.title }),
    }).then(x.onDone).catch(x.onDone)
  }
}

/**
 * 公司弹框右上角刷新钮:管理员且是公司组才有;点了清这家公司别名 / 简介译文与版本,成败都交回调重挂正文。
 *
 * @param x 分层态、分组、这一岗与回调。
 * @returns 点击处理;不出钮 null。
 */
export function companyRefreshOf(x: CompanyRefreshIn): RefreshFn | null {
  if (x.plan.isAdmin === false || x.group !== GROUP_COMPANY || x.job.company === TEXT_NONE) {
    return null
  }
  return function refreshCompany(): void {
    fetch(URL_API_EMPLOYERS_RETRANSLATE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ name: x.job.company }),
    }).then(x.onDone).catch(x.onDone)
  }
}

/**
 * 弹框栈上「叠开一条职位」的手柄(2026-09-21):职位描述弹框里点相关职位、公司弹框里点在招职位都往上叠。
 *
 * @param stack 宿主起的弹框栈。
 * @returns 手柄。
 */
export function makePushJob(stack: PeekStackRef): OpenJobFn {
  return function pushJob(j: AdvisorJob): void {
    stack.push({ kind: LAYER_JOB, job: j })
  }
}

/**
 * 弹框栈上「叠开一家公司」的手柄:职位描述弹框里点公司信息卡的公司名,公司弹框叠在职位上面。
 *
 * @param stack 宿主起的弹框栈。
 * @returns 手柄。
 */
export function makePushCo(stack: PeekStackRef): OpenCompanyFn {
  return function pushCo(co: CompanyPeek): void {
    stack.push({ kind: LAYER_CO, co })
  }
}

/**
 * 弹框栈上「同框换一家公司」的手柄:公司弹框里点相似雇主(2026-09-19 口径:不往上叠、不记历史)——
 * 只有最上面那层点得到,换最上面一层就是换它自己。
 *
 * @param stack 宿主起的弹框栈。
 * @returns 手柄。
 */
export function makeSwapCo(stack: PeekStackRef): OpenCompanyFn {
  return function swapCo(co: CompanyPeek): void {
    stack.swapTop({ kind: LAYER_CO, co })
  }
}

/**
 * 弹框栈一层的 key:位置 + 岗位号(同一位置换了一岗要重挂,弹框里的取数与译名状态才会清);
 * 公司层只按位置(同框换一家要保住浮层的位置与大小)。
 *
 * @param x 这一层与它的位置。
 * @returns key。
 */
export function peekKeyOf(x: PeekKeyIn): string {
  if (x.layer.kind === LAYER_JOB) {
    return String(x.at) + PEEK_KEY_SEP + String(x.layer.job.id)
  }
  return String(x.at) + PEEK_KEY_SEP + LAYER_CO
}
