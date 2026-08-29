'use client'
/**
 * companies 域的函数:译名取舍、面包屑省格的显示名与地址、返回手柄工厂,
 * 以及公司本体族的派生(简介分节、股别解析、四维依据句、职业名取舍、类名预算)
 * 与手柄工厂(折叠、展开、取数)。
 * 零 JSX 零 hook —— 排版归各 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位:原文件里的箭头小件(coParseSecs、
 * chColor、parseCoStreams、zhBlock、row…)全部落成这里的具名函数。
 *
 * 「这句是不是『没有』」的收口(`-` / `N/A` / 未提供 那一族)走 lib/jobs 的 `isJdNone`。
 * 2026-08-28 Frank 拍板把它从 components/jobs/Jd.tsx 迁进 lib/jobs:那是**数据口径**不是视图 ——
 * 公司简介与 JD 正文两边都在读它,留在视图层就等于给口径开了个岔。**行为不许复制**。
 *
 * @author Frank
 * @time 2026-08-27 02:10:00
 */
import { goBackOr } from '@/components/button'
import { isJdNone } from '@/lib/jobs'
import { provName } from '@/lib/location'
import { track } from '@/lib/track'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, CH_C_AMBER, CH_C_DEEP, CH_C_GRAY, CH_C_GREEN, CH_C_NONE,
  CH_GRADE_AMBER_MIN, CH_GRADE_DEEP_MIN, CH_GRADE_GRAY_MIN, CH_GRADE_GREEN_MIN, CLS_SEP, CO_SEC_BASE,
  CO_SEC_KEYS, CO_SEC_SPLIT_RE, CO_STREAM_COUNT_RE, CO_STREAM_SPLIT_RE, DASH_EM, DESC_MIN_LEN, FAME_PROVS_MIN,
  GOV_BODY_RE, GOV_ORG_RE, GOV_PLACE_RE, HDR_CONTENT_TYPE, LANG_EN, SEC_PAIR_STEP,
  HTTP_OK, HTTP_URL_RE, JD_ZH_CLS, JOBS_FIRST_N, KEY_ACT_EVIDENCE, KEY_ACT_EVIDENCE_ONE, KEY_ACT_TIER_HEAD,
  KEY_FM_OPEN, KEY_FM_OPEN_ONE, KEY_FM_PROVS, KEY_FM_TIER_HEAD, KEY_FM_WIKI, KEY_SAL_EVIDENCE,
  KEY_SAL_TIER_HEAD, KEY_SP_EVIDENCE, KEY_SP_EVIDENCE_AIP, KEY_SP_TIER_AIP, KEY_SP_TIER_HEAD, LANG_KO, LANG_ZH,
  METHOD_POST, MIME_JSON, NOCS_TOP_N, PROV_LOCALE_ONLY, SEP_ENUM, SIGN_PLUS, STREAM_AGRI_RE, STREAM_GTS_RE,
  STREAM_HIGH_RE, STREAM_LOW_RE, STREAM_PR_RE, KEY_STREAM_AGRI, KEY_STREAM_GTS, KEY_STREAM_HIGH, KEY_STREAM_LOW,
  KEY_STREAM_PR, TEXT_NONE, TRACK_AI_READ, TRACK_KIND_COMPANY, TRACK_TV_ENTRY, URL_CO_INFO, URL_CO_TRANSLATE,
  URL_JOBS_COMPANY, URL_PLAN_PR_HEAD, URL_PROV_HEAD,
} from './constants'
import { cssOf } from '@/components/css'
import type {
  ActiveTextIn, AiNoteClsIn, AiToggleIn, AliasOfIn, BriefJson, BriefSecsIn, CanTransIn, ChColorIn,
  CompanyAiNoteKind, CompanyBriefFact, CompanyJobFact, CompanyJobRow, CompanyOnlyIn, CompanyStream, DeadFlag,
  DisplayNameIn,
  FameTextIn, FlatIn, GoBackFn, GoBackIn, HasIdIn, HttpSourcesIn, IsGovIn, JobNocNameIn, JobsShownIn,
  LmiaNocNameIn, LmiaNocRow, LmiaRestIn, LoadBriefIn, LoadFn, LoadPanelIn, LoadTransIn, NocRowsIn, OpenJobIn,
  PanelJson, PanelSlugIn, PillClsIn, ProvFullOfIn, ProvHrefOfIn, ResolveJobFn, ResolveJobIn, SalaryTextIn,
  SecKeyIn, SecTextIn, SecZhIn, ShowAllIn, SponsorTextIn, StreamLabel, StreamLabelIn, StreamsIn, ToggleIn,
  TransJson, TvOpenIn, ZhLineClsIn,
} from './types'
import css from './companies.module.css'

