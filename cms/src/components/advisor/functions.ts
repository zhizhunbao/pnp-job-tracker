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
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { extractSug, fetchJobText } from '@/components/jobs/functions'
import { normName, STREAM_REFORM } from '@/components/pnp'
import { blockedSrc, isDirect } from '@/lib/jobs'
import { isExemptSector, lmiaWageClass } from '@/lib/lmia'
import { parseLoc } from '@/lib/location'
import { catName, nocLocalTitle } from '@/lib/noc'
import { daysSince } from '@/lib/time'
import { track } from '@/lib/track'
import {
  ACC_UNKNOWN, ADV_DONE, ADV_ERROR, ADV_LIMITED, ADV_LOADING, ADV_STREAMING, ADV_UPGRADE, AIP_ON,
  AREA_KEY_BROADS, AREA_KEY_MED,
  AREA_KEY_NEW7D, AREA_KEY_OPEN, BAND_KEY_HIGH, BAND_KEY_LOW, BAND_KEY_MED, CAT_NONE, CK_SEP, CLS_DEPTH_BROAD,
  CLS_DEPTH_FINE, CLS_DEPTH_MID, CLS_DEPTH_NONE, CLS_SEP, CODE_TFWP, CREDENTIALS_INCLUDE, DASH, DEPTH_ADDRESS,
  DEPTH_CITY, DEPTH_COUNTRY, DEPTH_DISTRICT, DEPTH_PROVINCE, DIR_E, DIR_N, DIR_S, DIR_W, DRAW_KIND_NOTICE,
  EV_POINTER_MOVE, EV_POINTER_UP, FAC_ACTIVITY, FAC_COMP, FAC_QUOTA_TREND, FAC_SCORE_LEVEL, FIELD_ACCESSIBILITY,
  FIELD_ADDRESS, FIELD_BROAD, FIELD_CITY, FIELD_CITY_READ, FIELD_COMPANY, FIELD_COUNTRY, FIELD_DISTRICT, FIELD_FINE,
  FIELD_MID, FIELD_NOC, FIELD_PROVINCE, FIELD_PROV_READ, FIELD_SALARY, FIELD_SCORE, FIELD_TEER, FIELD_VS_MEDIAN,
  FIELD_WAGE_MED_HR, GROUP_COMPANY, GROUP_SECTIONS, HDR_CONTENT_TYPE, HDR_FREE_LEFT, HTTP_PAYMENT, HTTP_TOO_MANY,
  HUNDRED, ID_SEP, JOB_TEXT_LIMITED, K_ACC_HEAD, K_AIP_HEAD, K_BROAD_HEAD, K_COL_HEAD, K_DIFF_ACT,
  K_DIFF_ACT_OLD, K_ELIG_HEAD, K_ORIGIN_HEAD, K_TEER_HEAD, LEVEL_CITY, LEVEL_DISTRICT, LEVEL_PROVINCE,
  LIST_SEP, MAP_SEP, METHOD_POST, MIME_JSON, MONEY_HEAD, CARET_DOWN, CARET_RIGHT, CENTER_DIV, COUNTRY_CANADA,
  NEWLINE, OCC_TYPE_INELIGIBLE, PILOT_OCC_YES, PANEL_H_MIN, PANEL_POS_MIN, PANEL_W_MIN, PAREN_CLOSE, PAREN_OPEN,
  PCT_TAIL,
  PER_HOUR_TAIL, PER_YEAR_TAIL, PLUS_HEAD, PROV_QC, P_CITY, P_DISTRICT, P_PROV, ROW_KEY_BROAD, ROW_KEY_FINE,
  ROW_KEY_MID, ROW_KEY_NOC, ROW_KEY_NOC_TITLE, ROW_KEY_TEER, SPACE, STATUS_CLOSED, STATUS_OPEN, SUG_MARK,
  TEER_HEAD, TEXT_NONE, THOUSAND, THOUSAND_TAIL, TONE_FAIL, TONE_NA, TONE_OK, TONE_WARN, TRACK_CAT_TRANSLATE,
  TRANS_ERROR, TRANS_IDLE, TRANS_LOADING,
  TYPE_MIN_CHARS, TYPE_RATE_DIV, URL_API_ADVISOR, URL_API_CITY, URL_API_JOBS_COMPANY, URL_API_NOC_TRANSLATE,
  URL_API_PROVINCE, URL_PAGE_FIRST, VIEWPORT_GAP, VOL_KEY_ALLOC, VOL_KEY_IMP, VOL_KEY_PNP_PR, VOL_KEY_STUDY,
  VOL_KEY_TFWP, WAGE_HIGH, WAGE_LOW,
} from './constants'
import type {
  ActNoteIn, ActsDownIn, AdvisorCtaIn, AdvisorDesigEmps, AdvisorJob, AdvisorJobIn, AdvisorKeyIn,
  AdvisorNocDesc, AdvisorPillFact,
  AdvisorReadField, AipBlockedNameIn, AipListIn, AipMatchIn, AipMatchTextIn, AiIdIn, AllocRowIn, AreaRowsIn,
  AipPillIn, CardHeadIn, CatTextIn, CenterPosIn, CityJson, CompanyJobsJson, DaysUpIn, DeadFlag, DiffCellFact,
  DiffCellsIn, FactsReadyIn, FullTitleIn, HasDrawsIn, HasNewsIn, HeadSubIn, LocNoteIn, PanelClsIn, PilotPillIn,
  PlanClbIn, ToggleIn, TransLabelIn, TransPillIn, ZhLabelIn,
  DiffFactor, DiffFactorIn, DragStartIn, DrainStreamIn, EsdcRowFact, FieldFactsIn, FirstTextIn, GapClsIn,
  GroupFactsIn, HeadClsIn, IdRowFact, IdRowsIn, JdBodyClsIn, KvFact, LevelIn, LmiaFeasibleFact, LmiaFeasibleIn,
  LoadCityIn, LoadCompanyJobsIn, LoadFn, LoadJobTextIn, LoadNocTransIn, LoadProvIn, LocRowFact, LocationLevel,
  MapQueryIn, ModalTitleIn, NarrowClsIn, NocFindIn, NocTransJson, NocZhIn, OnClsIn, OriginTextIn, PanelPos,
  PanelStyleIn, PointerHandlerFn, PrefFact, PrefJson, ProvJson, ProvStreamsIn, ResizeNextIn, ResizeNextOut,
  ResizeStartIn, RunAiReadIn, RunLongIn, SavePrefIn, StreamAdvisorIn, StreamAdvisorOut, TFnJobIn, TransJobIn,
  TypewriterIn, VolRowFact, VolRowsIn, ZhItemsIn,
} from './types'
import { CACHE } from './variables'
import css from './advisor.module.css'

