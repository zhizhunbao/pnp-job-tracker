/**
 * advisor 域的行为:把服务端查好的岗位/公司/职业/地点事实,拼成各场景的提示词。
 * 全部纯拼装 —— 事实从参数进(routes 现查),判定(match/normalizeProfile)留在各自的
 * 主人域,这里只收结果拼文本;措辞逐字保形老链 api/advisor(eval 对拍的前提)。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */
import { runAgentLoop } from '@earendil-works/pi-agent-core'
import type { StreamFn } from '@earendil-works/pi-agent-core'
import { streamSimple } from '@earendil-works/pi-ai/api/openai-completions'
import type { Model } from '@earendil-works/pi-ai'
import { passThroughMessages } from '../agent'
import { CHAT_CODE, chatError } from '../error'
import { fill } from '../template'
import { PROV_NAMES } from '../location'
import {
  API, ATLANTIC_PROVS, AUTH_HEADER, BASE, BEARER, BLOCK_TEXT, CACHE_VER, CO_ABOUT_LEN_MAX,
  CO_DESC_LEN_MAX, CO_SECTORS_LEN_MAX, CO_SOURCES_MAX, CO_WEB_LEN_MAX, COMMA_SEP, CONTEXT_WINDOW,
  CT_TEXT, F_CITY_READ, F_CO_READ, F_COMPANY, F_IMMIGRATION, F_JD_READ, F_OCC_READ,
  F_PROV_READ, F_SCORE, F_TITLE, HDR_CONTENT_TYPE, HDR_X_CACHE, HDR_X_JD, HTML_SCRIPT_RE,
  HTML_STYLE_RE, HTML_TAG_RE, HTTP_RE, INDEMAND_NOC2,
  ISO_DATE_LEN, K_DIV, KEY, KEY_PRO_PREFIX, KEY_SEP, LANG_NAMES, LANG_ZH, LOC_FACTS_LEN_MAX, LOC_KEY,
  LOOP_TIMEOUT_MS, MESSAGE_UPDATE, MODEL_ID, NL, NL2, NO_KEY_PLACEHOLDER, NOC_GROUP_LEN, NOC_TEER_RE,
  OCC_DUTY_LEN_MAX, OCC_DUTY_LINES_MAX, OCC_REQ_LEN_MAX, OCC_REQ_LINES_MAX, PCT_100, PROVIDER, QC_CODE, QUOTE,
  REASON_PREFIX, ROLE_ASSISTANT, ROLE_USER, SAMPLING, SEMI_SEP, SIMPLE_FIELDS, SLASH_SEP, SPACE_SEP, TOOL_WEB_FETCH,
  V1, WAGE_FIELDS, WEBFETCH_TEXT_MAX, WEBFETCH_TIMEOUT_MS, WS_RE,
} from './constants'
import { WEB_FETCH_PARAMS } from './schemas'
import {
  ASK, ASK_FALLBACK_TPL, ATLANTIC_RULE, CH_NAME, CHAT_FACTS_HEAD, CHAT_JD_HEAD, CHAT_JD_TAIL,
  CHAT_TAIL, CITY_READ_ASK, CO_ANTI_FAB, CO_FACT, CO_GROUND_BOTH, CO_GROUND_FETCH, CO_GROUND_NONE,
  CO_GROUND_STORED, CO_HEAD_TPL, CO_KNOWN, CO_KNOWN_HEAD, CO_OUTPUT_RULES, CO_READ_ASK, CO_READ_RULES,
  CO_SPONSOR, CO_WEB_HEAD, DRIVER, GROUNDING_RULES, HEADINGS, HEADINGS_INSTR, IMM_HEAD_TPL,
  JD_BLOCK_HEAD, JD_BLOCK_TAIL, JD_FACTS_TPL, JD_READ_ASK, JD_READ_MISSING, JD_READ_SRC_HEAD,
  JD_READ_TAIL, JOB_FACT, JOB_FACTS_HEAD, LANG_PURITY, LOC_FACT, LOC_FACTS_HEAD, LOC_READ_TAIL, NO_JD_LINE,
  NO_MEDIAN_RULE, NOC_NONE_LINE, OCC_FACT, OCC_READ_TAIL, PATH_FACTS_HEAD, PATH_FACTS_TPL, PLAN_RULES, PREP_EXTRA,
  PROFILE_MATCH_TPL, PROFILE_TAIL, PROFILE_TPL, PROV_READ_ASK, READER_CTX_TPL, READER_LINE,
  READS_OUTPUT, SCORE_FACTS_TPL, SECTIONS_OUTPUT, SIMPLE_OUTPUT, STREAM_SEG, SYSTEM_TPL, TURN_ADVISOR,
  TURN_HEAD, TURN_USER, VAL, WEB_FETCH_DESC, WEB_FETCH_FAIL, YR_SEG, ZH_ONLY,
} from './prompts'
import type {
  AdvisorJob, AdvisorWire, BroadCountCell, CacheKeyIn, Cell, CellAtIn, CellList, ChatMsg, ChatMsgList,
  ChatPromptIn, CityFactsIn, ClipLinesIn,
  CompanyPromptIn, CoReadPromptIn, ChatSystemIn, EmployerCountCell, EventIn, FactorIn, FieldPromptIn,
  HeaderMap, HeadersOfIn, HeadingPair, ImmigrationPromptIn, JdReadPromptIn, JobRowCell, Lang, LastTextIn,
  LocJobIn, LocReadPromptIn, MatchJobCell, MaybeNum, MaybeObj, MaybeStr, ModelOut, NamedCell, OccJobIn,
  OccReadPromptIn, ProfileFactsIn,
  PromptIn, ProvFactsIn, Reply, ReplyOut, RunIn, RunOut, ToolList, TranscriptMsg, VolLineIn, WebFetchToolIn,
} from './types'

// =========================================================================
// 1. 场景入口(总分发、system、对话 system、档案/处境块、缓存键)
// =========================================================================

/**
 * 初判/字段解释的提示词总分发(老链 buildPrompt 六参收一参;分支顺序逐字保形)。
 *
 * @param input 场景、事实与语言。
 * @returns 该场景的完整用户提示词。
 */
export function promptOf(input: PromptIn): string {
  if (input.field === F_COMPANY) {
    return companyPromptOf({ job: input.job, web: input.web, lang: input.lang })
  }
  if (input.field === F_OCC_READ) {
    return occReadPromptOf({ job: input.job, lang: input.lang })
  }
  if (input.field === F_PROV_READ || input.field === F_CITY_READ) {
    return locReadPromptOf({ field: input.field, job: input.job, lang: input.lang })
  }
  if (input.field === F_JD_READ) {
    return jdReadPromptOf({ job: input.job, jd: input.jd, lang: input.lang })
  }
  if (input.field === F_CO_READ) {
    return coReadPromptOf({ job: input.job, lang: input.lang })
  }
  if (input.field !== F_TITLE && input.field !== F_IMMIGRATION) {
    return fieldPromptOf({ field: input.field, job: input.job, pf: input.pf, lang: input.lang })
  }
  return immigrationPromptOf({ job: input.job, jd: input.jd, lang: input.lang })
}