/**
 * 公司名后面那条灰字译名。#151 口径:**界面语言的译名作灰注,英文界面不出** ——
 * 英文界面下译名与主文案同语,再挂一遍就是一行两遍。
 *
 * @param x 界面语言与两门译名。
 * @returns 该出的译名;不出时给空串。
 */
export function aliasOf(x: AliasOfIn): string {
  if (x.lang === LANG_ZH) {
    return x.aliasZh
  }
  if (x.lang === LANG_KO) {
    return x.aliasKo
  }
  return TEXT_NONE
}

/**
 * 面包屑省格的显示名(「Ontario(安大略省)」两段式,英文在前的全站口径)。
 *
 * @param x 取词函数与省码。
 * @returns 显示省名;省码缺席时给空串(那一格整个不渲)。
 */
export function provFullOf(x: ProvFullOfIn): string {
  if (x.code === TEXT_NONE) {
    return TEXT_NONE
  }
  return provName({ t: x.t, code: x.code, localeOnly: PROV_LOCALE_ONLY })
}

/**
 * 面包屑省格的去处:职位板按省筛选(省没有独立页,点它是去看这个省的岗)。
 *
 * @param x 省码。
 * @returns 带筛选参数的职位板地址。
 */
export function provHrefOf(x: ProvHrefOfIn): string {
  return URL_PROV_HEAD + encodeURIComponent(x.code)
}

/**
 * 右上返回的点击手柄。2026-07-28 走 goBackOr 而不是裸 history.back():公司页也是
 * 从职位板弹框 target="_blank" 打开的,新标签页里 `history.length === 1`,
 * 裸 `history.back()` 是**空操作** —— 用户点了页面纹丝不动(生产实测)。
 *
 * @param x 无处可回时的落点。
 * @returns 返回钮的点击手柄。
 */
export function makeGoBack(x: GoBackIn): GoBackFn {
  return function goBack(): void {
    goBackOr(x.fallback)
  }
}

/**
 * 把带五节标记的文本切成「标记 → 正文」。`split` 带捕获组,结果是
 * 「前言, 标记, 正文, 标记, 正文…」,所以从下标 1 起两个两个取。
 * 存量散文(整段没有标记)切出来是空表,由调用方按散文渲。
 *
 * @param x 简介原文或译文。
 * @returns 标记到正文的表。
 */
export function briefSecsOf(x: BriefSecsIn): Record<string, string> {
  const parts = x.text.split(CO_SEC_SPLIT_RE)
  const secs: Record<string, string> = {}
  for (let i = 1; i + 1 <= parts.length - 1; i += SEC_PAIR_STEP) {
    const mark = parts[i]
    const body = parts[i + 1]
    if (mark != null) {
      let text = TEXT_NONE
      if (body != null) {
        text = body.trim()
      }
      secs[mark] = text
    }
  }
  return secs
}

/**
 * 取某一节的正文(缺节给空串 —— 缺项不占卡,宁可留空)。
 *
 * @param x 分节表与节标记。
 * @returns 该节正文。
 */
export function secTextOf(x: SecTextIn): string {
  const body = x.secs[x.mark]
  if (body == null) {
    return TEXT_NONE
  }
  return body.trim()
}

/**
 * 取某一节小标题的文案键(表里没有这个标记时给空串)。
 *
 * @param x 节标记。
 * @returns 文案键。
 */