/**
 * 缓存键:一岗一档各存一份。
 *
 * @param x 生成哪一种与这一岗的号。
 * @returns 缓存键。
 */
export function advisorKeyOf(x: AdvisorKeyIn): string {
  return x.field + CK_SEP + String(x.id)
}

/**
 * 流式取一段初判。额度闸照走:402 → 升级卡,429 → 打码 + 锁行说人话(#175:黄条退役),
 * 其它非 2xx 或读流出错 → 可重试的失败态。
 * 尾行建议问题不在内嵌区展示(追问在完整弹框),所以落定前先摘掉。
 *
 * @param x 这一岗、界面语言、档、中断信号与两个回传。
 * @returns 落定的状态与正文。
 */
export async function streamAdvisor(x: StreamAdvisorIn): Promise<StreamAdvisorOut> {
  const res = await fetch(URL_API_ADVISOR, {
    method: METHOD_POST,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    signal: x.signal,
    body: JSON.stringify({ field: x.field, id: String(x.job.id), lang: x.lang }),
  })
  const left = res.headers.get(HDR_FREE_LEFT)
  if (left != null) {
    x.onFreeLeft(Number(left))
  }
  if (res.status === HTTP_PAYMENT) {
    return { status: ADV_UPGRADE, body: TEXT_NONE }
  }
  if (res.status === HTTP_TOO_MANY) {
    return { status: ADV_LIMITED, body: TEXT_NONE }
  }
  if (res.ok === false || res.body == null) {
    return { status: ADV_ERROR, body: TEXT_NONE }
  }
  const acc = await drainStream({ body: res.body, onChunk: x.onChunk })
  const got = extractSug(acc, x.job.company, x.lang)
  CACHE.jdAdvisor.set(String(x.job.id), got.body)
  return { status: ADV_DONE, body: got.body }
}

/**
 * 把流读干净,每读到一段就回一次(打字机)。
 *
 * @param x 响应体与逐段回调。
 * @returns 读完的全文。
 */
async function drainStream(x: DrainStreamIn): Promise<string> {
  const reader = x.body.getReader()
  const dec = new TextDecoder()
  let acc = TEXT_NONE
  for (;;) {
    const got = await reader.read()
    if (got.done) {
      return acc
    }
    acc = acc + dec.decode(got.value, { stream: true })
    x.onChunk(acc)
  }
}

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
 * 岗位名下挂的界面语译名(Frank 2026-07-26「所有弹框的 job 名称下面都应该有中文翻译,
 * 像点击 job 弹框一样」)。与英文标题相同则不重复挂一遍;公司弹框不挂
 * —— 公司名没有译名(2026-07-24 Frank「公司名下面的中文还是删掉」)。
 *
 * @param x 描述表、五位码、界面语言与岗位名。
 * @returns 译名;不该出时给空串。
 */