/**
 * 多轮追问的 system:主 system + 整条岗位事实 + grounding 铁律 ——
 * 防止多轮放开后退回「编」。
 *
 * @param input 岗位事实、JD 摘录、语言与档案块。
 * @returns 对话场景的 system 全文。
 */
export function chatSystemOf(input: ChatSystemIn): string {
  let facts = jobFactsOf(input.job) + NL + scoreFactsOf(input.job) + input.pf
  if (input.jd !== '') {
    facts = facts + CHAT_JD_HEAD + input.jd + CHAT_JD_TAIL
  }
  return systemOf(input.lang) + CHAT_FACTS_HEAD + facts
    + fill({ tpl: CHAT_TAIL, params: { lang: langNameOf(input.lang) } })
}

/**
 * 主 system(全场景共用;zh 附简体字强制段)。
 *
 * @param lang 输出语言。
 * @returns system 全文。
 */
export function systemOf(lang: Lang): string {
  let zhOnly = ''
  if (lang === LANG_ZH) {
    zhOnly = ZH_ONLY
  }
  return fill({ tpl: SYSTEM_TPL, params: { lang: langNameOf(lang), zhOnly } })
}

/**
 * Pro 档案事实块(E5-00 §3.5):自报档案 + 本岗匹配结论。匹配判定在 jobs 域算完
 * 传进来,这里只拼文本 —— 数字与 UI 的 match() 同源,口径一致。
 *
 * @param input 档案各格与匹配结果。
 * @returns 注进 facts 的档案块(首行自带换行)。
 */
export function profileFactsOf(input: ProfileFactsIn): string {
  let nocs = input.nocCodes.join(SLASH_SEP)
  if (nocs === '') {
    nocs = VAL.dash
  }
  let clb = VAL.dash
  if (input.clb != null) {
    clb = String(input.clb)
  }
  let crs = VAL.notReported
  if (input.crs != null) {
    crs = String(input.crs)
  }
  let provs = input.targetProvinces.join(SLASH_SEP)
  if (provs === '') {
    provs = VAL.dash
  }
  let pgwp = VAL.dash
  if (input.pgwpMonthsLeft != null) {
    pgwp = String(input.pgwpMonthsLeft)
  }
  const parts: string[] = [
    fill({ tpl: PROFILE_TPL, params: { nocs, clb, crs, provs, pgwp } }),
    fill({ tpl: PROFILE_MATCH_TPL, params: { level: input.level, score: input.score } }),
  ]
  for (const r of input.reasons) {
    parts.push(reasonLineOf(r))
  }
  parts.push(PROFILE_TAIL)
  return parts.join(NL)
}

/**
 * 一条匹配依据行(行首加短横)。
 *
 * @param reason 已过 reasonEn 的英文句。
 * @returns 列表行。
 */
function reasonLineOf(reason: string): string {
  return REASON_PREFIX + reason
}

/**
 * 读者处境行(E11-04):任何登录用户设了 currentStatus 就注入,让顾问按
 * 海外直申/在职/PGWP 分别措辞;没设返回空串。
 *
 * @param status 已过 statusEn 的英文处境句;没设为 null。
 * @returns 注进 facts 的处境行或空串。
 */
export function readerCtxOf(status: MaybeStr): string {
  if (status == null || status === '') {
    return ''
  }
  return fill({ tpl: READER_CTX_TPL, params: { status } })
}

/**
 * 初判缓存键:版本:字段:标识:语言[:p用户id](带档案的按人隔离;
 * 版本一 bump 陈旧条目永不再服务,#126 教训)。
 *
 * @param input 字段、标识、语言与可空用户 id。
 * @returns 缓存键。
 */
export function cacheKeyOf(input: CacheKeyIn): string {
  let key = [CACHE_VER, input.field, input.keyId, input.lang].join(KEY_SEP)
  if (input.userId != null) {
    key = key + KEY_SEP + KEY_PRO_PREFIX + input.userId
  }
  return key
}

// =========================================================================
// 2. 各场景提示词(公司初判、四个速读、字段解释、初判)
// =========================================================================

/**
 * 公司初判:已知事实(官网抓取为第一权威)+ 联网调查(次级)+ 接地四态 + 反编铁律。
 *
 * @param input 岗位事实、联网调查与语言。
 * @returns 公司初判的用户提示词。
 */
function companyPromptOf(input: CompanyPromptIn): string {
  const j = input.job
  const langName = langNameOf(input.lang)
  const fetchable = HTTP_RE.test(emptyOf(j.officialUrl))
  const desc = trimOf(j.companyDescription).slice(0, CO_DESC_LEN_MAX)
  const sectors = trimOf(j.companySectors).slice(0, CO_SECTORS_LEN_MAX)
  const hasStored = desc !== '' || sectors !== ''
  let webBrief = ''
  let webSources: string[] = []
  if (input.web != null) {
    webBrief = trimOf(input.web.brief).slice(0, CO_WEB_LEN_MAX)
    webSources = input.web.sources
  }
  let known = ''
  if (hasStored) {
    const subs: string[] = []
    if (sectors !== '') {
      subs.push(fill({ tpl: CO_KNOWN.sector, params: { v: sectors } }))
    }
    if (desc !== '') {
      subs.push(fill({ tpl: CO_KNOWN.about, params: { v: desc } }))
    }
    known = CO_KNOWN_HEAD + subs.join(NL) + NL2
  }
  if (webBrief !== '') {
    let srcSeg = ''
    if (webSources.length > 0) {
      srcSeg = fill({ tpl: CO_KNOWN.sources, params: { v: webSources.slice(0, CO_SOURCES_MAX).join(SPACE_SEP) } })
    }
    known = known + CO_WEB_HEAD + webBrief + srcSeg + NL2
  }
  const hasAny = hasStored || webBrief !== ''
  let ground = CO_GROUND_NONE
  if (fetchable && hasAny) {
    ground = CO_GROUND_BOTH
  } else if (fetchable) {
    ground = CO_GROUND_FETCH
  } else if (hasAny) {
    ground = CO_GROUND_STORED
  }
  let site = emptyOf(j.officialUrl)
  if (site === '') {
    site = VAL.unknownSite
  }
  return fill({ tpl: CO_HEAD_TPL, params: { company: orDashOf(j.company), loc: locOf(j), site } })
    + known + ground + NL2 + CO_ANTI_FAB + NL2
    + fill({ tpl: HEADINGS_INSTR, params: { heads: headingsOf(input.lang).company, lang: langName } }) + NL
    + fill({ tpl: CO_OUTPUT_RULES, params: { lang: langName } })
}

/**
 * 职业速读:只喂职业级事实(NOC/TEER/大类 + 官方职责/要求原文),不带本岗
 * 标题/公司/薪资 —— 按 NOC 缓存干净,措辞不跑偏到移民建议。
 *
 * @param input 岗位事实(职业格)与语言。
 * @returns 职业速读的用户提示词。
 */