export function secKeyOf(x: SecKeyIn): string {
  const key = CO_SEC_KEYS[x.mark]
  if (key == null) {
    return TEXT_NONE
  }
  return key
}

/**
 * 这一节有没有内容(「-」「N/A」「未提供」这类都算没有,缺项不占卡)。
 *
 * @param x 分节表与节标记。
 * @returns 有没有。
 */
export function hasSecOf(x: SecTextIn): boolean {
  return isJdNone(secTextOf(x)) === false
}

/**
 * 这一节的中文对照(#185:英文段下挂译文段)。译文缺、译文是「没有」、
 * 译文与原文逐字相同,三种都不挂 —— 挂了就是一行说两遍。
 *
 * @param x 译文分节表、节标记与本节原文。
 * @returns 该挂的译文;不挂时给空串。
 */
export function secZhOf(x: SecZhIn): string {
  const zh = secTextOf({ secs: x.tSecs, mark: x.mark })
  if (zh === TEXT_NONE || isJdNone(zh) || zh === x.en) {
    return TEXT_NONE
  }
  return zh
}

/**
 * 名录厚简介够不够长(≥120 字才算有正文可读;不够长的按没有算,让位 K 调查五节)。
 *
 * @param x 公司档案。
 * @returns 有没有厚简介。
 */
export function hasDescOf(x: CompanyOnlyIn): boolean {
  return x.company.description.length >= DESC_MIN_LEN
}

/**
 * 担保记录深块出不出:有 LMIA 获批岗位,或者是 AIP 指定雇主。
 *
 * @param x 公司档案。
 * @returns 出不出。
 */
export function showSponsorOf(x: CompanyOnlyIn): boolean {
  let positions = 0
  if (x.company.lmiaPositions != null) {
    positions = x.company.lmiaPositions
  }
  if (positions > 0) {
    return true
  }
  const detail = x.company.scoreDetail
  if (detail == null || detail.sponsor == null || detail.sponsor.v == null) {
    return false
  }
  return detail.sponsor.v.aip
}

/**
 * 缓存的 K 调查简介里有没有「所在地」那一节(#199:DB 有精确地址时它让位,
 * DB 只有省级时反过来由它顶上,所以要先知道它在不在)。
 *
 * @param x 简介正文。
 * @returns 有没有。
 */
export function hasBaseSecOf(x: BriefSecsIn): boolean {
  return hasSecOf({ secs: briefSecsOf({ text: x.text }), mark: CO_SEC_BASE })
}

/**
 * 身份区(官网/地址/行业/行业段/维基)有没有东西可显 —— 一格都没有时那条分隔线不出。
 *
 * @param x 公司档案与算好的地址。
 * @returns 有没有。
 */
export function hasIdOf(x: HasIdIn): boolean {
  if (x.company.website !== TEXT_NONE || x.addr !== TEXT_NONE) {
    return true
  }
  return x.company.industry !== TEXT_NONE || x.company.sectors !== TEXT_NONE || x.company.wikiUrl !== TEXT_NONE
}

/**
 * 弹框里「显示中文对照」钮出不出(#196 放宽):AI 简介可翻,**或**在招职位有
 * 界面语译名可显 —— 原先只认 AI 简介,于是「名录厚简介 + 在招译名」的公司没钮,
 * 译名却无条件冒出来。英文界面一律不出(译名与主文案同语)。
 *
 * @param x 公司档案与界面语言。
 * @returns 出不出。
 */
export function canTransOf(x: CanTransIn): boolean {
  if (x.lang === LANG_EN || x.company == null) {
    return false
  }
  if (hasDescOf({ company: x.company }) === false) {
    return true
  }
  for (const job of x.company.jobs) {
    let zh = job.nocTitleKo
    if (x.lang === LANG_ZH) {
      zh = job.nocTitleZh
    }
    if (zh !== TEXT_NONE && zh.toLowerCase() !== job.title.toLowerCase()) {
      return true
    }
  }
  return false
}

/**
 * 「完整页 ↗」的 slug:职位行上带的优先(它是这次点进来的那家),
 * 取数回来的公司行兜底;都没有就不出这个钮(不做死链)。
 *
 * @param x 职位行上的 slug 与取到的公司档案。
 * @returns slug;没有时给空串。
 */