export function nocZhOf(x: NocZhIn): string {
  const zh = nocLocalTitle({ row: nocOf({ nocDesc: x.nocDesc, noc: x.noc }), lang: x.lang })
  if (zh === TEXT_NONE) {
    return TEXT_NONE
  }
  if (zh.toLowerCase() === x.title.toLowerCase()) {
    return TEXT_NONE
  }
  return zh
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
 * 同比小数折成百分比(正数补加号,负号数字自带)。
 *
 * @param v 同比小数。
 * @returns 「+12%」这样的文本。
 */
export function pctOf(v: number): string {
  let head = TEXT_NONE
  if (v > 0) {
    head = PLUS_HEAD
  }
  return head + String(Math.round(v * HUNDRED)) + PCT_TAIL
}

/**
 * 点哪一级地点字段就看到第几级(含上级路径,07-06 用户拍板)。
 *
 * @param field 点开的是哪一格。
 * @returns 层级;不是地点字段时按最深一级算(与原表同口径)。
 */
export function locDepthOf(field: string): number {
  if (field === FIELD_COUNTRY) {
    return DEPTH_COUNTRY
  }
  if (field === FIELD_PROVINCE) {
    return DEPTH_PROVINCE
  }
  if (field === FIELD_CITY) {
    return DEPTH_CITY
  }
  if (field === FIELD_DISTRICT) {
    return DEPTH_DISTRICT
  }
  return DEPTH_ADDRESS
}

/**
 * 点哪一级分类字段就看到第几级(07-06 用户点名:大分类弹窗不该混进中/小分类)。
 *
 * @param field 点开的是哪一格。
 * @returns 层级;NOC 字段给 0 —— 它要全链 + 官方职责/任职要求,不按级裁。
 */
export function clsDepthOf(field: string): number {
  if (field === FIELD_BROAD) {
    return CLS_DEPTH_BROAD
  }
  if (field === FIELD_MID) {
    return CLS_DEPTH_MID
  }
  if (field === FIELD_FINE) {
    return CLS_DEPTH_FINE
  }
  return CLS_DEPTH_NONE
}

/**
 * 地图查询词:按所看层级拼(点省=省的地图,不带街址)。
 *
 * @param x 这一岗与看到第几级。
 * @returns 查询词;一级都拼不出时给空串(那时地图行整行不出)。
 */
export function mapQueryOf(x: MapQueryIn): string {
  const loc = parseLoc(x.job)
  const parts: string[] = []
  if (x.depth >= DEPTH_ADDRESS && x.job.address !== TEXT_NONE) {
    parts.push(x.job.address)
  }
  if (x.depth >= DEPTH_DISTRICT && loc.district !== TEXT_NONE) {
    parts.push(loc.district)
  }
  if (x.depth >= DEPTH_CITY && loc.city !== TEXT_NONE) {
    parts.push(loc.city)
  }
  if (x.depth >= DEPTH_PROVINCE && loc.prov !== TEXT_NONE) {
    parts.push(loc.prov)
  }
  return parts.join(MAP_SEP)
}

/**
 * 该省的具名通道数(用户拍板:每字段要有料 —— 点「省」要给移民视角的高价值内容,
 * 数据已有,复用)。排除清单不算通道,QC 走自己的体系不属 PNP。
 *
 * @param x 点开的是哪一格、这一岗与省提名职业清单。
 * @returns 通道数;不该算时给 0。
 */
export function provStreamsOf(x: ProvStreamsIn): number {
  if (x.field !== FIELD_PROVINCE || x.job.province === TEXT_NONE || x.job.province === PROV_QC) {
    return 0
  }
  const labels = new Set<string>()
  for (const o of x.pnpOcc) {
    if (o.province === x.job.province && o.type !== OCC_TYPE_INELIGIBLE) {
      labels.add(o.label)
    }
  }
  return labels.size
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
 * 小类的显示名。官方层级里有 36 个中类只有一个小类(两级同名)——
 * 那时小类不再重复一遍,留空。
 *
 * @param x 取词函数与这一岗。
 * @returns 显示名;与中类同名或未分类时给空串。
 */
export function fineTextOf(x: TransJobIn): string {
  if (x.job.fine === x.job.mid) {
    return TEXT_NONE
  }
  return catTextOf({ t: x.t, value: x.job.fine })
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
 * ⚠️ 大类这里走文案表直取(`broad.<值>`),与字段事实块里走 catName 的那一处不同 ——
 * 两处口径本来就不一样,换装批逐字保留,不顺手统一。
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
    { key: ROW_KEY_NOC, field: FIELD_NOC, label: x.t('col.noc'), value: x.job.noc },
    { key: ROW_KEY_NOC_TITLE, field: FIELD_NOC, label: x.t('fact.nocTitle'), value: title },
    { key: ROW_KEY_TEER, field: FIELD_TEER, label: x.t('col.teer'), value: teerTextOf({ t: x.t, job: x.job }) },
    { key: ROW_KEY_BROAD, field: FIELD_BROAD, label: x.t('col.broad'), value: broad },
    { key: ROW_KEY_MID, field: FIELD_MID, label: x.t('col.mid'), value: catTextOf({ t: x.t, value: x.job.mid }) },
    { key: ROW_KEY_FINE, field: FIELD_FINE, label: x.t('col.fine'), value: fineTextOf({ t: x.t, job: x.job }) },
  ]
}

/**
 * 地点卡的各行(与分类卡同款:点进来的那一格该行高亮)。有值行的值文字 = 地图链接,
 * 与表格格同一规则;国家那行不做链接。
 *
 * @param x 取词函数与这一岗。
 * @returns 地点行(值为空的那几行由渲染方筛掉)。
 */
export function locRowsOf(x: TFnJobIn): LocRowFact[] {
  const loc = parseLoc(x.job)
  return [
    { key: FIELD_COUNTRY, field: FIELD_COUNTRY, label: x.t('col.country'), value: loc.country, map: false },
    { key: FIELD_PROVINCE, field: FIELD_PROVINCE, label: x.t('col.province'), value: loc.prov, map: true },
    { key: FIELD_CITY, field: FIELD_CITY, label: x.t('col.city'), value: loc.city, map: true },
    { key: FIELD_DISTRICT, field: FIELD_DISTRICT, label: x.t('col.district'), value: loc.district, map: true },
    { key: FIELD_ADDRESS, field: FIELD_ADDRESS, label: x.t('col.address'), value: x.job.address, map: true },
  ]
}

/**
 * 挑出某一个难度因子。
 *
 * @param x 逐因子与要哪一个。
 * @returns 那一个;没有给 null。
 */
export function diffFactorOf(x: DiffFactorIn): DiffFactor | null {
  if (x.factors == null) {
    return null
  }
  for (const f of x.factors) {
    if (f.key === x.key) {
      return f
    }
  }
  return null
}

/**
 * 近 180 天邀请那一格该挂哪条口径注。改制省(ON)近 180 天的抽选可能全在改制之前 ——
 * 不加注就与下方「旧 8 条流已关闭」自相矛盾。判定走同一份抽选记录:
 * 改制日之后一条真抽选都没有才加「旧流」注,新 EOI 一开抽注自动消失。
 *
 * @param x 省码与各省抽选记录。
 * @returns 口径注的文案键。
 */
export function actNoteKeyOf(x: ActNoteIn): string {
  const reform = STREAM_REFORM[x.province]
  if (reform == null) {
    return K_DIFF_ACT
  }
  for (const d of x.pnpDraws) {
    if (d.province === x.province && d.kind !== DRAW_KIND_NOTICE && d.drawDate >= reform.since) {
      return K_DIFF_ACT
    }
  }
  return K_DIFF_ACT_OLD
}

/**
 * 移民难度卡的三列格(Frank 2026-07-26 走查:标签 | 值 | 注 跨行对齐,每列左对齐
 * —— 原来一行一整句,读不快也对不齐)。Frank 走查#3:「口径:竞争基数=…」整句删
 * (粗口径已在数字旁,长解释=废话)。
 *
 * @param x 取词函数、省码、逐因子与各省抽选记录。
 * @returns 有数的那几格。
 */
export function diffCellsOf(x: DiffCellsIn): DiffCellFact[] {
  const cells: DiffCellFact[] = []
  const comp = diffFactorOf({ factors: x.factors, key: FAC_COMP })
  if (comp != null) {
    let asOf = TEXT_NONE
    if (comp.asOf != null) {
      asOf = comp.asOf
    }
    const note = x.t('diff.compNote', { pool: numOf(comp.pool), quota: numOf(comp.quota), y: comp.quotaYear, py: asOf })
    cells.push({ key: FAC_COMP, label: x.t('diff.k.comp'), value: x.t('diff.v.comp', { v: comp.value }), note })
  }
  const trend = diffFactorOf({ factors: x.factors, key: FAC_QUOTA_TREND })
  if (trend != null) {
    cells.push({ key: FAC_QUOTA_TREND, label: x.t('diff.k.trend'), value: pctOf(trend.value), note: TEXT_NONE })
  }
  const act = diffFactorOf({ factors: x.factors, key: FAC_ACTIVITY })
  if (act != null) {
    const key = actNoteKeyOf({ province: x.province, pnpDraws: x.pnpDraws })
    cells.push({
      key: FAC_ACTIVITY,
      label: x.t('diff.k.act'),
      value: x.t('diff.v.act', { n: act.value }),
      note: x.t(key, { m: numOf(act.invitations) }),
    })
  }
  const score = diffFactorOf({ factors: x.factors, key: FAC_SCORE_LEVEL })
  if (score != null) {
    let scale = DASH
    if (score.scale !== TEXT_NONE) {
      scale = score.scale
    }
    cells.push({
      key: FAC_SCORE_LEVEL,
      label: x.t('diff.k.score'),
      value: x.t('diff.v.score', { s: score.latestScore }),
      note: x.t('diff.n.score', { p: score.value, sc: scale }),
    })
  }
  return cells
}

/**
 * 省级体量卡的各行(人话名主文案 + 代码灰字小注:Frank「TFWP/IMP 用户都不知道是什么」)。
 * 配额与 PNP 落地两行只给非 QC —— 魁省走自己的体系,摆配额是答非所问。
 *
 * @param x 取词函数、体量事实与是不是魁北克。
 * @returns 有数的那几行。
 */
export function volRowsOf(x: VolRowsIn): VolRowFact[] {
  const rows: VolRowFact[] = []
  const info = x.info
  if (info == null) {
    return rows
  }
  if (info.study != null) {
    const note = x.t('loc.asOf', { y: info.study.year })
    rows.push({ key: VOL_KEY_STUDY, label: x.t('loc.study'), code: TEXT_NONE, value: numOf(info.study.n), note })
  }
  if (info.tfwp != null) {
    const note = x.t('loc.asOf', { y: info.tfwp.year })
    rows.push({ key: VOL_KEY_TFWP, label: x.t('loc.tfwp'), code: CODE_TFWP, value: numOf(info.tfwp.n), note })
  }
  if (info.imp != null) {
    const note = x.t('loc.asOf', { y: info.imp.year })
    rows.push({ key: VOL_KEY_IMP, label: x.t('loc.imp'), code: x.t('loc.impNote'), value: numOf(info.imp.n), note })
  }
  if (x.isQc === false && info.alloc != null) {
    const alloc = allocRowOf({ t: x.t, alloc: info.alloc })
    if (alloc != null) {
      rows.push(alloc)
    }
  }
  if (x.isQc === false && info.pnpPr != null) {
    const note = x.t('loc.prNote', { y: info.pnpPr.year })
    rows.push({ key: VOL_KEY_PNP_PR, label: x.t('loc.pnpPr'), code: TEXT_NONE, value: numOf(info.pnpPr.n), note })
  }
  return rows
}

/**
 * 提名配额那一行:有 2026 就报 2026(两年都有时注里带上 2025 作对比),
 * 只有 2025 就报 2025 并在注里说清是哪一年 —— 年份说错等于报了个假配额。
 *
 * @param x 取词函数与两年的配额。
 * @returns 配额行;两年都没公布时给 null(整行不出)。
 */
export function allocRowOf(x: AllocRowIn): VolRowFact | null {
  const label = x.t('loc.alloc')
  const a = x.alloc
  if (a.y2026 != null) {
    let note = x.t('loc.allocY26')
    if (a.y2025 != null) {
      note = x.t('loc.allocBoth', { b: numOf(a.y2025) })
    }
    return { key: VOL_KEY_ALLOC, label, code: TEXT_NONE, value: numOf(a.y2026), note }
  }
  if (a.y2025 != null) {
    return { key: VOL_KEY_ALLOC, label, code: TEXT_NONE, value: numOf(a.y2025), note: x.t('loc.allocY25') }
  }
  return null
}

/**
 * 市/区体量卡的各行(本站口径,`/api/jobs/city` 现算)。中位薪资样本不够时那一行不出
 * —— 宁可留空也不拿几个样本冒充中位。
 *
 * @param x 取词函数与体量四格。
 * @returns 体量行。
 */
export function areaRowsOf(x: AreaRowsIn): KvFact[] {
  const rows: KvFact[] = [
    { key: AREA_KEY_OPEN, label: x.t('loc.openJobs'), value: numOf(x.stats.openJobs) },
    { key: AREA_KEY_NEW7D, label: x.t('loc.new7d'), value: numOf(x.stats.new7d) },
  ]
  if (x.stats.medSalary != null) {
    rows.push({ key: AREA_KEY_MED, label: x.t('loc.medSal'), value: yearTextOf(x.stats.medSalary) })
  }
  if (x.stats.topBroads.length > 0) {
    const parts: string[] = []
    for (const b of x.stats.topBroads) {
      parts.push(x.t(K_BROAD_HEAD + b.broad) + SPACE + numOf(b.n))
    }
    rows.push({ key: AREA_KEY_BROADS, label: x.t('loc.topBroads'), value: parts.join(LIST_SEP) })
  }
  return rows
}

/**
 * 本市的 AIP 指定雇主(Frank 走查#7:AIP 卡直接内联列出名单,不再「雇主名录 →」点过去)。
 * 客户端筛已加载的名录,口径对齐后端(province + location 含 city)。
 *
 * @param x 名录与这一岗。
 * @returns 本市的指定雇主。
 */
export function aipListOf(x: AipListIn): AdvisorDesigEmps {
  const city = x.job.city.toLowerCase()
  const hits: AdvisorDesigEmps = []
  for (const e of x.desigEmp) {
    if (e.province === x.job.province && e.location.toLowerCase().includes(city)) {
      hits.push(e)
    }
  }
  return hits
}

/**
 * 地点面板看哪一级:入口语义=内容(Frank「点省看省,点市看市」+「点区看区」)。
 * 区列点开但该岗无区值 → 退回市级,不出空面板。
 *
 * @param x 点进来的那一格与这一岗的区名。
 * @returns 层级。
 */
export function levelOf(x: LevelIn): LocationLevel {
  if (x.srcField === FIELD_PROVINCE) {
    return LEVEL_PROVINCE
  }
  if (x.srcField === FIELD_DISTRICT && x.district !== TEXT_NONE) {
    return LEVEL_DISTRICT
  }
  return LEVEL_CITY
}

/**
 * 地点 AI 解读生成哪一种。
 *
 * @param level 看的是哪一级(市与区共用市级那一档)。
 * @returns 档名。
 */
export function aiFieldOf(level: LocationLevel): AdvisorReadField {
  if (level === LEVEL_PROVINCE) {
    return FIELD_PROV_READ
  }
  return FIELD_CITY_READ
}

/**
 * 地点 AI 解读拿什么当主体:省级给省码,市/区级给「市|省|区」拼串
 * (2026-08-23 契约换 id 制:事实块由服务端用面板同一取数函数重建 provFactsOf/cityFactsOf)。
 *
 * @param x 层级、这一岗与市区名。
 * @returns 主体标识。
 */
export function aiIdOf(x: AiIdIn): string {
  if (x.level === LEVEL_PROVINCE) {
    return x.job.province
  }
  let district = TEXT_NONE
  if (x.level === LEVEL_DISTRICT) {
    district = x.district
  }
  return [x.city, x.job.province, district].join(ID_SEP)
}

/**
 * 摘掉尾行建议问题之后的正文(建议问题不在这类速读区展示,追问在完整弹框里)。
 *
 * @param text 模型吐出来的全文。
 * @returns 正文。
 */
export function cutSugOf(text: string): string {
  const cut = text.indexOf(SUG_MARK)
  if (cut < 0) {
    return text
  }
  return text.slice(0, cut)
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
 * 浮层标题栏的类名(紧凑档 = 职位描述弹框;全屏时不给拖动光标 —— 全屏拖不动)。
 *
 * @param x 全屏态与紧凑档。
 * @returns 类名。
 */
export function panelHeadClsOf(x: HeadClsIn): string {
  const cls = [cssOf(css.panelHead)]
  if (x.tight) {
    cls.push(cssOf(css.panelHeadTight))
  }
  if (x.full) {
    cls.push(cssOf(css.panelHeadFull))
  }
  return cls.join(CLS_SEP)
}

/**
 * 浮层正文的类名(JD 档:整栏读正文,字号大一档、底衬归零让投递栏贴底)。
 * 2026-07-25 用户「穿墙」:底部原 20px 内衬在 sticky 投递栏下方留缝,滚动到底
 * JD 从缝里透出卡片圆角外 → 底内衬归 0,底部留白改由投递栏自带。
 *
 * @param x 走不走 JD 档。
 * @returns 类名。
 */
export function panelBodyClsOf(x: JdBodyClsIn): string {
  if (x.jd) {
    return cssOf(css.panelBody) + CLS_SEP + cssOf(css.panelBodyJd)
  }
  return cssOf(css.panelBody)
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
 * 八向拉伸手柄的类名(边距与光标是**样式**,按方向查表)。
 *
 * @param dir 方向名。
 * @returns 类名;方向名不认识时只给手柄底座(不炸)。
 */
export function edgeClsOf(dir: string): string {
  const map: Record<string, string> = {
    n: cssOf(css.edgeN),
    s: cssOf(css.edgeS),
    w: cssOf(css.edgeW),
    e: cssOf(css.edgeE),
    nw: cssOf(css.edgeNw),
    ne: cssOf(css.edgeNe),
    sw: cssOf(css.edgeSw),
    se: cssOf(css.edgeSe),
  }
  const hit = map[dir]
  if (hit == null) {
    return cssOf(css.handle)
  }
  return cssOf(css.handle) + CLS_SEP + hit
}

/**
 * 移民难度档的色档类名(与 /stats 的难度卡同源色阶)。
 *
 * @param tier 难度档。
 * @returns 类名;档位不认识时只给药丸底座。
 */
export function diffToneClsOf(tier: string): string {
  const map: Record<string, string> = {
    easy: cssOf(css.diffEasy),
    mid: cssOf(css.diffMid),
    tight: cssOf(css.diffTight),
  }
  const hit = map[tier]
  if (hit == null) {
    return cssOf(css.diff)
  }
  return cssOf(css.diff) + CLS_SEP + hit
}

/**
 * 浮层的运行时几何。位置与尺寸是**每帧连续变化的像素**,类是有限枚举装不下它
 * (全屏那一档没有这种像素,样式全在 .panelFull 里,所以返回空对象)。
 *
 * @param x 全屏态、位置与尺寸。
 * @returns 浮层的 style。
 */
export function panelStyleOf(x: PanelStyleIn): React.CSSProperties {
  if (x.full) {
    return {}
  }
  return { left: x.pos.x, top: x.pos.y, width: x.size.w, height: x.size.h }
}

/**
 * 按尺寸算居中位。先从视口里扣掉边缘留白再居中,并给左上角兜一个最小坐标 ——
 * 否则窗口比浮层还小时标题栏会被顶出屏外,拖都拖不回来。
 *
 * @param x 浮层宽高。
 * @returns 左上角坐标。
 */
export function centerPosOf(x: CenterPosIn): PanelPos {
  const w = Math.min(x.w, window.innerWidth - VIEWPORT_GAP)
  const h = Math.min(x.h, window.innerHeight - VIEWPORT_GAP)
  return {
    x: Math.max(PANEL_POS_MIN, (window.innerWidth - w) / CENTER_DIV),
    y: Math.max(PANEL_POS_MIN, (window.innerHeight - h) / CENTER_DIV),
  }
}

/**
 * 读浮层记忆。
 *
 * @param key 记忆键。
 * @returns 记忆。读不到、存的不是 JSON、浏览器禁了本地存储时给空记忆
 * —— 记忆是锦上添花,拿不到就用默认尺寸,不该连累弹框打不开。
 */
export function readPrefOf(key: string): PrefFact {
  const empty: PrefFact = { full: false, w: null, h: null }
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) {
      return empty
    }
    const p: PrefJson = JSON.parse(raw)
    let w: number | null = null
    let h: number | null = null
    if (p.w != null && p.h != null) {
      w = p.w
      h = p.h
    }
    return { full: p.full === true, w, h }
  } catch {
    return empty
  }
}

/**
 * 写浮层记忆(与已存的合并后写回 —— 只改这次动过的那几格)。
 *
 * @param x 记忆键与这次要改的格。
 * @returns 无。浏览器禁了本地存储时静默作罢,同上:记不住尺寸不影响用。
 */
export function savePrefOf(x: SavePrefIn): void {
  const old = readPrefOf(x.key)
  let full = old.full
  let w = old.w
  let h = old.h
  if (x.patch.full != null) {
    full = x.patch.full
  }
  if (x.patch.w != null) {
    w = x.patch.w
  }
  if (x.patch.h != null) {
    h = x.patch.h
  }
  try {
    localStorage.setItem(x.key, JSON.stringify({ full, w, h }))
  } catch {
    return
  }
}

/**
 * 一帧拉伸的算式:东/南向只改尺寸(右下边跟手),西/北向改尺寸的同时挪左上角
 * (左上边跟手、右下边钉住)。到了最小尺寸就钉住 —— 西/北向此时要把左上角
 * 反推回去,不然会出现「拉不动了但框还在飘」。
 *
 * @param x 方向、位移与起手时的尺寸位置。
 * @returns 这一帧的尺寸与位置。
 */
export function resizeNextOf(x: ResizeNextIn): ResizeNextOut {
  let w = x.size.w
  let h = x.size.h
  let px = x.pos.x
  let py = x.pos.y
  if (x.dir.includes(DIR_E)) {
    w = x.size.w + x.dx
  }
  if (x.dir.includes(DIR_S)) {
    h = x.size.h + x.dy
  }
  if (x.dir.includes(DIR_W)) {
    w = x.size.w - x.dx
    px = x.pos.x + x.dx
  }
  if (x.dir.includes(DIR_N)) {
    h = x.size.h - x.dy
    py = x.pos.y + x.dy
  }
  if (w < PANEL_W_MIN) {
    if (x.dir.includes(DIR_W)) {
      px = x.pos.x + x.size.w - PANEL_W_MIN
    }
    w = PANEL_W_MIN
  }
  if (h < PANEL_H_MIN) {
    if (x.dir.includes(DIR_N)) {
      py = x.pos.y + x.size.h - PANEL_H_MIN
    }
    h = PANEL_H_MIN
  }
  return { size: { w, h }, pos: { x: px, y: py } }
}

/**
 * 标题栏拖动的起手手柄(原生 pointer 事件,无依赖)。
 *
 * @param x 全屏态、当前位置与位置落格。
 * @returns 按下手柄。
 */
export function makeDragStart(x: DragStartIn): PointerHandlerFn {
  return function startDrag(e: React.PointerEvent): void {
    if (x.full) {
      return
    }
    e.preventDefault()
    const ox = e.clientX - x.pos.x
    const oy = e.clientY - x.pos.y
    function move(ev: PointerEvent): void {
      x.setPos({ x: ev.clientX - ox, y: ev.clientY - oy })
    }
    function up(): void {
      window.removeEventListener(EV_POINTER_MOVE, move)
      window.removeEventListener(EV_POINTER_UP, up)
    }
    window.addEventListener(EV_POINTER_MOVE, move)
    window.addEventListener(EV_POINTER_UP, up)
  }
}

/**
 * 八向拉伸的起手手柄(用户点名:上下左右都可放大缩小)。松手时把尺寸写进记忆 ——
 * 读的是镜像格不是 state:闭包里的 state 停在按下那一刻,写回去就把整段拉伸丢了。
 *
 * @param x 全屏态、记忆键、当前尺寸位置、镜像格、两个落格与方向。
 * @returns 按下手柄。
 */
export function makeResizeStart(x: ResizeStartIn): PointerHandlerFn {
  return function startResize(e: React.PointerEvent): void {
    if (x.full) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const sx = e.clientX
    const sy = e.clientY
    const size = x.size
    const pos = x.pos
    x.sizeRef.current = size
    function move(ev: PointerEvent): void {
      const next = resizeNextOf({ dir: x.dir, dx: ev.clientX - sx, dy: ev.clientY - sy, size, pos })
      x.sizeRef.current = next.size
      x.setSize(next.size)
      x.setPos(next.pos)
    }
    function up(): void {
      savePrefOf({ key: x.prefKey, patch: { full: null, w: x.sizeRef.current.w, h: x.sizeRef.current.h } })
      window.removeEventListener(EV_POINTER_MOVE, move)
      window.removeEventListener(EV_POINTER_UP, up)
    }
    window.addEventListener(EV_POINTER_MOVE, move)
    window.addEventListener(EV_POINTER_UP, up)
  }
}

/**
 * 点了才生成的那类 AI 段的取数(分类速读 / 地点解读同一台机器)。复用顾问免费额度池,
 * 服务端按 id 现查事实块并禁模型越出(advisor 路由的 GROUNDING_RULES)。
 * 额度闸照走:402 → 升级卡,429 → 打码 + 锁行,其它非 2xx 或读流出错 → 说人话的失败态。
 *
 * @param x 档、主体标识、界面语言与两个落格。
 * @returns 点一下就跑的取数函数。
 */
export function makeRunAiRead(x: RunAiReadIn): () => void {
  async function pump(): Promise<void> {
    const res = await fetch(URL_API_ADVISOR, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ field: x.field, id: x.id, lang: x.lang }),
    })
    if (res.status === HTTP_PAYMENT) {
      x.setStatus(ADV_UPGRADE)
      return
    }
    if (res.status === HTTP_TOO_MANY) {
      x.setStatus(ADV_LIMITED)
      return
    }
    if (res.ok === false || res.body == null) {
      x.setStatus(ADV_ERROR)
      return
    }
    x.setStatus(ADV_STREAMING)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let acc = TEXT_NONE
    for (;;) {
      const got = await reader.read()
      if (got.done) {
        x.setStatus(ADV_DONE)
        return
      }
      acc = acc + dec.decode(got.value, { stream: true })
      x.setText(acc)
    }
  }
  function fail(): void {
    x.setStatus(ADV_ERROR)
  }
  return function runAiRead(): void {
    x.setStatus(ADV_LOADING)
    x.setText(TEXT_NONE)
    pump().catch(fail)
  }
}