function occReadPromptOf(input: OccReadPromptIn): string {
  const j = input.job
  const duties = clipLinesOf({ text: emptyOf(j.duties), maxLines: OCC_DUTY_LINES_MAX, maxLen: OCC_DUTY_LEN_MAX })
  const reqs = clipLinesOf({ text: emptyOf(j.requirements), maxLines: OCC_REQ_LINES_MAX, maxLen: OCC_REQ_LEN_MAX })
  const pieces: string[] = [
    fill({ tpl: OCC_FACT.head, params: { noc: orDashOf(j.noc), teer: numOrDashOf(teerOf(j.noc)), cat: catOf(j) } }),
  ]
  if (duties !== '') {
    pieces.push(fill({ tpl: OCC_FACT.duties, params: { v: duties } }))
  }
  if (reqs !== '') {
    pieces.push(fill({ tpl: OCC_FACT.requirements, params: { v: reqs } }))
  }
  return ASK.occRead + NL2 + fill({ tpl: OCC_FACT.factsHead, params: { v: pieces.join(NL2) } }) + NL2
    + fill({ tpl: READS_OUTPUT, params: { lang: langNameOf(input.lang) } }) + SPACE_SEP + OCC_READ_TAIL
}

/**
 * 地点速读(省/市区):只喂面板同源的数字块;红线同 GROUNDING_RULES ——
 * 粗口径聚合禁化成概率/资格;整句目标语言(语言纯度令)。
 *
 * @param input 场景名、岗位事实(locationFacts 格)与语言。
 * @returns 地点速读的用户提示词。
 */
function locReadPromptOf(input: LocReadPromptIn): string {
  const facts = emptyOf(input.job.locationFacts).slice(0, LOC_FACTS_LEN_MAX)
  let ask = CITY_READ_ASK
  if (input.field === F_PROV_READ) {
    ask = PROV_READ_ASK
  }
  const langName = langNameOf(input.lang)
  return ask + NL2 + LOC_FACTS_HEAD + facts + NL2 + GROUNDING_RULES + NL2
    + fill({ tpl: READS_OUTPUT, params: { lang: langName } }) + SPACE_SEP
    + fill({ tpl: LANG_PURITY, params: { lang: langName } }) + SPACE_SEP + LOC_READ_TAIL
}

/**
 * 职位帖速读:只喂 JD 原文 + 帖面基本盘,总结职位本身;移民路径解读归初判。
 *
 * @param input 岗位事实、JD 原文与语言。
 * @returns 职位帖速读的用户提示词。
 */
function jdReadPromptOf(input: JdReadPromptIn): string {
  const j = input.job
  const langName = langNameOf(input.lang)
  let pay = emptyOf(j.salary)
  if (pay === '') {
    pay = VAL.notStated
  }
  const facts = fill({ tpl: JD_FACTS_TPL, params: { title: orDashOf(j.title), company: orDashOf(j.company), loc: locOf(j), pay } })
  let src = JD_READ_MISSING
  if (input.jd !== '') {
    src = fill({ tpl: JD_READ_SRC_HEAD, params: { lang: langName } }) + input.jd + CHAT_JD_TAIL
  }
  return JD_READ_ASK + NL2 + facts + NL2 + src + NL2
    + fill({ tpl: READS_OUTPUT, params: { lang: langName } }) + SPACE_SEP + JD_READ_TAIL
}

/**
 * 公司速读:只喂已抓的公司事实(行业/简介/担保股别),#167⑨ 严禁联网/凭名字编。
 *
 * @param input 岗位事实(公司格 + LMIA 格)与语言。
 * @returns 公司速读的用户提示词。
 */
function coReadPromptOf(input: CoReadPromptIn): string {
  const j = input.job
  let spLine = CO_SPONSOR.none
  if (j.lmiaPositions != null && j.lmiaPositions > 0) {
    let skilled = ''
    if (j.lmiaPositionsSkilled != null) {
      skilled = fill({ tpl: CO_SPONSOR.skilledSeg, params: { v: j.lmiaPositionsSkilled } })
    }
    let quarter = ''
    if (j.lmiaLastQuarter != null && j.lmiaLastQuarter !== '') {
      quarter = fill({ tpl: CO_SPONSOR.quarterSeg, params: { v: j.lmiaLastQuarter } })
    }
    spLine = fill({ tpl: CO_SPONSOR.lmia, params: { tot: j.lmiaPositions, skilled, quarter } })
  } else if (j.aip) {
    spLine = CO_SPONSOR.aip
  }
  const rows: string[] = [
    fill({ tpl: CO_FACT.company, params: { v: orDashOf(j.company) } }),
    fill({ tpl: CO_FACT.location, params: { v: locOf(j) } }),
  ]
  const sectors = trimOf(j.companySectors)
  if (sectors !== '') {
    rows.push(fill({ tpl: CO_FACT.sector, params: { v: sectors } }))
  }
  const about = trimOf(j.companyDescription).slice(0, CO_ABOUT_LEN_MAX)
  if (about !== '') {
    rows.push(fill({ tpl: CO_FACT.about, params: { v: about } }))
  }
  rows.push(spLine)
  return CO_READ_ASK + NL2 + fill({ tpl: CO_FACT.factsHead, params: { v: rows.join(NL) } }) + NL2
    + fill({ tpl: READS_OUTPUT, params: { lang: langNameOf(input.lang) } }) + SPACE_SEP + CO_READ_RULES
}

/**
 * 其它字段的解释:岗位事实(评分字段附档位明细)喂进去,模型只负责按所选语言
 * 解释,数字用我们给的;薪资类字段而中位缺失时追加禁编中位令。
 *
 * @param input 字段名、岗位事实、档案块与语言。
 * @returns 字段解释的用户提示词。
 */
function fieldPromptOf(input: FieldPromptIn): string {
  let ask = ASK[input.field]
  if (ask == null) {
    ask = fill({ tpl: ASK_FALLBACK_TPL, params: { v: input.field } })
  }
  if (WAGE_FIELDS.includes(input.field) && input.job.wageMedAnnual == null) {
    ask = ask + NO_MEDIAN_RULE
  }
  let facts = jobFactsOf(input.job)
  if (input.field === F_SCORE) {
    facts = facts + NL + scoreFactsOf(input.job)
  }
  facts = facts + input.pf
  const langName = langNameOf(input.lang)
  if (SIMPLE_FIELDS.includes(input.field)) {
    return ask + NL + READER_LINE + NL2 + JOB_FACTS_HEAD + facts + NL2
      + fill({ tpl: SIMPLE_OUTPUT, params: { lang: langName } })
  }
  return ask + NL + READER_LINE + NL2 + JOB_FACTS_HEAD + facts + NL2
    + fill({ tpl: SECTIONS_OUTPUT, params: { lang: langName } })
}

/**
 * 初判(title/immigration):头四行 + 本站三通道信号 + 分步方案/接地/海洋省规则;
 * 有 JD 附原文,无 JD 走兜底行。#161 修:信号必须进提示词,不给数据才是编的根源。
 *
 * @param input 岗位事实、JD 原文与语言。
 * @returns 初判的用户提示词。
 */
function immigrationPromptOf(input: ImmigrationPromptIn): string {
  const j = input.job
  const langName = langNameOf(input.lang)
  let atlanticRule = ''
  if (ATLANTIC_PROVS.includes(emptyOf(j.province).toUpperCase())) {
    atlanticRule = fill({ tpl: ATLANTIC_RULE, params: { prov: provFullOf(j.province) } })
  }
  const base = fill({ tpl: IMM_HEAD_TPL, params: { title: orDashOf(j.title), company: orDashOf(j.company), nocLine: nocLineOf(j), loc: locOf(j) } })
    + PATH_FACTS_HEAD + pathFactsOf(j) + NL
  const instr = fill({ tpl: HEADINGS_INSTR, params: { heads: headingsOf(input.lang).title, lang: langName } })
    + PLAN_RULES + NL + GROUNDING_RULES + atlanticRule
  if (input.jd !== '') {
    return base + fill({ tpl: JD_BLOCK_HEAD, params: { lang: langName } }) + input.jd + JD_BLOCK_TAIL
      + instr + PREP_EXTRA
  }
  return base + NO_JD_LINE + instr
}