export function panelSlugOf(x: PanelSlugIn): string {
  if (x.jobSlug !== TEXT_NONE) {
    return x.jobSlug
  }
  if (x.company == null) {
    return TEXT_NONE
  }
  return x.company.slug
}

/**
 * 弹框顶部药丸钮的类名(开着的那个换蓝底蓝字)。药丸形自带一份本域的类:
 * 它压在 button 域的 `.btn`/`.ghost` 之上,加倍写抬权重、不赌打包顺序(先例 account）。
 *
 * @param x 开合。
 * @returns 类名。
 */
export function pillClsOf(x: PillClsIn): string {
  if (x.on) {
    return cssOf(css.pill) + CLS_SEP + cssOf(css.pillOn)
  }
  return cssOf(css.pill)
}

/**
 * 担保档色阶(与列表「通道」列同源;未评/无记录给浅灰 ——
 * 🔴 无记录 ≠ 不担保,色阶上也不给负判定的暗示)。
 *
 * @param x 档位。
 * @returns 色值。
 */
export function chColorOf(x: ChColorIn): string {
  if (x.grade == null) {
    return CH_C_NONE
  }
  if (x.grade >= CH_GRADE_DEEP_MIN) {
    return CH_C_DEEP
  }
  if (x.grade >= CH_GRADE_GREEN_MIN) {
    return CH_C_GREEN
  }
  if (x.grade >= CH_GRADE_GRAY_MIN) {
    return CH_C_GRAY
  }
  if (x.grade >= CH_GRADE_AMBER_MIN) {
    return CH_C_AMBER
  }
  return CH_C_NONE
}

/**
 * 一股 LMIA 的显示名与技能类判定(技能股 = High Wage / GTS / PR,match.ts 口径;
 * 前端只展示不判定)。认不出的股渲原名,不硬塞进已知的五档。
 *
 * @param x 股别原名与取词函数。
 * @returns 显示名与技能类标记。
 */
export function streamLabelOf(x: StreamLabelIn): StreamLabel {
  const low = x.name.toLowerCase()
  if (STREAM_HIGH_RE.test(low)) {
    return { label: x.t(KEY_STREAM_HIGH), skilled: true }
  }
  if (STREAM_GTS_RE.test(low)) {
    return { label: x.t(KEY_STREAM_GTS), skilled: true }
  }
  if (STREAM_PR_RE.test(low)) {
    return { label: x.t(KEY_STREAM_PR), skilled: true }
  }
  if (STREAM_LOW_RE.test(low)) {
    return { label: x.t(KEY_STREAM_LOW), skilled: false }
  }
  if (STREAM_AGRI_RE.test(low)) {
    return { label: x.t(KEY_STREAM_AGRI), skilled: false }
  }
  return { label: x.name, skilled: false }
}

/**
 * LMIA 股别串解析(「High Wage 58 · Low Wage 1008」→ 逐股)。
 *
 * @param x 股别串与取词函数。
 * @returns 逐股的展示行;串为空时是空表。
 */
export function streamsOf(x: StreamsIn): CompanyStream[] {
  if (x.streams === TEXT_NONE) {
    return []
  }
  const out: CompanyStream[] = []
  for (const part of x.streams.split(CO_STREAM_SPLIT_RE)) {
    const one = part.trim()
    if (one !== TEXT_NONE) {
      const m = one.match(CO_STREAM_COUNT_RE)
      let rawName = one
      let count = TEXT_NONE
      if (m != null && m.groups != null && m.groups.name != null && m.groups.count != null) {
        rawName = m.groups.name.trim()
        count = m.groups.count
      }
      const named = streamLabelOf({ name: rawName, t: x.t })
      out.push({ label: named.label, count, skilled: named.skilled })
    }
  }
  return out
}

/**
 * 政府/公共机构判定(Frank 2026-07-24):强信号名称关键词,宁可漏标不错标。
 *
 * @param x 公司名。
 * @returns 是不是政府/公共机构。
 */