/**
 * 移民组顾问长文的取数(唯一真在流式生成顾问内容的那一处)。网络块先进打字机队列
 * 不直接上屏 —— 用户拍板:AI 内容必须流式感,不许整段蹦出来。
 * 额度闸三态分明:402 = 免费试用用完(E3-05)→ 升级卡;429 = 匿名 IP 限/日上限
 * (第 9 轮 #25:说人话 + 给出路,不甩状态码);其它非 2xx = 取数失败。
 *
 * @param x 分组、这一岗、界面语言、中断信号、两句失败话术、三个落格与两个镜像格。
 * @returns 跑一次生成的函数。
 */
export function makeRunLongAdvisor(x: RunLongIn): () => void {
  async function pump(): Promise<void> {
    const res = await fetch(URL_API_ADVISOR, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      signal: x.signal,
      body: JSON.stringify({ field: x.group, id: String(x.job.id), lang: x.lang }),
    })
    const left = res.headers.get(HDR_FREE_LEFT)
    if (left != null) {
      x.setFreeLeft(Number(left))
    }
    if (res.status === HTTP_PAYMENT) {
      x.setStatus(ADV_UPGRADE)
      return
    }
    if (res.status === HTTP_TOO_MANY) {
      x.setStatus(ADV_LIMITED)
      return
    }
    if (res.ok === false || res.body == null) {
      x.setStatus(ADV_ERROR)
      x.setText(x.unavailText)
      return
    }
    x.setStatus(ADV_STREAMING)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    for (;;) {
      const got = await reader.read()
      if (got.done) {
        x.done.current = true
        return
      }
      x.pending.current = x.pending.current + dec.decode(got.value, { stream: true })
    }
  }
  function fail(): void {
    if (x.signal.aborted) {
      return
    }
    x.pending.current = TEXT_NONE
    x.setStatus(ADV_ERROR)
    x.setText(x.offlineText)
  }
  return function runLong(): void {
    pump().catch(fail)
  }
}