// =========================================================================
// 3. 事实块拼装(岗位事实行、档位事实、通道信号)
// =========================================================================

/**
 * 岗位事实行(每行带来源短标注,E4-04 §3.5);缺格行不出 —— 红线:没数据别答。
 *
 * @param j 岗位事实。
 * @returns 多行事实块。
 */
function jobFactsOf(j: AdvisorJob): string {
  const lines: string[] = [
    fill({ tpl: JOB_FACT.title, params: { v: orDashOf(j.title) } }),
    fill({ tpl: JOB_FACT.company, params: { v: orDashOf(j.company) } }),
  ]
  const sectors = trimOf(j.companySectors)
  if (sectors !== '') {
    lines.push(fill({ tpl: JOB_FACT.sector, params: { v: sectors } }))
  }
  const about = trimOf(j.companyDescription).slice(0, CO_ABOUT_LEN_MAX)
  if (about !== '') {
    lines.push(fill({ tpl: JOB_FACT.about, params: { v: about } }))
  }
  lines.push(fill({ tpl: JOB_FACT.noc, params: { noc: orDashOf(j.noc), teer: numOrDashOf(teerOf(j.noc)), cat: catOf(j) } }))
  let locV = [emptyOf(j.district), emptyOf(j.city), provFullOf(j.province)].filter(isNonempty).join(COMMA_SEP)
  if (locV === '') {
    locV = VAL.dash
  }
  lines.push(fill({ tpl: JOB_FACT.location, params: { v: locV } }))
  lines.push(fill({ tpl: JOB_FACT.signals, params: {
    score: numOrDashOf(j.score), pnp: boolWordOf(j.pnpEligible), ee: orNoneOf(j.eeCategory),
    aip: boolWordOf(j.aip), acc: orDashOf(j.accessibility),
  } }))
  let yr = ''
  if (j.salaryAnnual != null) {
    yr = fill({ tpl: YR_SEG, params: { v: kOf(j.salaryAnnual) } })
  }
  lines.push(fill({ tpl: JOB_FACT.salary, params: { v: orDashOf(j.salary), yr } }))
  const emp = [emptyOf(j.employmentTerm), emptyOf(j.employmentHours)].filter(isNonempty).join(COMMA_SEP)
  if (emp !== '') {
    lines.push(fill({ tpl: JOB_FACT.employment, params: { v: emp } }))
  }
  if (j.education != null && j.education !== '') {
    lines.push(fill({ tpl: JOB_FACT.education, params: { v: j.education } }))
  }
  if (j.certificates.length > 0) {
    lines.push(fill({ tpl: JOB_FACT.certificates, params: { v: j.certificates.join(SEMI_SEP) } }))
  }
  const median = medianLineOf(j)
  if (median !== '') {
    lines.push(median)
  }
  let label = emptyOf(j.sourceLabel)
  if (label === '') {
    label = emptyOf(j.source)
  }
  if (label === '') {
    label = VAL.dash
  }
  let status = emptyOf(j.status)
  if (status === '') {
    status = VAL.open
  }
  lines.push(fill({ tpl: JOB_FACT.source, params: {
    label, origin: orDashOf(j.origin), posted: dateSlotOf(j.datePosted), seen: dateSlotOf(j.lastSeen), status,
  } }))
  return lines.join(NL)
}

/**
 * 当地中位行:annual 在才出。保形:老链此格不判 hourly 缺失,annual 在而 hourly
 * 空会打出 null —— eval 对拍期不改口径。
 *
 * @param j 岗位事实。
 * @returns 中位行;annual 缺为空串(行不出)。
 */
function medianLineOf(j: AdvisorJob): string {
  if (j.wageMedAnnual == null) {
    return ''
  }
  return fill({ tpl: JOB_FACT.median, params: { hr: String(j.wageMedHourly), yr: kOf(j.wageMedAnnual) } })
}

/**
 * 评分事实(E12-08 档位制,#126/#133 修):喂档名语义与三驱动因子,明令禁报
 * X/5 与 0-100 总分。
 *
 * @param j 岗位事实。
 * @returns 档位事实段。
 */
function scoreFactsOf(j: AdvisorJob): string {
  const noc = emptyOf(j.noc)
  const teer = teerOf(j.noc)
  let streamPiece = DRIVER.streamMiss
  if (j.pnpStream != null && j.pnpStream !== '') {
    streamPiece = fill({ tpl: DRIVER.streamHit, params: { v: j.pnpStream } })
  }
  let teerPiece = DRIVER.unclassified
  if (teer != null) {
    teerPiece = fill({ tpl: DRIVER.teer, params: { v: teer } })
  }
  let demandPiece = DRIVER.notIndemand
  if (noc !== '' && INDEMAND_NOC2.includes(noc.slice(0, NOC_GROUP_LEN))) {
    demandPiece = DRIVER.indemand
  }
  let tier = DRIVER.notAssessed
  if (j.gradeChannel != null) {
    let name = CH_NAME[j.gradeChannel]
    if (name == null) {
      name = DRIVER.unknown
    }
    tier = QUOTE + name + QUOTE
  }
  return fill({ tpl: SCORE_FACTS_TPL, params: { tier, drivers: [streamPiece, teerPiece, demandPiece].join(SEMI_SEP) } })
}

/**
 * 本站三通道信号(初判喂给模型的计算结果;#161 修「一个信号都没进提示词」)。
 *
 * @param j 岗位事实。
 * @returns 三行信号块。
 */
function pathFactsOf(j: AdvisorJob): string {
  let stream = ''
  if (j.pnpStream != null && j.pnpStream !== '') {
    stream = fill({ tpl: STREAM_SEG, params: { v: j.pnpStream } })
  }
  return fill({ tpl: PATH_FACTS_TPL, params: {
    pnp: boolWordOf(j.pnpEligible), stream, ee: orNoneOf(j.eeCategory), aip: boolWordOf(j.aip),
  } })
}

// =========================================================================
// 4. 取值词汇与小件(空值口径、截断、省全名、语言名)
// =========================================================================

/**
 * 多行原文的截断:逐行 trim 去空行,先截行数再截总长(occRead 口径)。
 *
 * @param input 原文与两个上限。
 * @returns 截断后的多行文本。
 */
function clipLinesOf(input: ClipLinesIn): string {
  return input.text.split(NL).map(trimStrOf).filter(isNonempty).slice(0, input.maxLines)
    .join(NL).slice(0, input.maxLen)
}

/**
 * trim 一个非空断言过的串(named callback,给 map 用)。
 *
 * @param s 原串。
 * @returns 去首尾空白的串。
 */
function trimStrOf(s: string): string {
  return s.trim()
}

/**
 * 非空判(named callback,给 filter 用)。
 *
 * @param s 待判串。
 * @returns 非空为真。
 */