export function isGovCompany(x: IsGovIn): boolean {
  if (x.name === TEXT_NONE) {
    return false
  }
  if (GOV_BODY_RE.test(x.name) || GOV_PLACE_RE.test(x.name)) {
    return true
  }
  return GOV_ORG_RE.test(x.name)
}

/**
 * 只留真的 http(s) 链接(#191「看来源」折叠列的是可点的网页,存量里混过非链接的字串)。
 *
 * @param x 来源网页原列。
 * @returns 可点的来源。
 */
export function httpSourcesOf(x: HttpSourcesIn): string[] {
  const out: string[] = []
  for (const url of x.sources) {
    if (HTTP_URL_RE.test(url)) {
      out.push(url)
    }
  }
  return out
}

/**
 * 担保维的档名文案键:有 LMIA 记录按档位取,AIP 指定但无记录走专句。
 *
 * @param x 担保维与取词函数。
 * @returns 文案键。
 */
export function sponsorTierKeyOf(x: SponsorTextIn): string {
  if (x.dim.v != null && x.dim.v.total > 0) {
    return KEY_SP_TIER_HEAD + String(x.dim.g)
  }
  return KEY_SP_TIER_AIP
}

/**
 * 担保维的依据句(近两年获批总数 + 技能股 + 最近季度;无记录走 AIP 专句)。
 *
 * @param x 担保维与取词函数。
 * @returns 依据句。
 */
export function sponsorEvidenceOf(x: SponsorTextIn): string {
  const v = x.dim.v
  if (v == null || v.total === 0) {
    return x.t(KEY_SP_EVIDENCE_AIP)
  }
  let skilled = 0
  if (v.skilled != null) {
    skilled = v.skilled
  }
  let quarter = DASH_EM
  if (v.q !== TEXT_NONE) {
    quarter = v.q
  }
  return x.t(KEY_SP_EVIDENCE, { total: v.total, n: skilled, q: quarter })
}

/**
 * 活跃度维的档名文案键。
 *
 * @param x 活跃度维与取词函数。
 * @returns 文案键。
 */
export function activeTierKeyOf(x: ActiveTextIn): string {
  return KEY_ACT_TIER_HEAD + String(x.dim.g)
}

/**
 * 活跃度维的依据句(在招 N 个岗、近 30 天新发 M 个;只在招 1 个走单数句)。
 *
 * @param x 活跃度维与取词函数。
 * @returns 依据句。
 */
export function activeEvidenceOf(x: ActiveTextIn): string {
  let open = 0
  let new30 = 0
  if (x.dim.v != null) {
    open = x.dim.v.open
    new30 = x.dim.v.new30
  }
  if (open === 1) {
    return x.t(KEY_ACT_EVIDENCE_ONE, { open, n: new30 })
  }
  return x.t(KEY_ACT_EVIDENCE, { open, n: new30 })
}

/**
 * 薪资维的档名文案键。
 *
 * @param x 薪资维与取词函数。
 * @returns 文案键。
 */
export function salaryTierKeyOf(x: SalaryTextIn): string {
  return KEY_SAL_TIER_HEAD + String(x.dim.g)
}

/**
 * 薪资维的依据句(相对同职业中位的百分比;正数自己补正号 —— 不补看不出高还是低)。
 *
 * @param x 薪资维与取词函数。
 * @returns 依据句。
 */
export function salaryEvidenceOf(x: SalaryTextIn): string {
  let pct = String(x.dim.v)
  if (x.dim.v >= 0) {
    pct = SIGN_PLUS + String(x.dim.v)
  }
  return x.t(KEY_SAL_EVIDENCE, { pct })
}

/**
 * 知名度维的档名文案键。
 *
 * @param x 知名度维与取词函数。
 * @returns 文案键。
 */
export function fameTierKeyOf(x: FameTextIn): string {
  return KEY_FM_TIER_HEAD + String(x.dim.g)
}

/**
 * 知名度维的依据句(维基条目 / 跨省在招 / 在招岗数,有几条列几条,顿号连)。
 *
 * @param x 知名度维与取词函数。
 * @returns 依据句;一条都没有时给空串(那一格空着)。
 */