/**
 * 打字机走一帧。吐字速率与积压成正比(每帧 1/12),整段大文本几秒内追平,不会无限拖尾
 * —— 覆盖三种「整段到达」场景:公司初判 web_fetch 工具阶段后快速吐完、服务端缓存命中、
 * 代理缓冲。❓ 标记之后的内容截住不吐(建议行不进正文);流读完且积压吐尽时,
 * 对完整回复统一摘一次建议问题(含无标记兜底)。
 *
 * @param x 三个镜像格、三个落格与摘建议要的雇主名与界面语言。
 * @returns 无。
 */
export function tickTypewriter(x: TypewriterIn): void {
  const cut = x.pending.current.indexOf(SUG_MARK)
  let avail = x.pending.current
  if (cut >= 0) {
    avail = x.pending.current.slice(0, cut)
  }
  if (avail !== TEXT_NONE) {
    const n = Math.max(TYPE_MIN_CHARS, Math.ceil(avail.length / TYPE_RATE_DIV))
    x.mirror.current = x.mirror.current + avail.slice(0, n)
    x.pending.current = x.pending.current.slice(n)
    x.setText(x.mirror.current)
    return
  }
  if (x.done.current === false) {
    return
  }
  x.done.current = false
  const full = x.mirror.current + x.pending.current
  x.pending.current = TEXT_NONE
  const got = extractSug(full, x.company, x.lang)
  x.mirror.current = got.body
  x.setText(got.body)
  if (got.sug !== TEXT_NONE) {
    x.setSug(got.sug)
  }
  x.setStatus(ADV_DONE)
}