function isNonempty(s: string): boolean {
  return s !== ''
}

/**
 * 初判的 NOC 行:识别出 NOC 给三元组行,没识别给占位句。
 *
 * @param j 岗位事实。
 * @returns NOC 行。
 */
function nocLineOf(j: AdvisorJob): string {
  if (j.noc == null || j.noc === '') {
    return NOC_NONE_LINE
  }
  return fill({ tpl: OCC_FACT.head, params: { noc: j.noc, teer: numOrDashOf(teerOf(j.noc)), cat: catOf(j) } })
}

/**
 * 单行地点:精确地址优先,其次 市, 省全名,都没有给占位。
 *
 * @param j 岗位事实。
 * @returns 地点串。
 */
function locOf(j: AdvisorJob): string {
  if (j.address != null && j.address !== '') {
    return j.address
  }
  const joined = [emptyOf(j.city), provFullOf(j.province)].filter(isNonempty).join(COMMA_SEP)
  if (joined === '') {
    return VAL.dash
  }
  return joined
}

/**
 * 省码 → 省全名(#168:对模型一律给全名,两字母码它会猜错);未知码原样回退。
 *
 * @param code 省码;没有为 null。
 * @returns 省全名、原码或空串。
 */
function provFullOf(code: MaybeStr): string {
  if (code == null || code === '') {
    return ''
  }
  const name = PROV_NAMES[code.toUpperCase()]
  if (name == null) {
    return code
  }
  return name
}

/**
 * 本站大类名:直接读 job.broad(ETL 算好存字段;拿 NOC 首位现推常年是错的)。
 *
 * @param j 岗位事实。
 * @returns 大类名或「未分类」。
 */
function catOf(j: AdvisorJob): string {
  if (j.broad != null && j.broad !== '') {
    return j.broad
  }
  return VAL.uncategorized
}

/**
 * NOC 码取 TEER 位(长度 5 且第二位是数字才算,与老链判据同义)。
 * 导出给 routes 拼 MatchJob(第二消费者)。
 *
 * @param noc NOC 码;没有为 null。
 * @returns TEER 数字或 null。
 */
export function teerOf(noc: MaybeStr): MaybeNum {
  if (noc == null) {
    return null
  }
  const m = NOC_TEER_RE.exec(noc)
  if (m == null) {
    return null
  }
  const g = m.groups
  if (g == null) {
    return null
  }
  const digit = g.teer
  if (digit == null) {
    return null
  }
  return Number(digit)
}

/**
 * 语言码 → 喂模型的语言名。
 *
 * @param lang 输出语言。
 * @returns 语言名。
 */
function langNameOf(lang: Lang): string {
  return LANG_NAMES[lang]
}

/**
 * 语言码 → 该语言的分段标题组。
 *
 * @param lang 输出语言。
 * @returns 公司/初判两组标题。
 */
function headingsOf(lang: Lang): HeadingPair {
  return HEADINGS[lang]
}

/**
 * 空值口径:null/空串 → 长横占位(帖面串格通用)。
 *
 * @param v 原值。
 * @returns 非空串。
 */
function orDashOf(v: MaybeStr): string {
  if (v == null || v === '') {
    return VAL.dash
  }
  return v
}

/**
 * 空值口径:null → 空串(供拼接/过滤)。
 *
 * @param v 原值。
 * @returns 串(可空串)。
 */
function emptyOf(v: MaybeStr): string {
  if (v == null) {
    return ''
  }
  return v
}

/**
 * 空值口径:null → 空串后 trim(公司行业/简介格)。
 *
 * @param v 原值。
 * @returns 去首尾空白的串。
 */
function trimOf(v: MaybeStr): string {
  return emptyOf(v).trim()
}

/**
 * 空值口径:数字为空给长横(TEER/旧分数槽)。
 *
 * @param v 原值。
 * @returns 数字串或长横。
 */
function numOrDashOf(v: MaybeNum): string {
  if (v == null) {
    return VAL.dash
  }
  return String(v)
}

/**
 * 布尔 → yes/no(信号格喂模型的词)。
 *
 * @param b 布尔值。
 * @returns yes 或 no。
 */
function boolWordOf(b: boolean): string {
  if (b) {
    return VAL.yes
  }
  return VAL.no
}

/**
 * 空值口径:EE 类别为空给 none(老链口径,与长横不同词)。
 *
 * @param v 原值。
 * @returns 类别名或 none。
 */
function orNoneOf(v: MaybeStr): string {
  if (v == null || v === '') {
    return VAL.none
  }
  return v
}

/**
 * 年薪 → 千位取整(~$K/yr 槽)。
 *
 * @param n 年薪。
 * @returns 千位数。
 */
function kOf(n: number): number {
  return Math.round(n / K_DIV)
}

/**
 * ISO 时间串 → 日期段(前 10 位),空给长横。
 *
 * @param v 原值。
 * @returns 日期串或长横。
 */
function dateSlotOf(v: MaybeStr): string {
  const s = emptyOf(v).slice(0, ISO_DATE_LEN)
  if (s === '') {
    return VAL.dash
  }
  return s
}

// =========================================================================
// 5. 运行(pi 循环与工具;样板 lib/consult 的 draftOnce,advisor 直用 pi 库)
// =========================================================================

/**
 * 跑一趟 advisor 循环:一段 system + 一段提示词 + 工具表 → 模型全文。
 * 简单场景传空工具表 ≈ 一发调用,零额外开销(2026-08-23 Frank 拍板全场景上循环)。
 * 流式增量走 onDelta;整趟预算 LOOP_TIMEOUT_MS,到点掐断。
 *
 * 里面的嵌套件按闸的规矩不再各挂 JSDoc,要点:onTimeout 到点掐断;onEvent 只管
 * 正文增量(思考期间 content 是空串不是缺字段,按真值判会漏计);末参那句
 * `streamSimple as StreamFn` 是跨边界断言 —— pi 的 StreamFn 要通吃所有 Api,
 * 这个 stream 锁死 openai-completions,逆变对不上,只能断言(宪法「跨边界的断言留着」)。
 *
 * @param input 这一趟要的东西。
 * @returns 模型全文(闸前)。
 */