export function fameEvidenceOf(x: FameTextIn): string {
  const v = x.dim.v
  if (v == null) {
    return TEXT_NONE
  }
  const parts: string[] = []
  if (v.wiki !== TEXT_NONE) {
    parts.push(x.t(KEY_FM_WIKI))
  }
  if (v.provs >= FAME_PROVS_MIN) {
    parts.push(x.t(KEY_FM_PROVS, { n: v.provs }))
  }
  if (v.open === 1) {
    parts.push(x.t(KEY_FM_OPEN_ONE, { n: v.open }))
  }
  if (v.open > 1) {
    parts.push(x.t(KEY_FM_OPEN, { n: v.open }))
  }
  return parts.join(SEP_ENUM)
}

/**
 * 在招岗名下的 NOC 译名(#200 Frank「岗位名称中文翻译默认都加上」):
 * 界面语言的译名优先,没有就退回官方英文名。
 *
 * @param x 在招一行与界面语言。
 * @returns 译名。
 */
export function jobNocNameOf(x: JobNocNameIn): string {
  if (x.lang === LANG_ZH && x.job.nocTitleZh !== TEXT_NONE) {
    return x.job.nocTitleZh
  }
  if (x.lang === LANG_KO && x.job.nocTitleKo !== TEXT_NONE) {
    return x.job.nocTitleKo
  }
  return x.job.nocTitle
}

/**
 * 岗名下那条灰字小注:NOC 译名与岗名重复(大小写不计)时不出 —— 一行说两遍。
 *
 * @param x 在招一行与界面语言。
 * @returns 小注;不出时给空串。
 */
export function jobSubOf(x: JobNocNameIn): string {
  const name = jobNocNameOf(x)
  if (name === TEXT_NONE) {
    return TEXT_NONE
  }
  if (name.toLowerCase() === x.job.title.toLowerCase()) {
    return TEXT_NONE
  }
  return name
}

/**
 * 获批职业的显示名(界面语言优先;没有译名的渲裸码)。
 *
 * @param x 获批职业一行与界面语言。
 * @returns 职业名;没有名字时给空串(调用方改渲裸码)。
 */
export function lmiaNocNameOf(x: LmiaNocNameIn): string {
  if (x.lang === LANG_ZH && x.row.titleZh !== TEXT_NONE) {
    return x.row.titleZh
  }
  if (x.lang === LANG_KO && x.row.titleKo !== TEXT_NONE) {
    return x.row.titleKo
  }
  return x.row.title
}

/**
 * 基本信息卡里那行公司名称(Frank 2026-07-24「一直显示方便用户看」):
 * 有界面语译名显译名,否则显原名 —— 标题会截断长名,这行给全名。
 *
 * @param x 界面语言与公司档案。
 * @returns 显示名。
 */
export function displayNameOf(x: DisplayNameIn): string {
  const alias = aliasOf({ lang: x.lang, aliasZh: x.company.aliasZh, aliasKo: x.company.aliasKo })
  if (alias !== TEXT_NONE) {
    return alias
  }
  return x.company.name
}

/**
 * 在招职位这一屏渲哪几行(#198:首显 8,展开其余 —— 原地展开不跳转)。
 *
 * @param x 在招行与展开态。
 * @returns 这一屏要渲的行。
 */
export function jobsShownOf(x: JobsShownIn): CompanyJobRow[] {
  if (x.all) {
    return x.jobs
  }
  return x.jobs.slice(0, JOBS_FIRST_N)
}

/**
 * 获批职业逐行列出的那几行(#286:Top 6 逐行)。
 *
 * @param x 获批职业行。
 * @returns 前 6 行。
 */
export function topNocsOf(x: NocRowsIn): LmiaNocRow[] {
  return x.rows.slice(0, NOCS_TOP_N)
}

/**
 * 并成一行的余量(#286:Top 6 之外的行数不逐行列)。
 *
 * @param x 获批职业行。
 * @returns 余下的行。
 */
export function restNocsOf(x: NocRowsIn): LmiaNocRow[] {
  return x.rows.slice(NOCS_TOP_N)
}