/**
 * 省级面板的取数。查不到/掉线一律不落格 —— 整块消失不留孤儿,不拿空壳假装查过。
 *
 * @param x 省码与落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadProv(x: LoadProvIn): LoadFn {
  return function loadProv(flag: DeadFlag): void {
    function read(r: Response): Promise<ProvJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: ProvJson): void {
      if (flag.dead || j == null || j.ok !== true) {
        return
      }
      x.setProv({ info: j.info, difficulty: j.difficulty })
    }
    function fall(): void {
      return
    }
    fetch(URL_API_PROVINCE + encodeURIComponent(x.province)).then(read).then(land).catch(fall)
  }
}

/**
 * 市/区级面板的取数(区级才把区带上 —— 点区看区的信息)。
 *
 * @param x 市名、省码、区名、层级与落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadCity(x: LoadCityIn): LoadFn {
  return function loadCity(flag: DeadFlag): void {
    function read(r: Response): Promise<CityJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: CityJson): void {
      if (flag.dead || j == null || j.ok !== true) {
        return
      }
      x.setCityInfo({
        openJobs: j.openJobs,
        new7d: j.new7d,
        medSalary: j.medSalary,
        topBroads: j.topBroads,
        dli: j.dli,
        district: j.district,
      })
    }
    function fall(): void {
      return
    }
    const q = new URLSearchParams()
    q.set(P_CITY, x.city)
    q.set(P_PROV, x.province)
    if (x.level === LEVEL_DISTRICT && x.district !== TEXT_NONE) {
      q.set(P_DISTRICT, x.district)
    }
    fetch(URL_API_CITY + q.toString()).then(read).then(land).catch(fall)
  }
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
    const got = await fetchJobText(x.applyUrl, x.signal)
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
 * 429 锁行上的引导:匿名才引导去注册(登录态额度更高,再喊一次注册没有意义)。
 * ⚠️ hooks.ts 里内嵌初判段那台机器有一个同款的私有 limitCtaOf ——
 * 两处是同一句判断,清剿批并成这一处。
 *
 * @param x 取词函数与登录态。
 * @returns 引导文案;已登录给空串(锁行组件把空串当没给,退回默认升级词)。
 */
