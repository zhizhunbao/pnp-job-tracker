/**
 * advisor 域的行为:把服务端查好的岗位/公司/职业/地点事实,拼成各场景的提示词。
 * 全部纯拼装 —— 事实从参数进(routes 现查),判定(match/normalizeProfile)留在各自的
 * 主人域,这里只收结果拼文本;措辞逐字保形老链 api/advisor(eval 对拍的前提)。
 *
 * @author Frank
 * @time 2026-08-23 16:00:00
 */
import { fill } from '../template'
import { PROV_NAMES } from '../location'
import {
  ATLANTIC_PROVS, CACHE_VER, CO_ABOUT_LEN_MAX, CO_DESC_LEN_MAX, CO_SECTORS_LEN_MAX, CO_SOURCES_MAX,
  CO_WEB_LEN_MAX, COMMA_SEP, F_CITY_READ, F_CO_READ, F_COMPANY, F_IMMIGRATION, F_JD_READ, F_OCC_READ,
  F_PROV_READ, F_SCORE, F_TITLE, HTTP_RE, INDEMAND_NOC2, ISO_DATE_LEN, K_DIV, KEY_PRO_PREFIX, KEY_SEP,
  LANG_NAMES, LANG_ZH, LOC_FACTS_LEN_MAX, NL, NL2, NOC_GROUP_LEN, NOC_TEER_RE, OCC_DUTY_LEN_MAX,
  OCC_DUTY_LINES_MAX, OCC_REQ_LEN_MAX, OCC_REQ_LINES_MAX, QUOTE, REASON_PREFIX, SEMI_SEP,
  SIMPLE_FIELDS, SLASH_SEP, SPACE_SEP, WAGE_FIELDS,
} from './constants'
import {
  ASK, ASK_FALLBACK_TPL, ATLANTIC_RULE, CH_NAME, CHAT_FACTS_HEAD, CHAT_JD_HEAD, CHAT_JD_TAIL,
  CHAT_TAIL, CITY_READ_ASK, CO_ANTI_FAB, CO_FACT, CO_GROUND_BOTH, CO_GROUND_FETCH, CO_GROUND_NONE,
  CO_GROUND_STORED, CO_HEAD_TPL, CO_KNOWN, CO_KNOWN_HEAD, CO_OUTPUT_RULES, CO_READ_ASK, CO_READ_RULES,
  CO_SPONSOR, CO_WEB_HEAD, DRIVER, GROUNDING_RULES, HEADINGS, HEADINGS_INSTR, IMM_HEAD_TPL,
  JD_BLOCK_HEAD, JD_BLOCK_TAIL, JD_FACTS_TPL, JD_READ_ASK, JD_READ_MISSING, JD_READ_SRC_HEAD,
  JD_READ_TAIL, JOB_FACT, JOB_FACTS_HEAD, LANG_PURITY, LOC_FACTS_HEAD, LOC_READ_TAIL, NO_JD_LINE,
  NO_MEDIAN_RULE, NOC_NONE_LINE, OCC_FACT, OCC_READ_TAIL, PATH_FACTS_HEAD, PATH_FACTS_TPL, PLAN_RULES, PREP_EXTRA,
  PROFILE_MATCH_TPL, PROFILE_TAIL, PROFILE_TPL, PROV_READ_ASK, READER_CTX_TPL, READER_LINE,
  READS_OUTPUT, SCORE_FACTS_TPL, SECTIONS_OUTPUT, SIMPLE_OUTPUT, STREAM_SEG, SYSTEM_TPL, VAL,
  YR_SEG, ZH_ONLY,
} from './prompts'
import type {
  AdvisorJob, CacheKeyIn, ClipLinesIn, CompanyPromptIn, CoReadPromptIn, ChatSystemIn, FieldPromptIn,
  HeadingPair, ImmigrationPromptIn, JdReadPromptIn, Lang, LocReadPromptIn, MaybeNum, MaybeStr,
  OccReadPromptIn, ProfileFactsIn, PromptIn,
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
 *
 * @param noc NOC 码;没有为 null。
 * @returns TEER 数字或 null。
 */
function teerOf(noc: MaybeStr): MaybeNum {
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