/**
 * 余量那一行的岗位数合计。
 *
 * @param x 余下的行。
 * @returns 合计岗位数。
 */
export function restPositionsOf(x: LmiaRestIn): number {
  let n = 0
  for (const row of x.rest) {
    n += row.positions
  }
  return n
}

/**
 * 简介外壳的类名:扁平态只留节距,卡壳态是全站白卡。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function briefWrapClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.flatSec)
  }
  return CARD_MD_CLS
}

/**
 * 简介标题的类名:扁平态走 JD 次级头,卡壳态是全站卡标题。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function briefHeadClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.flatHead)
  }
  return CARD_HEAD_CLS
}

/**
 * 简介一节外框的类名(#188 扁平态对齐 JD 整理版:节距收到 2)。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function secClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.sec) + CLS_SEP + cssOf(css.secFlat)
  }
  return cssOf(css.sec)
}

/**
 * 简介节内小标题的类名(#188 扁平态:粗体深灰不缩进,与 JD 次级头同款)。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function secHeadClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.secHead) + CLS_SEP + cssOf(css.secHeadFlat)
  }
  return cssOf(css.secHead)
}

/**
 * 简介节内正文的类名(扁平态统一缩进 14,与 JD 正文同值)。
 *
 * @param x 扁平态。
 * @returns 类名。
 */
export function secBodyClsOf(x: FlatIn): string {
  if (x.flat) {
    return cssOf(css.flatBody)
  }
  return cssOf(css.secBody)
}

/**
 * AI 检索声明行的类名(三处同一套,只有外边距按位置分三档)。
 *
 * @param x 位置档。
 * @returns 类名。
 */
export function aiNoteClsOf(x: AiNoteClsIn): string {
  const kindCls: Record<CompanyAiNoteKind, string> = {
    brief: cssOf(css.aiBrief),
    lazy: cssOf(css.aiLazy),
    panel: cssOf(css.aiPanel),
  }
  return cssOf(css.ai) + CLS_SEP + kindCls[x.kind]
}

/**
 * 中文对照行的类名(蓝竖条走全局 `.jdZh`,几何微调与散文的换行保留是本域的类)。
 *
 * @param x 散文态。
 * @returns 类名。
 */
export function zhLineClsOf(x: ZhLineClsIn): string {
  if (x.prose) {
    return JD_ZH_CLS + CLS_SEP + cssOf(css.zhLine) + CLS_SEP + cssOf(css.zhProse)
  }
  return JD_ZH_CLS + CLS_SEP + cssOf(css.zhLine)
}

/**
 * 折叠钮的点击手柄(「看来源」这类开合)。
 *
 * @param x 现值与落格。
 * @returns 点击手柄。
 */
export function makeToggle(x: ToggleIn): GoBackFn {
  return function toggle(): void {
    x.set(x.on === false)
  }
}

/**
 * 「展开其余」的点击手柄(#198:原地展开已载入职位,不跳转)。
 *
 * @param x 展开态落格。
 * @returns 点击手柄。
 */
export function makeShowAll(x: ShowAllIn): GoBackFn {
  return function showAll(): void {
    x.set(true)
  }
}

/**
 * AI 速读钮的点击手柄:第一次打开埋点(#129),再开合不重复记。
 *
 * @param x 现值与落格。
 * @returns 点击手柄。
 */
export function makeAiToggle(x: AiToggleIn): GoBackFn {
  return function toggleAi(): void {
    if (x.on === false) {
      track(TRACK_AI_READ)
    }
    x.set(x.on === false)
  }
}

/**
 * 弹框内点在招职位的手柄:叠开 JD 弹框(把已载入的整行交回上层)。
 *
 * @param x 这一行与上层回调。
 * @returns 点击手柄。
 */
export function makeOpenJob(x: OpenJobIn): GoBackFn {
  return function openJob(): void {
    x.onOpenJob(x.job)
  }
}

/**
 * 按岗位号把已载入的整行喂回来(JD 弹框要整份 JobRow;没载入这一行时给 null)。
 *
 * @param x 已载入的职位行。
 * @returns 回查函数。
 */