export function limitCtaTextOf(x: AdvisorCtaIn): string {
  if (x.loggedIn) {
    return TEXT_NONE
  }
  return x.t('advisor.limitCta')
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
 * 地点事实块的口径注(E8-04 诚实降级):缺地址/缺区时说清「源帖没给」——
 * 留空是**没写**不是**没有**,两件事在用户那里意思不同。有值时无注(值即事实)。
 *
 * @param x 取词函数、点开的是哪一格与这一岗。
 * @returns 口径注;不该出时给空串。
 */
export function locNoteOf(x: LocNoteIn): string {
  if (x.field === FIELD_ADDRESS && x.job.address === TEXT_NONE) {
    return x.t('fact.noAddrNote')
  }
  if (x.field === FIELD_DISTRICT && parseLoc(x.job).district === TEXT_NONE) {
    return x.t('fact.noDistrictNote')
  }
  return TEXT_NONE
}

/**
 * 国家那一格:本站只收加拿大的岗,数据层没写也按加拿大算。
 *
 * @param x 这一岗。
 * @returns 国家名。
 */
export function locCountryOf(x: AdvisorJobIn): string {
  const country = parseLoc(x.job).country
  if (country !== TEXT_NONE) {
    return country
  }
  return COUNTRY_CANADA
}

/**
 * 这个省有没有抽选记录可列(块自身无数据会返回 null,那时外层卡也不该渲 —— 不出空壳)。
 *
 * @param x 省码、抽选记录与是不是魁北克。
 * @returns 有没有。
 */
export function hasDrawsOf(x: HasDrawsIn): boolean {
  if (x.province === TEXT_NONE || x.isQc) {
    return false
  }
  for (const d of x.pnpDraws) {
    if (d.province === x.province) {
      return true
    }
  }
  return false
}

/**
 * 这个省有没有官方新闻可列(同上,不出空壳)。
 *
 * @param x 省码与新闻。
 * @returns 有没有。
 */
export function hasNewsOf(x: HasNewsIn): boolean {
  if (x.province === TEXT_NONE) {
    return false
  }
  for (const n of x.news) {
    if (n.region === x.province) {
      return true
    }
  }
  return false
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
 *
 * @param x 分组、描述表、这一岗与界面语言。
 * @returns 副标;不该出时给空串。
 */
export function headSubOf(x: HeadSubIn): string {
  if (x.group === GROUP_COMPANY) {
    return TEXT_NONE
  }
  return nocZhOf({ nocDesc: x.nocDesc, noc: x.job.noc, lang: x.lang, title: x.job.title })
}

/**
 * 中文对照钮上的话(在翻时说在翻、翻砸了说砸了 —— 不静默变回原样)。
 *
 * @param x 取词函数、状态档与开合。
 * @returns 钮上的话。
 */
export function transLabelOf(x: TransLabelIn): string {
  if (x.status === TRANS_LOADING) {
    return x.t('cat.translating')
  }
  if (x.status === TRANS_ERROR) {
    return x.t('cat.transErr')
  }
  if (x.show) {
    return x.t('cat.hideZh')
  }
  return x.t('cat.showZh')
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
 * 全屏钮的悬停提示(全屏中显示「退出全屏」)。
 *
 * @param x 取词函数与全屏态。
 * @returns 提示语。
 */
export function fullTitleOf(x: FullTitleIn): string {
  if (x.full) {
    return x.t('advisor.exitFull')
  }
  return x.t('advisor.full')
}

/**
 * 浮层白卡的类名。
 *
 * @param x 全屏态。
 * @returns 类名。
 */
export function panelClsOf(x: PanelClsIn): string {
  if (x.full) {
    return cssOf(css.panel) + CLS_SEP + cssOf(css.panelFull)
  }
  return cssOf(css.panel)
}

/**
 * 卡内点击不许冒到遮罩 —— 否则点哪都算点外面,弹框当场关掉。
 *
 * @param e 鼠标事件。
 * @returns 无。
 */
export function stopClick(e: React.MouseEvent): void {
  e.stopPropagation()
}

/**
 * 窗口钮排的按下手柄。⚠️ 两个弹框在这里**本来就不一致**:职位描述弹框拦下拖动起手
 * (点全屏钮不会顺带把整框拖走),顾问弹框不拦。换装批逐字保留这个差异 ——
 * 见桶里的行为疑点台账,清剿批统一。
 *
 * @param x 拦不拦。
 * @returns 按下手柄。
 */
export function makeActsDown(x: ActsDownIn): PointerHandlerFn {
  return function onActsDown(e: React.PointerEvent): void {
    if (x.stop === false) {
      return
    }
    e.stopPropagation()
  }
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