export async function runAdvisor(input: RunIn): RunOut {
  const ac = new AbortController()

  function onTimeout(): void {
    ac.abort()
  }
  const timer = setTimeout(onTimeout, LOOP_TIMEOUT_MS)
  const sent = { n: 0 }

  function onEvent(event: EventIn): void {
    if (event.type !== MESSAGE_UPDATE || event.message == null || input.onDelta == null) {
      return
    }
    const full = textOf(event.message)
    if (full.length <= sent.n) {
      return
    }
    input.onDelta(full.slice(sent.n))
    sent.n = full.length
  }

  try {
    const messages = await runAgentLoop(
      [userMsgOf(input.prompt)],
      { systemPrompt: input.system, messages: [], tools: input.tools },
      {
        model: model(), apiKey: KEY || NO_KEY_PLACEHOLDER, maxTokens: input.maxTokens,
        convertToLlm: passThroughMessages,
      },
      onEvent,
      ac.signal,
      streamSimple as StreamFn,
    )
    return lastTextOf({ messages: messages, aborted: ac.signal.aborted })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * pi 模型描述符(与 consult 同一后端链;鉴权头只在真有钥匙时才挂 ——
 * 裸 Ollama 挂空 Authorization 反被当鉴权失败)。
 *
 * @returns 模型描述符。
 */
function model(): ModelOut {
  const m: Model<'openai-completions'> = {
    id: MODEL_ID,
    name: MODEL_ID,
    api: API,
    provider: PROVIDER,
    baseUrl: `${BASE}${V1}`,
    reasoning: false,
    input: [BLOCK_TEXT],
    contextWindow: CONTEXT_WINDOW,
    maxTokens: CONTEXT_WINDOW,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    samplingParams: SAMPLING,
  }
  if (KEY) {
    m.headers = { [AUTH_HEADER]: `${BEARER}${KEY}` }
  }
  return m
}

/**
 * 用户轮消息(pi 形状;循环的第一条)。
 *
 * @param text 提示词全文。
 * @returns pi 的 user 消息。
 */
function userMsgOf(text: string): TranscriptMsg {
  return { role: ROLE_USER, content: [{ type: BLOCK_TEXT, text }], timestamp: Date.now() }
}

/**
 * 消息取正文(只认助手轮的文本块;思考/工具块不算,别的轮空串)。
 *
 * @param message 循环里的一条消息。
 * @returns 目前累积的正文。
 */
function textOf(message: TranscriptMsg): string {
  if (message.role !== ROLE_ASSISTANT) {
    return ''
  }
  const parts: string[] = []
  for (const block of message.content) {
    if (block.type === BLOCK_TEXT) {
      parts.push(block.text)
    }
  }
  return parts.join('')
}

/**
 * 从循环整串消息取最后一段助手正文;超时/空产出都抛,不返回空串
 * (consult 生产日志回放的教训:pi 被 abort 是正常返回不抛,只能在这认)。
 *
 * @param input 消息串与是否被掐断。
 * @returns 最后一段有字的正文。
 */
function lastTextOf(input: LastTextIn): string {
  const drafts: string[] = []
  for (const m of input.messages) {
    const t = textOf(m)
    if (t !== '') {
      drafts.push(t)
    }
  }
  if (input.aborted) {
    throw chatError({ code: CHAT_CODE.busy, msg: String(LOOP_TIMEOUT_MS), slots: null })
  }
  if (drafts.length === 0) {
    throw chatError({ code: CHAT_CODE.llm, msg: '', slots: null })
  }
  return drafts[drafts.length - 1]
}

/**
 * 造 web_fetch 工具(company 场景专用):URL 由服务端定死为官网,模型只决定调不调。
 * 抓失败回失败句 —— 反编铁律「不得谎称网站不可访问,除非工具真的返回了错误」靠它成立。
 *
 * @param input 定死的官网 URL。
 * @returns 单元素工具表。
 */
export function webFetchToolOf(input: WebFetchToolIn): ToolList {
  // eslint-disable-next-line local/one-parameter, local/typed-signature -- pi 的 execute(toolCallId, args) 签名库定死
  async function execFetch(): ReplyOut {
    try {
      const res = await fetch(input.url, { signal: AbortSignal.timeout(WEBFETCH_TIMEOUT_MS) })
      if (res.ok === false) {
        return replyOf(WEB_FETCH_FAIL)
      }
      const html = await res.text()
      const text = htmlTextOf(html).slice(0, WEBFETCH_TEXT_MAX)
      if (text === '') {
        return replyOf(WEB_FETCH_FAIL)
      }
      return replyOf(text)
    } catch {
      return replyOf(WEB_FETCH_FAIL)
    }
  }
  return [{
    name: TOOL_WEB_FETCH, label: TOOL_WEB_FETCH, description: WEB_FETCH_DESC,
    parameters: WEB_FETCH_PARAMS, execute: execFetch,
  }]
}

/**
 * 工具回执(文本一段)。
 *
 * @param text 回给模型的正文。
 * @returns pi 形状的回执。
 */
function replyOf(text: string): Reply {
  return { content: [{ type: BLOCK_TEXT, text }], details: { n: text.length }, terminate: false }
}

/**
 * 抓回的 HTML → 可读文本(去 script/style/标签,空白折一)。
 *
 * @param html 原始页面。
 * @returns 素文本。
 */
function htmlTextOf(html: string): string {
  return html.replace(HTML_SCRIPT_RE, SPACE_SEP).replace(HTML_STYLE_RE, SPACE_SEP)
    .replace(HTML_TAG_RE, SPACE_SEP).replace(WS_RE, SPACE_SEP).trim()
}

/**
 * 多轮追问折转写:历史轮 + 本轮拼成一段提示词。
 * (老链发的是 role 数组;pi 的 AssistantMessage 形状由后端定不伪造,改走转写注入 ——
 * 2026-08-23 记录在案的传输形状差异,eval 对拍盯语义。)
 *
 * @param input 追问轮。
 * @returns 转写块。
 */
export function chatPromptOf(input: ChatPromptIn): string {
  const lines: string[] = []
  for (const m of input.messages) {
    if (m.role === ROLE_USER) {
      lines.push(TURN_USER + m.content)
    } else {
      lines.push(TURN_ADVISOR + m.content)
    }
  }
  return TURN_HEAD + lines.join(NL)
}

// =========================================================================
// 6. 地点事实块(自 Advisor.tsx aiFacts() 逐字搬入,服务端与面板同源重建)
// =========================================================================

/**
 * 省级地点事实块(provRead):难度档 + 体量数,与 /stats 面板同一份 jsonb。
 *
 * @param input 省码与省情报卡。
 * @returns 多行事实块。
 */
export function provFactsOf(input: ProvFactsIn): string {
  const out: string[] = [fill({ tpl: LOC_FACT.provHead, params: { name: provFullOf(input.code), code: input.code } })]
  const isQc = input.code === QC_CODE
  if (isQc) {
    out.push(LOC_FACT.qc)
  }
  const diff = cellObjOf(input.card.difficulty)
  let factors: CellList = []
  if (diff != null) {
    factors = cellListOf(atOf({ obj: diff, key: LOC_KEY.factors }))
  }
  let tier = ''
  if (diff != null) {
    tier = slotCellOf(atOf({ obj: diff, key: LOC_KEY.tier }))
  }
  if (tier !== '') {
    out.push(fill({ tpl: LOC_FACT.tier, params: {
      tier, comp: compSegOf(factorOf({ list: factors, key: LOC_KEY.comp })),
      trend: trendSegOf(factorOf({ list: factors, key: LOC_KEY.quotaTrend })),
      act: actSegOf(factorOf({ list: factors, key: LOC_KEY.activity })),
    } }))
  }
  const info = cellObjOf(input.card.info)
  if (info != null) {
    pushVolLine({ out, obj: cellObjOf(atOf({ obj: info, key: LOC_KEY.study })), tpl: LOC_FACT.study })
    pushVolLine({ out, obj: cellObjOf(atOf({ obj: info, key: LOC_KEY.tfwp })), tpl: LOC_FACT.tfwp })
    pushVolLine({ out, obj: cellObjOf(atOf({ obj: info, key: LOC_KEY.imp })), tpl: LOC_FACT.imp })
    const alloc = cellObjOf(atOf({ obj: info, key: LOC_KEY.alloc }))
    if (isQc === false && alloc != null && cellNumOf(atOf({ obj: alloc, key: LOC_KEY.y2026 })) != null) {
      let prev = ''
      if (cellNumOf(atOf({ obj: alloc, key: LOC_KEY.y2025 })) != null) {
        prev = fill({ tpl: LOC_FACT.allocPrevSeg, params: { v: slotCellOf(atOf({ obj: alloc, key: LOC_KEY.y2025 })) } })
      }
      out.push(fill({ tpl: LOC_FACT.alloc, params: { v: slotCellOf(atOf({ obj: alloc, key: LOC_KEY.y2026 })), prev } }))
    }
    const pnpPr = cellObjOf(atOf({ obj: info, key: LOC_KEY.pnpPr }))
    if (isQc === false && pnpPr != null) {
      pushVolLine({ out, obj: pnpPr, tpl: LOC_FACT.pnpPr })
    }
  }
  return out.join(NL)
}

/**
 * 竞争比子句(因子缺 = 空串)。
 *
 * @param f 竞争比因子。
 * @returns 子句或空串。
 */
function compSegOf(f: MaybeObj): string {
  if (f == null) {
    return ''
  }
  let asOf = slotCellOf(atOf({ obj: f, key: LOC_KEY.asOf }))
  if (asOf === '') {
    asOf = VAL.qmark
  }
  return fill({ tpl: LOC_FACT.compSeg, params: {
    v: slotCellOf(atOf({ obj: f, key: LOC_KEY.value })), pool: slotCellOf(atOf({ obj: f, key: LOC_KEY.pool })),
    asOf, quota: slotCellOf(atOf({ obj: f, key: LOC_KEY.quota })), quotaYear: slotCellOf(atOf({ obj: f, key: LOC_KEY.quotaYear })),
  } })
}

/**
 * 配额同比子句(因子缺 = 空串;值乘 100 取整)。
 *
 * @param f 同比因子。
 * @returns 子句或空串。
 */
function trendSegOf(f: MaybeObj): string {
  if (f == null) {
    return ''
  }
  let v = cellNumOf(atOf({ obj: f, key: LOC_KEY.value }))
  if (v == null) {
    v = 0
  }
  return fill({ tpl: LOC_FACT.trendSeg, params: { v: Math.round(v * PCT_100) } })
}

/**
 * 抽选活跃子句(因子缺 = 空串;邀请数缺按 0,老链口径)。
 *
 * @param f 活跃因子。
 * @returns 子句或空串。
 */
function actSegOf(f: MaybeObj): string {
  if (f == null) {
    return ''
  }
  let inv = cellNumOf(atOf({ obj: f, key: LOC_KEY.invitations }))
  if (inv == null) {
    inv = 0
  }
  return fill({ tpl: LOC_FACT.actSeg, params: { v: slotCellOf(atOf({ obj: f, key: LOC_KEY.value })), inv } })
}

/**
 * 体量行:{n}/{year} 两槽的对象格,格在才出行。
 *
 * @param input 输出数组、对象格与行模板。
 */
function pushVolLine(input: VolLineIn): void {
  if (input.obj == null) {
    return
  }
  input.out.push(fill({ tpl: input.tpl, params: {
    n: slotCellOf(atOf({ obj: input.obj, key: LOC_KEY.n })), year: slotCellOf(atOf({ obj: input.obj, key: LOC_KEY.year })),
  } }))
}

/**
 * 市/区级地点事实块(cityRead):本站在招聚合,与市卡面板同一取数。
 *
 * @param input 市、省、区与市情报卡。
 * @returns 多行事实块。
 */
export function cityFactsOf(input: CityFactsIn): string {
  const card = input.card
  const provName = provFullOf(input.prov)
  if (input.district !== '' && card.district != null) {
    const dd = card.district
    const lines: string[] = [
      fill({ tpl: LOC_FACT.districtHead, params: { district: input.district, city: input.city, prov: provName } }),
      fill({ tpl: LOC_FACT.districtJobs, params: { open: dd.openJobs, new7d: dd.new7d } }),
    ]
    if (dd.medSalary != null) {
      lines.push(fill({ tpl: LOC_FACT.medSalary, params: { v: dd.medSalary } }))
    }
    if (dd.topBroads.length > 0) {
      lines.push(fill({ tpl: LOC_FACT.topBroads, params: { v: dd.topBroads.map(broadItemOf).join(COMMA_SEP) } }))
    }
    if (dd.topEmployers.length > 0) {
      lines.push(fill({ tpl: LOC_FACT.topEmployers, params: { v: dd.topEmployers.map(employerItemOf).join(COMMA_SEP) } }))
    }
    return lines.join(NL)
  }
  const lines: string[] = [
    fill({ tpl: LOC_FACT.cityHead, params: { city: input.city, prov: provName } }),
    fill({ tpl: LOC_FACT.cityJobs, params: { open: card.openJobs, new7d: card.new7d } }),
  ]
  if (card.medSalary != null) {
    lines.push(fill({ tpl: LOC_FACT.medSalary, params: { v: card.medSalary } }))
  }
  if (card.topBroads.length > 0) {
    lines.push(fill({ tpl: LOC_FACT.topBroads, params: { v: card.topBroads.map(broadItemOf).join(COMMA_SEP) } }))
  }
  if (card.dli.count > 0) {
    lines.push(fill({ tpl: LOC_FACT.dli, params: { n: card.dli.count, names: card.dli.top.map(dliNameOf).join(COMMA_SEP) } }))
  }
  if (card.aipEmployers > 0) {
    lines.push(fill({ tpl: LOC_FACT.aipEmployers, params: { n: card.aipEmployers } }))
  }
  return lines.join(NL)
}

/**
 * 大类单项(named callback,给 map 用)。
 *
 * @param b 大类计数行。
 * @returns 「大类 数」。
 */
function broadItemOf(b: BroadCountCell): string {
  return fill({ tpl: LOC_FACT.broadItem, params: { broad: b.broad, n: b.n } })
}

/**
 * 热门雇主单项(named callback,给 map 用)。
 *
 * @param e 雇主计数行。
 * @returns 「名 (n open)」。
 */
function employerItemOf(e: EmployerCountCell): string {
  return fill({ tpl: LOC_FACT.employerItem, params: { name: e.name, n: e.n } })
}

/**
 * 院校名(named callback,给 map 用)。
 *
 * @param s 院校行。
 * @returns 名字。
 */
function dliNameOf(s: NamedCell): string {
  return s.name
}

/**
 * 对象格按键取值(缺键当 null,语言接缝在这一行收掉)。
 *
 * @param input 对象与键。
 * @returns 格值;缺为 null。
 */
function atOf(input: CellAtIn): Cell {
  const v = input.obj[input.key]
  if (v == null) {
    return null
  }
  return v
}

/**
 * 格 → 对象(数组与标量都不算)。
 *
 * @param v 格值。
 * @returns 对象或 null。
 */
function cellObjOf(v: Cell): MaybeObj {
  if (typeof v === 'object' && v !== null && Array.isArray(v) === false) {
    return v
  }
  return null
}

/**
 * 格 → 数组(不是数组给空表)。
 *
 * @param v 格值。
 * @returns 数组。
 */
function cellListOf(v: Cell): CellList {
  if (Array.isArray(v)) {
    return v
  }
  return []
}

/**
 * 格 → 数字(不是数字给 null;官方可空,禁折 0)。
 *
 * @param v 格值。
 * @returns 数字或 null。
 */
function cellNumOf(v: Cell): MaybeNum {
  if (typeof v === 'number') {
    return v
  }
  return null
}

/**
 * 格 → 显示槽(数字原样、串原样、其余空串)。
 *
 * @param v 格值。
 * @returns 槽值串。
 */
function slotCellOf(v: Cell): string {
  if (typeof v === 'number') {
    return String(v)
  }
  if (typeof v === 'string') {
    return v
  }
  return ''
}

/**
 * 因子数组里按 key 找一个(difficulty.factors 的形状)。
 *
 * @param input 数组与目标 key。
 * @returns 因子对象;找不到 null。
 */
function factorOf(input: FactorIn): MaybeObj {
  for (const item of input.list) {
    const obj = cellObjOf(item)
    if (obj != null && slotCellOf(atOf({ obj, key: LOC_KEY.key })) === input.key) {
      return obj
    }
  }
  return null
}

// =========================================================================
// 7. 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段)
// =========================================================================

/**
 * jobs 整行 → 本域岗位事实(契约换 id 制的落点:服务端现查行,前端整包不再采信)。
 * JobRow 的空串口径原样透传 —— 拼装层的 orDashOf 对 ''/null 同判。
 *
 * @param row jobs 域 fetchJobById 的整行。
 * @returns 岗位事实。
 */
export function toAdvisorJob(row: JobRowCell): AdvisorJob {
  return {
    title: row.title, company: row.company, companyDescription: row.companyDescription,
    companySectors: row.companySectors, noc: row.noc, broad: row.broad, province: row.province,
    city: row.city, district: row.district, address: row.address, officialUrl: row.officialUrl,
    applyUrl: row.applyUrl, score: row.score, gradeChannel: row.gradeChannel,
    accessibility: row.accessibility, pnpEligible: row.pnpEligible, pnpStream: row.pnpStream,
    eeCategory: row.eeCategory, aip: row.aip, salary: row.salary, salaryAnnual: row.salaryAnnual,
    employmentTerm: row.employmentTerm, employmentHours: row.employmentHours,
    certificates: row.certificates, education: row.education, wageMedHourly: row.wageMedHourly,
    wageMedAnnual: row.wageMedAnnual, lmiaPositions: row.lmiaPositions,
    lmiaPositionsSkilled: row.lmiaPositionsSkilled, lmiaLastQuarter: row.lmiaLastQuarter,
    source: row.source, sourceLabel: row.sourceLabel, origin: row.origin, datePosted: row.datePosted,
    lastSeen: row.lastSeen, status: row.status, duties: null, requirements: null, locationFacts: null,
  }
}

/**
 * occRead 场景的最小事实包(按 NOC 缓存干净,不带本岗字段 —— 老链同口径)。
 *
 * @param input NOC 与官方职责/要求原文。
 * @returns 岗位事实。
 */
export function makeOccJob(input: OccJobIn): AdvisorJob {
  const j = makeEmptyJob()
  j.noc = input.noc
  j.duties = input.duties
  j.requirements = input.requirements
  return j
}

/**
 * provRead/cityRead 场景的最小事实包(地点事实块服务端已重建)。
 *
 * @param input 省码与事实块。
 * @returns 岗位事实。
 */
export function makeLocJob(input: LocJobIn): AdvisorJob {
  const j = makeEmptyJob()
  j.province = input.province
  j.locationFacts = input.facts
  return j
}

/**
 * 空岗位事实(一无所知的底座;occ/loc 速读场景在它上面点格)。
 *
 * @returns 全空的岗位事实。
 */
export function makeEmptyJob(): AdvisorJob {
  return {
    title: null, company: null, companyDescription: null, companySectors: null, noc: null,
    broad: null, province: null, city: null, district: null, address: null, officialUrl: null,
    applyUrl: null, score: null, gradeChannel: null, accessibility: null, pnpEligible: false,
    pnpStream: null, eeCategory: null, aip: false, salary: null, salaryAnnual: null,
    employmentTerm: null, employmentHours: null, certificates: [], education: null,
    wageMedHourly: null, wageMedAnnual: null, lmiaPositions: null, lmiaPositionsSkilled: null,
    lmiaLastQuarter: null, source: null, sourceLabel: null, origin: null, datePosted: null,
    lastSeen: null, status: null, duties: null, requirements: null, locationFacts: null,
  }
}

/**
 * 语言收窄(老链口径:非 en/ko 一律 zh)。
 *
 * @param wire 请求体。
 * @returns 输出语言。
 */
export function langOf(wire: AdvisorWire): Lang {
  if (wire.lang === 'en') {
    return wire.lang
  }
  if (wire.lang === 'ko') {
    return wire.lang
  }
  return LANG_ZH
}

/**
 * 追问轮过滤(老链口径:user/assistant 且 content 是串的才收)。
 *
 * @param wire 请求体。
 * @returns 合法追问轮;空表 = 一次性初判。
 */
export function cleanMessages(wire: AdvisorWire): ChatMsgList {
  const out: ChatMsg[] = []
  if (wire.messages == null || Array.isArray(wire.messages) === false) {
    return out
  }
  for (const m of wire.messages) {
    if (m == null || typeof m.content !== 'string') {
      continue
    }
    if (m.role === ROLE_USER || m.role === ROLE_ASSISTANT) {
      out.push({ role: m.role, content: m.content })
    }
  }
  return out
}

/**
 * 岗位事实 → jobs 域 match() 的岗位输入(与老链 profileFacts 里的 mj 逐字同形:
 * LMIA 三格不进匹配)。
 *
 * @param j 岗位事实。
 * @returns 匹配用岗位形状。
 */
export function matchJobOf(j: AdvisorJob): MatchJobCell {
  return {
    noc: emptyOf(j.noc), teer: teerOf(j.noc), province: emptyOf(j.province),
    pnpEligible: j.pnpEligible, pnpStream: emptyOf(j.pnpStream), eeCategory: emptyOf(j.eeCategory),
    salaryAnnual: j.salaryAnnual, wageMedAnnual: j.wageMedAnnual,
    lmiaPositions: null, lmiaLastQuarter: '', lmiaPositionsSkilled: null,
  }
}

/**
 * 响应头(Content-Type + X-Cache + 可选 X-JD,再并上 freeGate 的 X-Free-Left)。
 *
 * @param input 闸头、缓存标与 JD 标。
 * @returns 键值对(Response init 直收)。
 */
export function headersOf(input: HeadersOfIn): HeaderMap {
  const h: HeaderMap = {}
  for (const [k, v] of Object.entries(input.gate)) {
    h[k] = v
  }
  h[HDR_CONTENT_TYPE] = CT_TEXT
  h[HDR_X_CACHE] = input.cache
  if (input.jd != null) {
    h[HDR_X_JD] = input.jd
  }
  return h
}

/**
 * 可空串 → 空串(routes 侧的语言接缝小件;emptyOf 的导出面)。
 *
 * @param v 原值。
 * @returns 串。
 */
export function blankOf(v: MaybeStr): string {
  return emptyOf(v)
}