export function makeResolveJob(x: ResolveJobIn): ResolveJobFn {
  return function resolveJob(id: number): CompanyJobFact | null {
    for (const row of x.jobs) {
      if (Number(row.id) === id) {
        return row
      }
    }
    return null
  }
}

/**
 * 判定卡入口的点击手柄(#287 批D:带岗位号去判定页;先埋点再跳)。
 *
 * @param x 岗位号。
 * @returns 点击手柄。
 */
export function makeTvOpen(x: TvOpenIn): GoBackFn {
  return function openTv(): void {
    track(TRACK_TV_ENTRY, { kind: TRACK_KIND_COMPANY })
    window.location.assign(URL_PLAN_PR_HEAD + String(x.jobId))
  }
}

/**
 * K 调查简介的懒查(#158 Frank 2026-07-19 批:首开自动调查,命中缓存秒回)。
 * 查不到/掉线一律落 null —— 整块消失不留孤儿,不拿空壳假装查过。
 *
 * @param x 公司名与两个落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadBrief(x: LoadBriefIn): LoadFn {
  return function loadBrief(flag: DeadFlag): void {
    function read(r: Response): Promise<BriefJson> {
      if (r.ok && r.status === HTTP_OK) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: BriefJson): void {
      if (flag.dead) {
        return
      }
      let fact: CompanyBriefFact | null = null
      if (j != null && j.brief != null && j.brief !== TEXT_NONE) {
        let website = TEXT_NONE
        let fetched = TEXT_NONE
        let sources: string[] = []
        if (j.website != null) {
          website = j.website
        }
        if (j.fetched != null) {
          fetched = j.fetched
        }
        if (j.sources != null) {
          sources = j.sources
        }
        fact = { brief: j.brief, website, sources, fetched }
      }
      x.setFact(fact)
      x.setLoading(false)
    }
    function fall(): void {
      if (flag.dead) {
        return
      }
      x.setFact(null)
      x.setLoading(false)
    }
    fetch(URL_CO_INFO, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ name: x.company }),
    }).then(read).then(land).catch(fall)
  }
}

/**
 * 公司简介的懒翻(#185 中文对照:点了才翻,拿到存一份切换零延迟)。
 * 翻不出来就不落格 —— 原文照旧显示,不拿半截译文顶上去。
 *
 * @param x 公司名、语言与译文落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadTrans(x: LoadTransIn): LoadFn {
  return function loadTrans(flag: DeadFlag): void {
    function read(r: Response): Promise<TransJson> {
      return r.json().catch(none)
    }
    function none(): null {
      return null
    }
    function land(j: TransJson): void {
      if (flag.dead || j == null) {
        return
      }
      if (j.ok !== true || j.text == null || j.text === TEXT_NONE) {
        return
      }
      x.setTrans(j.text)
    }
    function fall(): void {
      return
    }
    fetch(URL_CO_TRANSLATE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ name: x.company, lang: x.lang }),
    }).then(read).then(land).catch(fall)
  }
}

/**
 * 公司弹框取数(E8-11 B1:与 /companies/[slug] 页面同一份数据,免额度)。
 *
 * @param x 岗位号与两个落格。
 * @returns effect 里调用的取数函数(带取消标记)。
 */
export function makeLoadPanel(x: LoadPanelIn): LoadFn {
  return function loadPanel(flag: DeadFlag): void {
    function read(r: Response): Promise<PanelJson> {
      if (r.ok) {
        return r.json()
      }
      return Promise.resolve(null)
    }
    function land(j: PanelJson): void {
      if (flag.dead) {
        return
      }
      let data = null
      if (j != null && j.company != null) {
        data = { company: j.company, similar: j.similar }
      }
      x.setData(data)
      x.setLoading(false)
    }
    function fall(): void {
      if (flag.dead) {
        return
      }
      x.setData(null)
      x.setLoading(false)
    }
    fetch(URL_JOBS_COMPANY, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ jobId: x.jobId }),
    }).then(read).then(land).catch(fall)
  }
}
