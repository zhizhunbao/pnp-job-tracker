/**
 * 对话:用户一句话 → 模型自己挑工具 → 出口闸 → 答复。
 *
 * 🔵 **本文件顶层只有函数**(宪法「域内文件的标准形态」):参数在 `constants.ts`,
 * 形状在 `types.ts`,给模型看的字在 `prompts.ts`,SQL 在 `lib/db/sql`,失败在 `lib/error`,留痕在 `lib/log`。
 *
 * 🔴 三条不能破:
 *   ① **数字必须能回读到出处** —— 答复里每个数字都要在这一趟的 facts 里找得到,否则重写、再撞就降级成清单;
 *   ② **四态不许合并**(见 `types.ts` 的 `Availability`),但枚举值本身不许见客;
 *   ③ **职业码只能来自检索结果** —— 猜错一位,后面每把工具都在答另一个人的问题。
 *
 * 边界与迁移见 docs/implementation/文案收拢/17_lib-consult边界与迁移.md。
 *
 * @author Frank
 * @time 2026-08-19 22:55:33
 */

import { createHash } from 'node:crypto'
import { fill } from '../template'
import { runAgentLoop } from '@earendil-works/pi-agent-core'
import type { StreamFn } from '@earendil-works/pi-agent-core'
import { streamSimple } from '@earendil-works/pi-ai/api/openai-completions'
import type { Model } from '@earendil-works/pi-ai'
import { acceptNoc, passThroughMessages } from '../agent'
import type { TranscriptMessage } from '../agent'
import type { VerdictProfile } from '../ruling'
import { cleanProvs } from '../location'
import { chatError, CHAT_CODE } from '../error'
import { CHAT_FN, CHAT_LOG, GATE_LOG, log } from '../log'
import { queryRows, show, SQL, text, count, numOrNull } from '../db'
import { evaluateRequirements } from '../gauge'
import type { Requirement, RuleProfile, RuleResult } from '../gauge'
import {
  ANSWER_PENDING, API, ARG_NONE, AS_FOLLOWS, AUTH_HEADER, AVAIL, A_CAP, BASE, BEARER, BOLD_RE, CLAIMS_CAP, CLAIM_TEXT_CAP,
  COLLECTION_CHAT_LOGS, CONSULT_STEP, CONSULT_STEP_OCC_TPL, CONTEXT_WINDOW, CUT_MIN_RATIO, DRAW_LIMIT, EARLIER_HEAD,
  EN, EN_UNIT_WORDS, ERR_CAP, ERR_LOG_CAP, EVIDENCE_FETCHED_NONE, EVIDENCE_URL_NONE, FAIL_MSG, FED, FIRST_LINE_CAP,
  FULL_STOP, GATE, GRID_CRS, GUARD_RETRIES,
  HARD_GATES, HASH_HEX, HASH_SHA256, HAS_DIGIT, HEADING_RE, HISTORY_CAP, HISTORY_TURNS, INELIGIBLE, INTERNAL_WORDS,
  JOBS_LINK, KEY, KIND_SUMMARY, LABEL, LANG_NAME, LEAD_MARK, LEN_CAP, LIKE_ANY, LIKE_ESCAPE, LIKE_SPECIAL, MARKUP,
  MAX_FACTS, MAX_QUERY, MAX_TOKENS, MESSAGE_UPDATE, MODEL_ID, NL, NOISE_RATIO, NOW_HEAD, NO_KEY_PLACEHOLDER,
  NUMBERED_RE, NUM_RE, OPENING_COLON, OPENING_SAMPLE, POINTS_LIMIT, PRIVATE_PROMISE, PROVIDER, PROVS, QC, Q_CAP,
  REASON_EXCLUDED, ROLE, SAID, SAMPLING, SEARCH_LIMIT, SEG_NONE, SEP, SHEET_CAP, SPACE, SQL_NO_FILTER, SSE_PREFIX,
  SSE_SUFFIX, STAR_RE, STATUS_WORDS, STRIP_SUB, TABLE_RE, TEXT_BLOCK_SEP, TEXT_NONE, THOUSANDS_COMMA,
  THREAD_ID_LEN, THREAD_SEED, TIER_TEXT, TIMEOUT_MS, TITLE_PENDING, TOOL_LABEL, TOOL_NAME,
  TRAILING_ZEROS, UNIT, VALUE_TEXT_NONE, V1, WORD_EDGE, DATE_LEN, SUBJECT,
} from './constants'
import {
  BLOCK_UNKNOWN_NOC, PROFILE_HEAD, PROFILE_NONE, REPLY_LANGUAGE_HEAD, RETRY_BULLET, RETRY_COLON, RETRY_COMMA,
  RETRY_HEAD, RETRY_OPENING, SYSTEM_RULES, TOOL_DESC, TOOL_REPLY,
} from './prompts'
import {
  CLAIMS_PARAMS, CRS_PARAMS, NOC_PARAMS, NOC_PROVS_PARAMS, PERMIT_PARAMS, PROV_PARAMS, SEARCH_PARAMS, VERDICT_PARAMS,
} from './schemas'
import type {
  AllowedNumbersOut, AnswerLangIn, Availability, BeforeToolCallIn, BeforeToolCallOut, BoxForIn, BoxForOut, Candidate,
  CaughtError, ChatOut, CiteFactsIn, CiteFactsOut, CodesOfOut, ConsultOut, ContentOfIn, CoverageFactsOut,
  CoverageResult, CoverageRow, DraftOnceIn, DraftOnceOut, DrawRow, DrawsFactsOut, DrawsResult, EeFactsOut, EeResult,
  EeRow, ExecClaimsIn, ExecClaimsOut, ExecCoverageIn, ExecCoverageOut, ExecDrawsIn, ExecDrawsOut, ExecEeIn,
  ExecEeOut, ExecJobsIn, ExecJobsOut, ExecOpsIn, ExecOpsOut, ExecPermitIn, ExecPermitOut, ExecPointsIn,
  ExecPointsOut, ExecSearchIn, ExecSearchOut, ExecThresholdsIn, ExecThresholdsOut, ExecVerdictIn, ExecVerdictOut,
  Fact, FactIn, FactSheetIn, FindEnglishUnitsOut, FindInternalWordsOut, FindRawMarkupOut, FindRestatedOpeningIn,
  FindRestatedOpeningOut, FindUngroundedNumbersOut, FirstLineOfIn, GateHit, HardHitsIn, HardHitsOut, Inbox,
  IsUserTurnIn, JobsFactsOut, JobsResult, JobsRow, LastDraftOfIn, LogChatIn, LookupCoverageOut, LookupDrawsIn,
  LookupDrawsOut, LookupEeOut, LookupJobsOut, LookupOpsIn, LookupOpsOut, LookupPermitIn, LookupPermitOut,
  LookupPointsIn, LookupPointsOut, LookupThresholdsIn, LookupThresholdsOut, MakeToolGatesIn, MakeToolGatesOut,
  MakeToolsIn, MakeToolsOut, ModelOut, NocOfOut, NocQueryIn, NumberCheckIn, OnEventIn, OpsFactsOut, OpsResult,
  OrNone2In, OrNoneIn, OrNoneOut, PermitFactsOut, PermitResult, PermitRow, PointsFactsOut, PointsResult, PointsRow,
  ProvOfOut, Reply, RetryNoteIn, RunGatesIn, RunGatesOut, RunIn, SearchOccupationsIn, SearchOccupationsOut, SegIn,
  SseBytes, SsePacket, StatusFactIn, StatusWordOfOut, StepOccLineIn, TakeIn, ThreadIdIn, ThresholdsFactsOut,
  ThresholdsResult, ThresholdsRow, Tool, ToolArgs, Turn, TurnList, VerdictFactsIn, VerdictFactsOut,
  VerdictProfileOfIn, SubjectOfIn, SubjectOfOut, DrawDbRow, EeDbRow, NocSearchRow, NocHit, OccFlatRow, OccFlat,
  OpsDbRow, OpsRow, PermitDbRow, PointsDbRow, ProvOpenRow, ReqRow, ToTitleTeerIn, TitleTeer,
} from './types'
// =========================================================================
// 1. 模型
// =========================================================================

/**
 * 这一趟用哪个模型。协议锁 openai-completions —— 局域网直连与经隧道两个门说的都是它。
 *
 * cost 的四个 0 是照实说,不是省事:两道门(局域网直连、朋友服务器经 ngrok 暴露的那个)
 * 都不按 token 计费。⚠️ 哪天换成按量收费的云 API,这四个 0 就成了假话 —— pi 拿它记账,
 * 填 0 等于把花掉的钱报成零;那时要填真实单价,而且单价随模型变,得跟着 MODEL_ID 走。
 *
 * 鉴权头只在真有钥匙时才挂:直连局域网那台裸 Ollama 没有鉴权,
 * 挂一个空的 `Authorization` 反而会被某些网关当成鉴权失败。
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
    input: [ROLE.text],
    contextWindow: CONTEXT_WINDOW,
    maxTokens: MAX_TOKENS,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    samplingParams: SAMPLING,
  }
  if (KEY) {
    m.headers = { [AUTH_HEADER]: `${BEARER}${KEY}` }
  }
  return m
}

// =========================================================================
// 2. 采信(工具描述是求它填对,这一层才是拦它填错)
// =========================================================================

/**
 * 采信模型填的省码:白名单里的省码或 `FED`(联邦轮次)放行,其余一律打回。
 *
 * schema 的 description 已经求它写两位码(实测能把 `"Manitoba"` 治成 `"MB"`),
 * 这里拦的是它编一个不存在的省。
 *
 * @param raw 模型填的省码原文。
 * @returns 采信下来的省码;认不出就空串,调用方回一句「不认得」。
 */
function provOf(raw: string): ProvOfOut {
  const p = raw.trim().toUpperCase()
  if (p === FED) {
    return p
  }
  if (PROVS.has(p)) {
    return p
  }
  return null
}

// =========================================================================
// 3. 取数(SQL 文本全在 lib/db/sql,本段只管取数与定形)
// =========================================================================

/**
 * 查职业候选:库里**真有在招岗位**的 NOC。
 *
 * 榜首 `NOISE_RATIO` 以下的当噪音丢掉 —— 那些是被官方要求文本连带捞出来的,
 * 留在白名单里就是给模型递错答案。
 *
 * @param input 库连接与检索词。
 * @returns 候选清单,按在招数从多到少;一个都没有时是空数组。
 */
async function searchOccupations(input: SearchOccupationsIn): SearchOccupationsOut {
  const like = `${LIKE_ANY}${input.query.replace(LIKE_SPECIAL, LIKE_ESCAPE)}${LIKE_ANY}`
  const all = await queryRows({ db: input.db, sql: SQL.NOC_LIST_WITH_TITLES, params: [like, SEARCH_LIMIT], map: toNocHit })
  let top = 0
  if (all.length) {
    top = all[0].n
  }
  const hits: Candidate[] = []
  for (const hit of all) {
    if (hit.noc && hit.title && hit.n >= top * NOISE_RATIO) {
      hits.push({ noc: hit.noc, title: hit.title })
    }
  }
  return hits
}

/**
 * 一个职业在各省的在招岗位数,外加职业名与 TEER。
 *
 * 🔴 **0 的省也要出现在结果里**(库里没有这个省的行 = 0)。「这个省一个都没有」本身就是答案,
 * 而只给有岗位的省,模型就只看得见好消息。
 *
 * @param input 库连接与职业码。
 * @returns 各省一行,按在招数从多到少。
 */
async function lookupJobs(input: NocQueryIn): LookupJobsOut {
  const [countRows, title] = await Promise.all([
    queryRows({ db: input.db, sql: SQL.PROV_OPEN_BY_PROV, params: [input.noc], map: toProvOpen }),
    input.db.query(SQL.NOC_TITLE_TEER, [input.noc]),
  ])
  const byProv = new Map<string, JobsRow>()
  for (const prov of PROVS) {
    byProv.set(prov, { prov, open: 0, named: 0 })
  }
  for (const r of countRows) {
    if (byProv.has(r.prov)) {
      byProv.set(r.prov, r)
    }
  }
  const rows = Array.from(byProv.values()).sort(byOpenDesc)
  const tt = toTitleTeer(title.rows)
  return { noc: input.noc, title: tt.title, teer: tt.teer, rows }
}

/**
 * 各省的省提名清单收没收这个职业。
 *
 * 🔴 收录与排除**同时存在是正常的** —— 不同通道各有各的清单,不许压成一句「收/不收」。
 * 一个省一条记录都没有 = `not-collected`(**本站没收录**),不是「官方没有清单」——
 * 这两句在用户那里意思相反(见 `types.ts` 的 `Availability`)。
 *
 * @param input 库连接与职业码。
 * @returns 各省一行,九个省一个不少。
 */
async function lookupCoverage(input: NocQueryIn): LookupCoverageOut {
  const occRows = await queryRows({ db: input.db, sql: SQL.PNP_OCCUPATIONS_FLAT, params: [], map: toOccFlat })
  const byProv = new Map<string, CoverageRow>()
  for (const r of occRows) {
    if (PROVS.has(r.province) === false || r.noc !== input.noc) {
      continue
    }
    let row = byProv.get(r.province)
    if (row == null) {
      row = blankCoverage(r.province)
    }
    if (r.type === INELIGIBLE) {
      row.excluded.push(r.stream)
    } else {
      row.streams.push(r.stream)
    }
    row.availability = AVAIL.ok
    row.evidence = { url: r.url, fetched: r.fetched }
    byProv.set(r.province, row)
  }
  const out: CoverageRow[] = []
  for (const prov of PROVS) {
    let row = byProv.get(prov)
    if (row == null) {
      row = blankCoverage(prov)
    }
    out.push(row)
  }
  return { noc: input.noc, rows: out }
}

/**
 * 一个省的空白收录行:**默认是「本站未收录」而不是「不收录」** —— 举不出证就不许说官方的话。
 *
 * @param prov 两位省码。
 * @returns 空白行。
 */
function blankCoverage(prov: string): CoverageRow {
  return {
    prov, streams: [], excluded: [], availability: AVAIL.notCollected,
    evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
  }
}

/**
 * 各省的省提名门槛,按这个职业的 TEER 与职业码挑行,再交给判定引擎。
 *
 * 🔴 **判定不在本域写** —— `lib/rules` 的 `evaluateRequirements` 是判定层的单一来源
 * (TEER 挑行、NOC 前缀取最具体那条、收入表的下界推理都在那儿)。这里只负责取数、映射、分组。
 * 🔴 一个省一条门槛行都没有 = **本站没收录**,不是「官方没有门槛」。
 *
 * @param input 库连接、职业码、TEER、要看哪几个省、用户侧已知的条件。
 * @returns 各省一行。
 */
async function lookupThresholds(input: LookupThresholdsIn): LookupThresholdsOut {
  const reqRows = await queryRows({ db: input.db, sql: SQL.PNP_REQUIREMENTS_ALL, params: [], map: toRequirement })
  const byProv = new Map<string, Requirement[]>()
  for (const req of reqRows) {
    if (PROVS.has(req.province) === false || req.province === QC) {
      continue
    }
    let got = byProv.get(req.province)
    if (got == null) {
      got = []
    }
    got.push(req)
    byProv.set(req.province, got)
  }
  let want = Array.from(byProv.keys()).sort()
  if (input.provs.length) {
    want = input.provs
  }
  const profile: RuleProfile = {
    noc: input.noc,
    teer: input.teer,
    clb: null,
    canadianExpMonths: null,
    totalExpMonths: input.expMonths,
    familySize: null,
    annualIncome: null,
    incomeIsOccMedian: false,
    area: null,
  }
  const out: ThresholdsRow[] = []
  for (const prov of want) {
    let reqs = byProv.get(prov)
    if (reqs == null) {
      reqs = []
    }
    if (reqs.length === 0) {
      out.push({ prov, availability: AVAIL.notCollected, results: [] })
      continue
    }
    out.push({ prov, availability: AVAIL.ok, results: evaluateRequirements({ reqs: reqs, profile: profile }) })
  }
  return { noc: input.noc, teer: input.teer, rows: out }
}

/**
 * 一个省(或联邦 `FED`)的近几轮抽选。
 *
 * 🔴 **无出处的抽选行不返回**(铁律:URL → 数据 → SQL)。分数与邀请数可空:
 * 官方没公布的轮次是 null,**不许折成 0**。
 *
 * @param input 库连接与省码。
 * @returns 近 `DRAW_LIMIT` 轮,按日期从新到旧;一轮都没有时 rows 为空。
 */
async function lookupDraws(input: LookupDrawsIn): LookupDrawsOut {
  const mapped = await queryRows({ db: input.db, sql: SQL.PNP_DRAWS_BY_PROV, params: [input.prov], map: toDrawRow })
  const out: DrawRow[] = []
  for (const r of mapped) {
    if (r.evidence.url === '') {
      continue
    }
    if (out.length >= DRAW_LIMIT) {
      break
    }
    out.push(r)
  }
  return { prov: input.prov, rows: out }
}

/**
 * 一个省的官方运营统计(处理时长 / 配额 / 池内人数……)。
 *
 * 🔴 `value` 的 null 原样带出,**永远不 `?? 0`**:官方的隐私抑制值(「Less than 10」)
 * 折成 0 就是替官方编数字;那时官方原文在 `valueText` 里。
 *
 * @param input 库连接与省码。
 * @returns 库里有出处的每一行;一行都没有时 rows 为空(= 本站未收录,不是官方不公布)。
 */
async function lookupOps(input: LookupOpsIn): LookupOpsOut {
  const rows = await queryRows({ db: input.db, sql: SQL.PNP_OPS_METRICS, params: [input.prov], map: toOpsRow })
  return { prov: input.prov, rows: rows }
}

/**
 * 这个职业命中哪些联邦 EE 类别抽选清单。
 *
 * 🔴 **空数组是结论不是缺数**:查过全表、不在任何类别里 —— 事实层要把这句摆出来,
 * 不许让「没有行」被下游读成「没查到」。
 *
 * @param input 库连接与职业码。
 * @returns 命中的类别,各带该类别最近一轮的分数线。
 */
async function lookupEe(input: NocQueryIn): LookupEeOut {
  const eeRows = await queryRows({ db: input.db, sql: SQL.EE_CATEGORIES_BY_NOC, params: [input.noc], map: toEeRow })
  const out: EeRow[] = []
  for (const r of eeRows) {
    if (r.evidence.url) {
      out.push(r)
    }
  }
  return { noc: input.noc, rows: out }
}

/**
 * 一个联邦项目的官方规则(PGWP 时长分档 / CEC 经验要求……)。
 *
 * 联邦规则与省无关,所以不收省码。`value` 可空同 `lookupOps`:`rule` 行与
 * 「跟课程一样长」这类没有绝对数的行恒 null,官方原句在 `valueText`。
 *
 * @param input 库连接与项目名。
 * @returns 库里有出处的每一行,按官方页面顺序。
 */
async function lookupPermit(input: LookupPermitIn): LookupPermitOut {
  const permitRows = await queryRows({ db: input.db, sql: SQL.PERMIT_RULES, params: [input.program], map: toPermitRow })
  const out: PermitRow[] = []
  for (const r of permitRows) {
    if (r.evidence.url) {
      out.push(r)
    }
  }
  return { program: input.program, rows: out }
}

/**
 * 官方计分表(CRS / FSW67)的档位行。
 *
 * 🔴 两套分不许混:SQL 第一条约束永远是 `grid = $1`。CRS 不给节号时只取 summary 行
 * (detail 166 行会把上下文灌爆);FSW67 库里没有 summary 行(实查 2026-08-21),
 * 取 detail 靠 `POINTS_LIMIT` 兜。`points` 可空:官方写 n/a 时原文在 `pointsText`。
 *
 * @param input 库连接、分表名、节号(可空串)。
 * @returns 档位行,按官方表序。
 */
async function lookupPoints(input: LookupPointsIn): LookupPointsOut {
  let kind = SQL_NO_FILTER
  if (input.section === '' && input.grid === GRID_CRS) {
    kind = KIND_SUMMARY
  }
  const gridRows = await queryRows({
    db: input.db, sql: SQL.EE_POINTS_GRID, map: toPointsRow,
    params: [input.grid, input.section, kind, SQL_NO_FILTER, SQL_NO_FILTER, POINTS_LIMIT],
  })
  const out: PointsRow[] = []
  for (const r of gridRows) {
    if (r.evidence.url) {
      out.push(r)
    }
  }
  return { grid: input.grid, rows: out }
}

// =========================================================================
// 4. 事实渲染(取数结果 → Fact)
// =========================================================================

/**
 * 一段可选文案:条件成立才出,不成立整段消失。
 *
 * 全站禁三目(2026-08-21 Frank 拍板)后,「x 有值才拼这段」collapses 到这一个小件 ——
 * 条件由调用方显式写,文本只许纯拼接(会炸的取值去写 if,这里是拼字的不是守门的)。
 *
 * @param input 出不出、出什么。
 * @returns 那一段;不出就空串。
 */
function seg(input: SegIn): string {
  if (input.when === false) {
    return SEG_NONE
  }
  return input.text
}

/**
 * 官方可空的数值进句子:没有就用占位横线(SEP.none),不折 0 —— 「没公布」和「0 人」是两句话。
 *
 * @param v 那一格的值。
 * @returns 值本身;没有则占位横线。
 */
function orNone(v: OrNoneIn): OrNoneOut {
  if (v == null) {
    return SEP.none
  }
  return v
}

/**
 * 可空值进日志:没有就用调用方给的占位词 —— 占位词随日志词表走,不跟 `orNone` 的显示占位混用。
 *
 * @param input 那一格的值与占位词。
 * @returns 值本身;没有则占位词。
 */
function orNone2(input: OrNone2In): OrNoneOut {
  if (input.v == null) {
    return input.fallback
  }
  return input.v
}

/**
 * 「一行都没有」的省该落哪一态:QC 是**不适用**(自有体系,不走这套抽选/清单),
 * 其余省是**本站未收录** —— 不是「官方没有」,那句话需要举证。
 *
 * @param prov 两位省码。
 * @returns 四态之一。
 */
function emptyAvailability(prov: string): Availability {
  if (prov === QC) {
    return AVAIL.notApplicable
  }
  return AVAIL.notCollected
}

/**
 * 造一条带数值的事实。
 *
 * @param input 工具名、说明、数值、展示形态、单位、出处。
 * @returns 一条事实。
 */
function fact(input: FactIn): Fact {
  return {
    tool: input.tool, label: input.label, quote: input.quote, value: input.value,
    valueText: input.valueText, unit: input.unit, evidence: input.evidence,
    availability: null, cited: null,
  }
}

/**
 * 造一条**没有值**的事实,四态之一。它的 `value` 永远是 null,数字闸不会去查它。
 *
 * @param input 工具名、说明、是四态里的哪一种、出处。
 * @returns 一条四态事实。
 */
function statusFact(input: StatusFactIn): Fact {
  return {
    tool: input.tool, label: input.label, quote: input.quote, value: null,
    valueText: VALUE_TEXT_NONE, unit: UNIT.status,
    evidence: input.evidence, availability: input.availability, cited: null,
  }
}

/**
 * 在招岗位 → 事实。每个省一条,**含 0 的省**。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function jobsFacts(r: JobsResult): JobsFactsOut {
  const out: Fact[] = []
  for (const row of r.rows) {
    out.push(fact({
      tool: TOOL_NAME.jobs,
      label: `${row.prov}${LABEL.openPostings}${r.title || r.noc}${LABEL.nocOpen}${r.noc}${LABEL.nocClose}`,
      quote: `${row.prov}${SEP.dot}${r.title || r.noc}${LABEL.nocOpen}${r.noc}${LABEL.nocClose}`,
      value: row.open,
      valueText: String(row.open),
      unit: UNIT.jobs,
      evidence: { url: `${JOBS_LINK.head}${r.noc}${JOBS_LINK.prov}${row.prov}`, fetched: EVIDENCE_FETCHED_NONE },
    }))
  }
  return out
}

/**
 * 清单收录 → 事实。收录的省给成品句,没收录的省给四态行 —— 两者不许压成一条。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function coverageFacts(r: CoverageResult): CoverageFactsOut {
  const out: Fact[] = []
  for (const row of r.rows) {
    if (row.availability !== AVAIL.ok) {
      out.push(statusFact({
        tool: TOOL_NAME.coverage,
        label: `${row.prov}${LABEL.provList}${r.noc}`,
        quote: `${row.prov}${LABEL.nocDot}${r.noc}`,
        availability: row.availability,
        evidence: row.evidence,
      }))
      continue
    }
    if (row.streams.length) {
      out.push(fact({
        tool: TOOL_NAME.coverage,
        label: `${row.prov}${LABEL.streamsListing}${r.noc}`,
        quote: `${row.prov}${SEP.dot}${row.streams.join(SEP.semi)}`,
        value: row.streams.length,
        valueText: row.streams.join(SEP.semi),
        unit: UNIT.streams,
        evidence: row.evidence,
      }))
    }
    if (row.excluded.length) {
      out.push(fact({
        tool: TOOL_NAME.coverage,
        label: `${row.prov}${LABEL.streamsExcluding}${r.noc}`,
        quote: `${row.prov}${SEP.dot}${row.excluded.join(SEP.semi)}`,
        value: row.excluded.length,
        valueText: row.excluded.join(SEP.semi),
        unit: UNIT.streams,
        evidence: row.evidence,
      }))
    }
  }
  return out
}

/**
 * 一条门槛的值:**分档的要把每一档都写出来**。
 *
 * 🔴 实撞:BC 雇主雇员数是大温 5 人 / BC 其余 3 人两档,只报 5 的那一版答复
 * 对住在温哥华岛的人就是错的 —— 少给一档不是「简洁」,是半个真话。
 *
 * @param res 一条判定。
 * @returns 值的展示形态。
 */
function tierText(res: RuleResult): string {
  const unitTail = seg({ when: Boolean(res.unit), text: `${SPACE}${res.unit}` })
  if (res.tiers && res.tiers.length) {
    const parts: string[] = []
    for (const t of res.tiers) {
      parts.push(`${t.area}${SEP.colon}${orNone(t.value)}${unitTail}`)
    }
    return parts.join(SEP.semi)
  }
  if (res.need == null) {
    return res.verdict
  }
  const low = seg({ when: res.needLow != null && res.needLow !== res.need, text: `${res.needLow}${LABEL.range}` })
  return `${low}${res.need}${unitTail}`
}

/**
 * 门槛判定 → 事实。**一条门槛一条事实**,官方原文当说明,阈值当数值。
 *
 * 判不出来的(TEER 不知道 / 用户侧的值没有)照样给出来 —— 「这条要看你的语言分」本身就是答案,
 * 压掉它等于替用户假设了一个值。`quote` 用官方原文原样带出:降级清单只许印它。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function thresholdsFacts(r: ThresholdsResult): ThresholdsFactsOut {
  const out: Fact[] = []
  for (const row of r.rows) {
    if (row.availability !== AVAIL.ok) {
      out.push(statusFact({
        tool: TOOL_NAME.thresholds,
        label: `${row.prov}${LABEL.requirements}${r.noc}`,
        quote: `${row.prov}${LABEL.nocDot}${r.noc}`,
        availability: row.availability,
        evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
      }))
      continue
    }
    for (const res of row.results) {
      out.push(fact({
        tool: TOOL_NAME.thresholds,
        label: `${row.prov} ${res.subject} ${res.factor}${seg({ when: Boolean(res.basis), text: `${LABEL.parenOpen}${res.basis}${LABEL.nocClose}` })}${LABEL.dash}${res.evidence.label}`,
        quote: `${row.prov}${SEP.dot}${res.evidence.label}`,
        value: res.need,
        valueText: tierText(res),
        unit: res.unit || UNIT.threshold,
        evidence: { url: res.evidence.url, fetched: res.evidence.fetched },
      }))
    }
  }
  return out
}

/**
 * 抽选记录 → 事实。一轮一条,分数线当数值、分制跟在旁边 —— FED 的 CRS 与
 * 各省的 SIRS/EOI 互不相通,摆分数不带分制就是在诱导比较两套分。
 *
 * 一轮都没有:QC 是「不适用」(自有体系,不走这套抽选),其余省是「本站未收录」——
 * **不是「这个省不抽选」**,那句话需要举证。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function drawsFacts(r: DrawsResult): DrawsFactsOut {
  if (r.rows.length === 0) {
    return [statusFact({
      tool: TOOL_NAME.draws,
      label: `${r.prov}${LABEL.drawsList}`,
      quote: r.prov,
      availability: emptyAvailability(r.prov),
      evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    out.push(fact({
      tool: TOOL_NAME.draws,
      label: `${row.prov}${LABEL.drawRound}${row.date}${SPACE}${row.stream}${SEP.comma}${orNone(row.invitations)}${LABEL.invited}`,
      quote: `${row.prov}${SEP.dot}${row.date}${SEP.dot}${row.stream}`,
      value: row.score,
      valueText: seg({ when: row.score !== null, text: `${row.score}${SPACE}${row.scale}` }),
      unit: UNIT.points,
      evidence: row.evidence,
    }))
  }
  return out
}

/**
 * 运营统计 → 事实。一条指标一条事实,官方原文当说明。
 *
 * `value` 为 null 的行(隐私抑制值、纯文本游标)照给 —— `valueText` 里是官方原文,
 * 压掉它等于把「Less than 10」这条信息整个丢掉。
 *
 * 🔴 有值的行 `valueText` 必须**带上官方单位**:模型看到的是 `label: valueText` 一行,
 * 裸数字它就自己配单位 —— 实撞:SIRS 池 150+ 分段 10 **件**被答成等待 10 **天**。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function opsFacts(r: OpsResult): OpsFactsOut {
  if (r.rows.length === 0) {
    return [statusFact({
      tool: TOOL_NAME.ops,
      label: `${r.prov}${LABEL.opsList}`,
      quote: r.prov,
      availability: emptyAvailability(r.prov),
      evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const scope = seg({ when: row.scope !== '', text: `${LABEL.parenOpen}${row.scope}${LABEL.nocClose}` })
    let when = SEG_NONE
    if (row.asOf !== '') {
      when = `${LABEL.asOf}${row.asOf}`
    } else if (row.period !== '') {
      when = `${SPACE}${row.period}`
    }
    out.push(fact({
      tool: TOOL_NAME.ops,
      label: `${r.prov}${LABEL.opsHead}${row.label}${scope}${when}`,
      quote: `${r.prov}${SEP.dot}${row.label}`,
      value: row.value,
      valueText: row.valueText || seg({ when: row.value !== null, text: `${row.value}${seg({ when: row.unit !== '', text: `${SPACE}${row.unit}` })}` }),
      unit: row.unit,
      evidence: row.evidence,
    }))
  }
  return out
}

/**
 * EE 类别命中 → 事实。命中一类一条,该类别最近一轮的分数线当数值。
 *
 * 🔴 一类都没命中时给一条「不适用」—— 查过全表、不在任何类别里是**结论**,
 * 不给这一条,模型看不出「没有」与「没查」的区别。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function eeFacts(r: EeResult): EeFactsOut {
  if (r.rows.length === 0) {
    return [statusFact({
      tool: TOOL_NAME.ee,
      label: `${SAID.noc}${r.noc}${LABEL.eeNone}`,
      quote: `${LABEL.ee}${LABEL.nocDot}${r.noc}`,
      availability: AVAIL.notApplicable,
      evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const last = seg({
      when: row.drawDate !== '',
      text: `${LABEL.eeLast}${row.drawDate}${SEP.comma}${orNone(row.drawSize)}${LABEL.invited}`,
    })
    out.push(fact({
      tool: TOOL_NAME.ee,
      label: `${LABEL.eeHead}${row.category}${LABEL.dash}${row.label}${last}`,
      quote: `${row.category}${SEP.dot}${row.label}`,
      value: row.drawCrs,
      valueText: seg({ when: row.drawCrs !== null, text: `${row.drawCrs}${SPACE}${GRID_CRS}` }),
      unit: UNIT.points,
      evidence: row.evidence,
    }))
  }
  return out
}

/**
 * 联邦规则 → 事实。一条条款一条事实,`quote` 用官方条目名、`valueText` 用官方原句 ——
 * 降级清单印出来正好是「条目名: 官方原句」。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function permitFacts(r: PermitResult): PermitFactsOut {
  if (r.rows.length === 0) {
    return [statusFact({
      tool: TOOL_NAME.permit,
      label: `${r.program}${LABEL.permitList}`,
      quote: r.program,
      availability: AVAIL.notCollected,
      evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const tier = seg({ when: row.stream !== '', text: `${LABEL.parenOpen}${row.stream}${LABEL.nocClose}` })
    const basis = seg({ when: row.basis !== '', text: `${LABEL.parenOpen}${row.basis}${LABEL.nocClose}` })
    out.push(fact({
      tool: TOOL_NAME.permit,
      label: `${row.program}${tier}${LABEL.permitHead}${row.label || row.factor}${basis}`,
      quote: `${row.program}${SEP.dot}${row.label || row.factor}`,
      value: row.value,
      valueText: row.valueText,
      unit: row.unit || UNIT.threshold,
      evidence: row.evidence,
    }))
  }
  return out
}

/**
 * 计分表 → 事实。一档一条,分值当数值;官方写 n/a 的档 `points` 是 null、原文在 `pointsText`。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function pointsFacts(r: PointsResult): PointsFactsOut {
  if (r.rows.length === 0) {
    return [statusFact({
      tool: TOOL_NAME.points,
      label: `${r.grid}${LABEL.pointsList}`,
      quote: r.grid,
      availability: AVAIL.notCollected,
      evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const col = seg({ when: row.columnLabel !== '', text: `${LABEL.parenOpen}${row.columnLabel}${LABEL.nocClose}` })
    out.push(fact({
      tool: TOOL_NAME.points,
      label: `${row.grid}${LABEL.pointsHead}${row.sectionLabel || row.heading}${LABEL.dash}${row.criterion || row.factor}${col}`,
      quote: `${row.grid}${SEP.dot}${row.criterion || row.heading}`,
      value: row.points,
      valueText: row.pointsText || show(row.points),
      unit: UNIT.points,
      evidence: row.evidence,
    }))
  }
  return out
}

/**
 * 档案身份词 → 引擎词表里的词;不在表里就 null。
 * 喂一个引擎不认识的词,它会走「不是在读」之类的反向分支,比「没答」更糟。
 *
 * @param said 档案里的身份词原文。
 * @returns 词表里的词,或 null。
 */
function statusWordOf(said: string): StatusWordOfOut {
  if (STATUS_WORDS.includes(said)) {
    return said
  }
  return null
}

/**
 * 收件箱 + 档案槽 → 判定引擎认的档案。
 *
 * 🔴 **只搬真有的槽,缺的原样 null** —— 缺一个槽 ≠ 有一个默认值(「按单身算」会直接换一张分表)。
 * 身份词只在正好是引擎词表里那几个时才透传(见 `STATUS_WORDS`);经验月数**不拆**加拿大/海外 ——
 * 用户只说了总数,替他分进哪一格都是编,宁可让引擎判 needs-info 去反问。
 *
 * @param input 收件箱与调用方给的档案。
 * @returns 判定引擎认的档案,缺的槽全是 null。
 */
function verdictProfileOf(input: VerdictProfileOfIn): VerdictProfile {
  const said = text(input.profile.status)
  return {
    age: null,
    married: null,
    clb: null,
    edu: null,
    eduYears: null,
    canadaStudy: null,
    studyProvince: null,
    noc: input.box.noc,
    teer: input.box.teer,
    expCanadaMonths: null,
    expForeignMonths: null,
    foreignExpSelfEmployed: null,
    status: statusWordOf(said),
    province: null,
    hasOffer: null,
    inCanada: null,
    fieldMatch: null,
    frenchOk: null,
    permit: null,
  }
}

/**
 * 路径裁决 → 事实。一条通道一条,结论词当 `valueText`,offer 后大约等多久、
 * 被哪道闸卡住、缺哪几个档案槽全折进 label —— 模型只看 label 就能答「哪条最快、还差什么」。
 *
 * 见客引文取第一条 excluded 理由的官方原句(结论可以是我们的,依据必须是官方的);
 * 没有 excluded 理由的通道用「省 · 通道名」。
 *
 * @param rows 裁决引擎排好序的通道判定。
 * @returns 事实清单。
 */
function verdictFacts(rows: VerdictFactsIn): VerdictFactsOut {
  const out: Fact[] = []
  for (const p of rows) {
    let quote = `${p.province}${SEP.dot}${p.stream}`
    let evidence = { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE }
    for (const r of p.reasons) {
      if (r.kind === REASON_EXCLUDED && r.quote) {
        quote = `${p.province}${SEP.dot}${r.quote}`
        if (r.evidence) {
          evidence = { url: r.evidence.url, fetched: r.evidence.fetched }
        }
        break
      }
    }
    let tier = SEG_NONE
    if (p.tier != null) {
      tier = `${LABEL.tierHead}${TIER_TEXT[p.tier]}`
    }
    const blocked = seg({ when: Boolean(p.blockedBy), text: `${LABEL.blockedBy}${p.blockedBy}` })
    let missing = SEG_NONE
    if (p.missingSlots && p.missingSlots.length) {
      missing = `${LABEL.missing}${p.missingSlots.join(SEP.comma)}`
    }
    out.push(fact({
      tool: TOOL_NAME.verdict,
      label: `${p.province}${SPACE}${p.stream}${LABEL.verdictHead}${p.verdict}${tier}${blocked}${missing}`,
      quote: quote,
      value: null,
      valueText: p.verdict,
      unit: UNIT.verdict,
      evidence: evidence,
    }))
  }
  return out
}

// =========================================================================
// 5. 出口闸
// =========================================================================

/**
 * 把一个数规范成可比对的形态:去掉千分位,去掉末尾的 `.0`。
 *
 * @param raw 从答复或事实里抠出来的数字串。
 * @returns 规范形态。
 */
function normNum(raw: string): string {
  const s = raw.replace(THOUSANDS_COMMA, STRIP_SUB)
  if (s.includes(SAID.stop)) {
    return s.replace(TRAILING_ZEROS, STRIP_SUB)
  }
  return s
}

/**
 * 这一趟允许出现的所有数字:事实里的 + 用户自己写的 + 我们自己给过它的码。
 *
 * 🔴 `codes` 那一份不能省:职业码与 TEER 是**我们自己查出来给它的**,不是它编的 ——
 * 漏掉这一条,模型每写一次「NOC 72310」都会被判成编造,整轮降级(实撞)。
 *
 * @param input 事实清单与用户原话。
 * @returns 允许的数字集合。
 */
function allowedNumbers(input: NumberCheckIn): AllowedNumbersOut {
  const ok = new Set<string>()
  for (const c of input.codes) {
    if (c) {
      ok.add(normNum(c))
    }
  }
  for (const f of input.facts) {
    if (f.value != null) {
      ok.add(normNum(String(f.value)))
    }
    for (const m of `${f.valueText} ${f.label}`.matchAll(NUM_RE)) {
      ok.add(normNum(m[0]))
    }
  }
  for (const m of input.echo.matchAll(NUM_RE)) {
    ok.add(normNum(m[0]))
  }
  return ok
}

/**
 * 行首的排版记号:项目符号 `- ` 或一两位序号。
 *
 * @param mark 匹配到的那一段。
 * @returns 它是序号就抹成空白(那个数是排版不是事实),是项目符号就原样留下。
 */
function blankIfNumbered(mark: string): string {
  if (HAS_DIGIT.test(mark)) {
    return SPACE
  }
  return mark
}

/**
 * 🔴 **数字回读** —— 答复里每个数字都要在 facts 或用户原话里找得到。
 *
 * 这是「不许编数字」那条唯一的执行件:靠回读比对,不靠在 prompt 里求模型别编。
 * 行首的一两位序号(排版用)放行。
 *
 * @param input 答复、事实、用户原话。
 * @returns 溯不到源的那些数字。
 */
function findUngroundedNumbers(input: NumberCheckIn): FindUngroundedNumbersOut {
  const ok = allowedNumbers(input)
  const bad: string[] = []
  for (const line of input.answer.split(NL)) {
    const body = line.replace(LEAD_MARK, blankIfNumbered)
    for (const m of body.matchAll(NUM_RE)) {
      const n = normNum(m[0])
      if (ok.has(n) === false && bad.includes(n) === false) {
        bad.push(n)
      }
    }
  }
  return bad
}

/**
 * 内部枚举与字段名漏进答复。2026-08-04 事故:英文内部标签原样吐给了用户。
 *
 * @param answer 答复。
 * @returns 撞到的词。
 */
function findInternalWords(answer: string): FindInternalWordsOut {
  const low = answer.toLowerCase()
  const bad: string[] = []
  for (const w of INTERNAL_WORDS) {
    if (low.includes(w)) {
      bad.push(w)
    }
  }
  return bad
}

/**
 * 中/韩答复里夹了英文单位速记。数据是英文的,话不能是。
 *
 * @param input 答复与语种。
 * @returns 撞到的词;英文答复永远是空。
 */
function findEnglishUnits(input: AnswerLangIn): FindEnglishUnitsOut {
  if (input.lang === EN) {
    return []
  }
  const low = input.answer.toLowerCase()
  const bad: string[] = []
  for (const w of EN_UNIT_WORDS) {
    if (new RegExp(`${WORD_EDGE}${w}${WORD_EDGE}`).test(low)) {
      bad.push(w)
    }
  }
  return bad
}

/**
 * 前端只渲染得出两样排版:空行分段、行首 `- `。其余记号会原样见客。
 *
 * @param answer 答复。
 * @returns 撞到的记号。
 */
function findRawMarkup(answer: string): FindRawMarkupOut {
  const bad: string[] = []
  if (BOLD_RE.test(answer)) {
    bad.push(MARKUP.bold)
  }
  if (STAR_RE.test(answer)) {
    bad.push(MARKUP.star)
  }
  if (HEADING_RE.test(answer)) {
    bad.push(MARKUP.heading)
  }
  if (TABLE_RE.test(answer)) {
    bad.push(MARKUP.pipe)
  }
  if (NUMBERED_RE.test(answer)) {
    bad.push(MARKUP.numbered)
  }
  return bad
}

/**
 * 整段答复的第一句 —— 到第一个换行或第一个句号为止。
 *
 * @param input 整段答复。
 * @returns 第一句;整段没有断句记号时按长度截。
 */
function firstLineOf(input: FirstLineOfIn): string {
  const head = input.answer.trim().split(NL)[0]
  const stop = head.indexOf(FULL_STOP)
  let line = head
  if (stop >= 0) {
    line = head.slice(0, stop + 1)
  }
  return line.slice(0, FIRST_LINE_CAP).trim()
}

/**
 * 第一句只是把问题复述了一遍。
 *
 * 判据两条,都是**看得见摸得着的形状**,不猜语义:
 *   ① 以冒号收尾 —— 那句话在说「下面开始列」,不是在回答;
 *   ② 带「如下 / 以下条件 / as follows」这类预告词。
 *
 * 🔴 为什么是闸不是提示词:三轮提示词迭代(说人话 → 独立成条 → 并进 RULE 0)都没治住,
 * 而这两条形状用正则一眼认得出。提示词负责说一遍,执行交给这里 ——
 * 撞了就把话回喂给模型重写,两次不过降级成事实清单,和别的闸一个待遇。
 *
 * @param input 整段答复。
 * @returns 撞到的毛病;第一句没问题则空。
 */
function findRestatedOpening(input: FindRestatedOpeningIn): FindRestatedOpeningOut {
  const line = firstLineOf({ answer: input.answer })
  const bad: string[] = []
  if (line === '') {
    return bad
  }
  if (OPENING_COLON.test(line)) {
    bad.push(line.slice(-OPENING_SAMPLE))
  }
  if (AS_FOLLOWS.test(line)) {
    bad.push(line.slice(-OPENING_SAMPLE))
  }
  return bad
}

/**
 * 跑完全部出口闸。
 *
 * @param input 答复、事实、用户原话、语种。
 * @returns 撞到的每一道闸;全过时是空数组。
 */
function runGates(input: RunGatesIn): RunGatesOut {
  const fired: GateHit[] = []
  const checks: GateHit[] = [
    { gate: GATE.ungrounded, hits: findUngroundedNumbers({ answer: input.answer, facts: input.facts, echo: input.echo, codes: input.codes }) },
    { gate: GATE.internal, hits: findInternalWords(input.answer) },
    { gate: GATE.englishUnit, hits: findEnglishUnits({ answer: input.answer, lang: input.lang }) },
    { gate: GATE.markup, hits: findRawMarkup(input.answer) },
    { gate: GATE.opening, hits: findRestatedOpening({ answer: input.answer }) },
  ]
  for (const c of checks) {
    if (c.hits.length) {
      fired.push(c)
    }
  }
  return fired
}

/**
 * 按句截断到见客上限。截在句号处,不切半句。
 *
 * @param input 答复与语种。
 * @returns 截好的答复。
 */
function clampAnswer(input: AnswerLangIn): string {
  const cap = LEN_CAP[input.lang]
  if (input.answer.length <= cap) {
    return input.answer
  }
  const cut = input.answer.slice(0, cap)
  const stop = Math.max(cut.lastIndexOf(FULL_STOP), cut.lastIndexOf(SAID.stop), cut.lastIndexOf(NL))
  let kept = cut
  if (stop > cap * CUT_MIN_RATIO) {
    kept = cut.slice(0, stop + 1)
  }
  return kept.trim()
}

/**
 * 降级:出口闸两次都没过 → 直接给一张能溯源的事实清单。
 *
 * **宁可给一张朴素的清单,也不给一句编出来的话。**
 *
 * @param facts 这一趟的事实。
 * @returns 事实清单。
 */
function factSheet(facts: FactSheetIn): string {
  const lines: string[] = []
  for (const f of facts.slice(0, SHEET_CAP)) {
    lines.push(`${SEP.bullet}${f.quote}${seg({ when: f.valueText !== '', text: `${SEP.colon}${f.valueText}` })}`)
  }
  return lines.join(NL)
}

/**
 * 这一趟我们自己给过模型的码:采信下来的职业码、候选里的每个码、TEER。
 *
 * @param box 这一趟的收件箱。
 * @returns 码的清单。
 */
function codesOf(box: Inbox): CodesOfOut {
  const out: string[] = []
  if (box.noc) {
    out.push(box.noc)
  }
  if (box.teer != null) {
    out.push(String(box.teer))
  }
  for (const c of box.candidates) {
    out.push(c.noc)
  }
  return out
}

/**
 * 答复真的用到了哪几条事实 —— 回读打标,前端出处区只列打上的。
 *
 * @param input 答复与事实。
 * @returns 打好 `cited` 的事实。
 */
function citeFacts(input: CiteFactsIn): CiteFactsOut {
  const out: Fact[] = []
  for (const f of input.facts) {
    const num = f.value != null && input.answer.includes(String(f.value))
    const text = Boolean(f.valueText) && input.answer.includes(f.valueText)
    out.push({
      tool: f.tool, label: f.label, quote: f.quote, value: f.value, valueText: f.valueText,
      unit: f.unit, evidence: f.evidence, availability: f.availability, cited: num || text,
    })
  }
  return out
}

// =========================================================================
// 6. 工具
// =========================================================================

/**
 * 把事实攒进收件箱,并拼一段**紧凑的**回执给模型。
 *
 * 回执越短,后面每一轮越快 —— 每一轮都要重发全部消息,而经隧道那个门每次调用约 1.7 秒固定开销。
 *
 * @param input 这一趟的收件箱与这一把工具产出的事实。
 * @returns pi 认的工具回执。
 */
function take(input: TakeIn): Reply {
  const room = MAX_FACTS - input.box.facts.length
  let kept: Fact[] = []
  if (room > 0) {
    kept = input.facts.slice(0, room)
  }
  const lines: string[] = []
  for (const f of kept) {
    input.box.facts.push(f)
    lines.push(`${SEP.bullet}${f.label}${seg({ when: f.valueText !== '', text: `${SEP.colon}${f.valueText}` })}`)
  }
  let reply = TOOL_REPLY.empty
  if (lines.length) {
    reply = lines.join(NL)
  }
  return { content: [{ type: ROLE.text, text: reply }], details: { n: kept.length }, terminate: false }
}

/**
 * 拼一段纯话术的回执(拿不到职业码这类)。
 *
 * @param text 给模型看的那句话。
 * @returns pi 认的工具回执。
 */
function say(text: string): Reply {
  return { content: [{ type: ROLE.text, text }], details: { n: 0 }, terminate: false }
}


/**
 * 这一趟的工具挂点 —— **接的是 pi 自己的 `beforeToolCall`**,不是我们另造的一层。
 *
 * 🔴 2026-08-20 实测的病:韩文问「저는 목수입니다」,模型**一把工具没调**就写出 `72301`
 * (真码 72310,两位调了个个儿)。出口的数字闸拦住了,但那时已经无事实可回退 → 用户拿到报错。
 * RULE 9 早就写着「职业码只能来自 search_occupations 的结果」——**那是求它,这里是拦它**:
 * 码不在这一趟搜出来的候选里,这次调用根本不发生,理由回给模型,它还能在循环里自己补一次搜索。
 *
 * 判据只有一条:**这个码,我们这一趟给它看过吗**。看过 = 候选里有,或档案本来就带着。
 *
 * 里面那支 `beforeToolCall` 的签名(ctx 一参、返回拦不拦)是 pi 定死的(外部规定);
 * 它的第一行就是信任边界:把 pi 交来的 `unknown` 收窄成本域自己的 `ToolArgs`,
 * 往下一个字都不再碰 `unknown`。
 *
 * @param input 这一趟的收件箱。
 * @returns pi 要的两个挂点。
 */
function makeToolGates(input: MakeToolGatesIn): MakeToolGatesOut {
  const box = input.box

  async function beforeToolCall(ctx: BeforeToolCallIn): BeforeToolCallOut {
    const args = ctx.args as ToolArgs
    let noc = ARG_NONE
    if (args && typeof args.noc === 'string') {
      noc = args.noc.trim()
    }
    if (noc === '') {
      return undefined
    }
    if (noc === box.noc) {
      return undefined
    }
    for (const c of box.candidates) {
      if (c.noc === noc) {
        return undefined
      }
    }
    log({ tag: CHAT_LOG.tag, text: `${GATE_LOG.blocked}${noc}` })
    return { block: true, reason: BLOCK_UNKNOWN_NOC }
  }

  return { beforeToolCall: beforeToolCall }
}

/**
 * 造这一趟的全部工具。每把的 `execute` 里都闭包着库连接与收件箱。
 *
 * 里面的嵌套件按闸的规矩不再各挂 JSDoc,共同的规矩集中写在这儿:
 *   · 每支 `exec*` 的两个参数是 pi 定死的(按位置传 toolCallId、args),第一位我们用不上;
 *   · `step` 的轨迹只在这一步**真的开始打了**才发 —— 采信没过就不该让用户看到「正在查」;
 *     入参是**工具名**,见客一行按 `run.lang` 从 `CONSULT_STEP` 取(轨迹是给人看的字,归 lib/i18n);
 *     `nocOf` 采信成功那一拍额外发 `CONSULT_STEP_OCC(职业名)` —— 那一刻职业名已在手,是最有信息量的一条;
 *   · 带职业码的工具(jobs/coverage/thresholds/ee/claims)先过 `nocOf` 采信,拿不到回「先去搜」;
 *     带省码的(draws/ops)先过 `provOf`,ops 不收 FED(联邦处理时长本站未收录);
 *     program 与 grid 由 schema 的字面量联合收窄,进来就不必再采信。
 *
 * 🔴 `nocOf` **采信的同时把 TEER 一起定下来**。实撞:TEER 原来是 `lookup_jobs` 的副产品,
 * 于是只问门槛不问岗位的那一轮 `teer` 是 null,而分 TEER 的条款(BC 对 TEER 2-5 要 CLB 4)
 * 在 `teerHit` 里一条都挑不出来 —— 语言要求整条静默消失,答复看起来还很完整。
 *
 * `execClaims` 把私人承诺**同时落进收件箱**:降级清单里也要有「这条核不了」这一行
 * (用户原话当引文,他自己的话可以见客)。
 *
 * 末尾的工具表:每把各带自己的 schema 泛型,数组本身就合法 —— 不需要断言。
 *
 * @param input 跑这一趟要的东西。
 * @returns 交给模型的工具表。
 */
// eslint-disable-next-line local/function-length -- 工具表:11 把工具的 execute 各自闭包着库连接与收件箱,拆开就得把这两样显式传一大串,反而更绕
function makeTools(input: MakeToolsIn): MakeToolsOut {
  const { run, box } = input

  function step(key: string): void {
    if (run.onStep) {
      let stepText = CONSULT_STEP[run.lang][key]
      if (stepText == null) {
        stepText = key
      }
      run.onStep(stepText)
    }
  }

  async function nocOf(raw: string): NocOfOut {
    const ok = acceptNoc({ raw: raw, candidates: box.candidates })
    if (ok && ok !== box.noc) {
      box.noc = ok
      const { rows } = await run.db.query(SQL.NOC_TITLE_TEER, [ok])
      const tt = toTitleTeer(rows)
      box.title = tt.title
      box.teer = tt.teer
      if (run.onStep) {
        run.onStep(stepOccLineOf({ lang: run.lang, occ: box.title || ok }))
      }
    }
    return box.noc
  }

  async function execSearch(_id: string, args: ExecSearchIn): ExecSearchOut {
    step(TOOL_NAME.search)
    const hits = await searchOccupations({ db: run.db, query: args.query.trim().slice(0, MAX_QUERY) })
    if (hits.length === 0) {
      return say(TOOL_REPLY.noCandidates)
    }
    const lines: string[] = []
    for (const hit of hits) {
      box.candidates.push(hit)
      lines.push(`${hit.noc}${LABEL.dash}${hit.title}`)
    }
    return say(`${TOOL_REPLY.candidatesHead}${NL}${lines.join(NL)}`)
  }

  async function execJobs(_id: string, args: ExecJobsIn): ExecJobsOut {
    const noc = await nocOf(args.noc)
    if (noc == null || noc === '') {
      return say(TOOL_REPLY.needNoc)
    }
    step(TOOL_NAME.jobs)
    const r = await lookupJobs({ db: run.db, noc })
    return take({ box, facts: jobsFacts(r) })
  }

  async function execCoverage(_id: string, args: ExecCoverageIn): ExecCoverageOut {
    const noc = await nocOf(args.noc)
    if (noc == null || noc === '') {
      return say(TOOL_REPLY.needNoc)
    }
    step(TOOL_NAME.coverage)
    const r = await lookupCoverage({ db: run.db, noc })
    return take({ box, facts: coverageFacts(r) })
  }

  async function execThresholds(_id: string, args: ExecThresholdsIn): ExecThresholdsOut {
    const noc = await nocOf(args.noc)
    if (noc == null || noc === '') {
      return say(TOOL_REPLY.needNoc)
    }
    step(TOOL_NAME.thresholds)
    const r = await lookupThresholds({
      db: run.db, noc, teer: box.teer, provs: cleanProvs({ raw: args.provs }), expMonths: run.profile.expMonths,
    })
    return take({ box, facts: thresholdsFacts(r) })
  }

  async function execDraws(_id: string, args: ExecDrawsIn): ExecDrawsOut {
    const prov = provOf(args.prov)
    if (prov == null) {
      return say(TOOL_REPLY.badProv)
    }
    step(TOOL_NAME.draws)
    const r = await lookupDraws({ db: run.db, prov })
    return take({ box, facts: drawsFacts(r) })
  }

  async function execOps(_id: string, args: ExecOpsIn): ExecOpsOut {
    const prov = provOf(args.prov)
    if (prov == null || prov === FED) {
      return say(TOOL_REPLY.badProv)
    }
    step(TOOL_NAME.ops)
    const r = await lookupOps({ db: run.db, prov })
    return take({ box, facts: opsFacts(r) })
  }

  async function execEe(_id: string, args: ExecEeIn): ExecEeOut {
    const noc = await nocOf(args.noc)
    if (noc == null || noc === '') {
      return say(TOOL_REPLY.needNoc)
    }
    step(TOOL_NAME.ee)
    const r = await lookupEe({ db: run.db, noc })
    return take({ box, facts: eeFacts(r) })
  }

  async function execPermit(_id: string, args: ExecPermitIn): ExecPermitOut {
    step(TOOL_NAME.permit)
    const r = await lookupPermit({ db: run.db, program: args.program })
    return take({ box, facts: permitFacts(r) })
  }

  async function execPoints(_id: string, args: ExecPointsIn): ExecPointsOut {
    step(TOOL_NAME.points)
    let section = ARG_NONE
    if (args.section !== undefined) {
      section = args.section.trim()
    }
    const r = await lookupPoints({ db: run.db, grid: args.grid, section })
    return take({ box, facts: pointsFacts(r) })
  }

  async function execVerdict(_id: string, _args: ExecVerdictIn): ExecVerdictOut {
    step(TOOL_NAME.verdict)
    const data = await run.loadVerdict(run.db)
    const rows = run.judgeVerdict({ profile: verdictProfileOf({ box, profile: run.profile }), data: data })
    return take({ box, facts: verdictFacts(rows) })
  }

  async function execClaims(_id: string, args: ExecClaimsIn): ExecClaimsOut {
    const noc = await nocOf(args.noc)
    if (noc == null || noc === '') {
      return say(TOOL_REPLY.needNoc)
    }
    step(TOOL_NAME.claims)
    const lines: string[] = []
    for (const raw of args.claims.slice(0, CLAIMS_CAP)) {
      const text = raw.trim().slice(0, CLAIM_TEXT_CAP)
      if (text === '') {
        continue
      }
      if (PRIVATE_PROMISE.test(text)) {
        lines.push(`${SEP.bullet}${text}${LABEL.dash}${TOOL_REPLY.claimPrivate}`)
        if (box.facts.length < MAX_FACTS) {
          box.facts.push(statusFact({
            tool: TOOL_NAME.claims,
            label: `${LABEL.claimHead}${text}`,
            quote: text,
            availability: AVAIL.notApplicable,
            evidence: { url: EVIDENCE_URL_NONE, fetched: EVIDENCE_FETCHED_NONE },
          }))
        }
        continue
      }
      lines.push(`${SEP.bullet}${text}${LABEL.dash}${TOOL_REPLY.claimCheckable}`)
    }
    if (lines.length === 0) {
      return say(TOOL_REPLY.empty)
    }
    return say(lines.join(NL))
  }

  const search: Tool<typeof SEARCH_PARAMS> = {
    name: TOOL_NAME.search, label: TOOL_LABEL.search, description: TOOL_DESC.search, parameters: SEARCH_PARAMS, execute: execSearch,
  }
  const jobs: Tool<typeof NOC_PARAMS> = {
    name: TOOL_NAME.jobs, label: TOOL_LABEL.jobs, description: TOOL_DESC.jobs, parameters: NOC_PARAMS, execute: execJobs,
  }
  const coverage: Tool<typeof NOC_PARAMS> = {
    name: TOOL_NAME.coverage, label: TOOL_LABEL.coverage, description: TOOL_DESC.coverage, parameters: NOC_PARAMS, execute: execCoverage,
  }
  const thresholds: Tool<typeof NOC_PROVS_PARAMS> = {
    name: TOOL_NAME.thresholds, label: TOOL_LABEL.thresholds, description: TOOL_DESC.thresholds, parameters: NOC_PROVS_PARAMS, execute: execThresholds,
  }
  const draws: Tool<typeof PROV_PARAMS> = {
    name: TOOL_NAME.draws, label: TOOL_LABEL.draws, description: TOOL_DESC.draws, parameters: PROV_PARAMS, execute: execDraws,
  }
  const ops: Tool<typeof PROV_PARAMS> = {
    name: TOOL_NAME.ops, label: TOOL_LABEL.ops, description: TOOL_DESC.ops, parameters: PROV_PARAMS, execute: execOps,
  }
  const ee: Tool<typeof NOC_PARAMS> = {
    name: TOOL_NAME.ee, label: TOOL_LABEL.ee, description: TOOL_DESC.ee, parameters: NOC_PARAMS, execute: execEe,
  }
  const permit: Tool<typeof PERMIT_PARAMS> = {
    name: TOOL_NAME.permit, label: TOOL_LABEL.permit, description: TOOL_DESC.permit, parameters: PERMIT_PARAMS, execute: execPermit,
  }
  const points: Tool<typeof CRS_PARAMS> = {
    name: TOOL_NAME.points, label: TOOL_LABEL.points, description: TOOL_DESC.crs, parameters: CRS_PARAMS, execute: execPoints,
  }
  const verdict: Tool<typeof VERDICT_PARAMS> = {
    name: TOOL_NAME.verdict, label: TOOL_LABEL.verdict, description: TOOL_DESC.verdict, parameters: VERDICT_PARAMS, execute: execVerdict,
  }
  const claims: Tool<typeof CLAIMS_PARAMS> = {
    name: TOOL_NAME.claims, label: TOOL_LABEL.claims, description: TOOL_DESC.claims, parameters: CLAIMS_PARAMS, execute: execClaims,
  }
  return [search, jobs, coverage, thresholds, draws, ops, ee, permit, points, verdict, claims]
}

// =========================================================================
// 7. 循环
// =========================================================================

/**
 * 拼这一趟的 system prompt:规则 + 语种 + 用户自己说过的档案。
 *
 * @param input 跑这一趟要的东西。
 * @returns 完整的 system prompt。
 */
function systemOf(input: RunIn): string {
  const said: string[] = []
  const p = input.profile
  if (p.noc) {
    said.push(`${SAID.noc}${p.noc}`)
  }
  if (p.occText) {
    said.push(`${SAID.occOpen}${p.occText}${SAID.occClose}`)
  }
  if (p.provs.length) {
    said.push(`${SAID.provs}${p.provs.join(SEP.comma)}`)
  }
  if (p.expMonths != null) {
    said.push(`${p.expMonths}${SAID.exp}`)
  }
  if (p.status) {
    said.push(`${SAID.status}${p.status}`)
  }
  let profile = PROFILE_NONE
  if (said.length) {
    profile = `${PROFILE_HEAD}${said.join(SEP.semi)}`
  }
  return `${SYSTEM_RULES}${NL}${NL}${REPLY_LANGUAGE_HEAD}${LANG_NAME[input.lang]}${NL}${NL}${profile}`
}

/**
 * 把用户这一句(前面带上几轮历史)包成 pi 认的消息。
 *
 * 🔴 **我们只产 user 消息**,历史折进正文而不是伪造成 assistant 轮 ——
 * pi 的 assistant 消息带一整套模型元数据(api / provider / usage / stopReason),
 * 我们手上没有那些,编出来只会在下一轮被当真。
 *
 * @param input 用户原话与历史。
 * @returns pi 认的一条 user 消息。
 */
function firstPrompt(input: RunIn): TranscriptMessage {
  const lines: string[] = []
  if (input.history.length) {
    lines.push(EARLIER_HEAD)
  }
  for (const turn of input.history.slice(-HISTORY_TURNS)) {
    lines.push(`${turn.role}${SEP.colon}${turn.content.slice(0, HISTORY_CAP)}`)
  }
  let earlier = SEG_NONE
  if (lines.length) {
    earlier = `${lines.join(NL)}${NL}${NL}${NOW_HEAD}`
  }
  const message: TranscriptMessage = {
    role: ROLE.user,
    content: [{ type: ROLE.text, text: earlier + input.text }],
    timestamp: Date.now(),
  }
  return message
}

/**
 * 从一条消息里取出正文(不含思维链与工具调用)。
 *
 * @param message 循环里的一条消息。
 * @returns 正文;这条不是助手正文就返回空串。
 */
function textOf(message: TranscriptMessage): string {
  if (message.role !== ROLE.assistant) {
    return TEXT_NONE
  }
  const parts: string[] = []
  for (const block of message.content) {
    if (block.type === ROLE.text) {
      parts.push(block.text)
    }
  }
  return parts.join(TEXT_BLOCK_SEP)
}

/**
 * 从循环跑出来的整串消息里取最后一段正文;取不出来就抛,不返回空串。
 *
 * 🔴 **pi 被 abort 时是正常返回、不抛** —— 所以超时只能在这里认出来,
 * `draftOnce` 的 `catch` 里那句 `ac.signal.aborted` 永远够不着。
 * 2026-08-21 实测三条(「我 480 稳吗」「按我的情况判一判走哪条路最快」
 * 「大家都是这么说的 两个一年 能换 3 年」)全是 45.0s、`out=0`、`degraded=false`:
 * 原先写的是 `drafts.length ? … : ''`,把「一个字都没写出来」悄悄变成「答案是空字符串」,
 * 用户看到一片空白,而四道出口闸一道都不响 —— 闸查的是「数字有没有出处」,空串一个数字都没有。
 *
 * @param input 循环产出的消息,以及这一趟是不是被掐断的。
 * @returns 最后一段有字的正文。
 */
function lastDraftOf(input: LastDraftOfIn): string {
  const drafts: string[] = []
  for (const m of input.messages) {
    const t = textOf(m)
    if (t) {
      drafts.push(t)
    }
  }
  if (input.aborted) {
    throw chatError({ code: CHAT_CODE.busy, msg: `${FAIL_MSG.timeout}${TIMEOUT_MS}${FAIL_MSG.ms}`, slots: null })
  }
  if (drafts.length === 0) {
    throw chatError({ code: CHAT_CODE.llm, msg: FAIL_MSG.emptyDraft, slots: null })
  }
  return drafts[drafts.length - 1]
}

/**
 * 跑一趟 pi 循环,拿模型写的稿子。
 *
 * 里面的嵌套件按闸的规矩不再各挂 JSDoc,要点写在这儿:
 *   · `onTimeout` 到点掐断 —— 多轮循环没有单发看门狗,预算按**整趟**算;
 *   · `onEvent` 只管正文增量(工具轨迹在各 execute 里发过了)。
 *     ⚠️ 思考期间 `content` 是**空串**不是缺字段,按真值判会漏计;
 *   · 末参那句 `streamSimple as StreamFn` 是跨边界断言:pi 的 StreamFn 要通吃所有 Api,
 *     而这个 stream 锁死 openai-completions —— 逆变对不上,只能断言(宪法「跨边界的断言留着」)。
 *
 * @param input 跑这一趟要的东西。
 * @returns 模型写的稿子。
 */
async function draftOnce(input: DraftOnceIn): DraftOnceOut {
  const { run, box, extra } = input
  const ac = new AbortController()

  function onTimeout(): void {
    ac.abort()
  }
  const timer = setTimeout(onTimeout, TIMEOUT_MS)
  const sent = { n: 0 }

  function onEvent(event: OnEventIn): void {
    if (event.type !== MESSAGE_UPDATE || event.message == null || run.onDelta == null) {
      return
    }
    const full = textOf(event.message)
    if (full.length <= sent.n) {
      return
    }
    run.onDelta(full.slice(sent.n))
    sent.n = full.length
  }

  try {
    const messages = await runAgentLoop(
      [firstPrompt(run)],
      { systemPrompt: systemOf(run) + extra, messages: [], tools: makeTools({ run, box }) },
      {
        model: model(), apiKey: KEY || NO_KEY_PLACEHOLDER, maxTokens: MAX_TOKENS,
        convertToLlm: passThroughMessages,
        beforeToolCall: makeToolGates({ box: box }).beforeToolCall,
      },
      onEvent,
      ac.signal,
      streamSimple as StreamFn,
    )
    return lastDraftOf({ messages: messages, aborted: ac.signal.aborted })
  } catch (e) {
    let why = String(e)
    if (e instanceof Error) {
      why = e.message.slice(0, ERR_CAP)
    }
    log({ tag: CHAT_LOG.tag, text: `${CHAT_FN.runChatLoop}${CHAT_LOG.failedTail}${why}` })
    if (ac.signal.aborted) {
      throw chatError({ code: CHAT_CODE.busy, msg: `${FAIL_MSG.timeout}${TIMEOUT_MS}${FAIL_MSG.ms}`, slots: null })
    }
    throw chatError({ code: CHAT_CODE.llm, msg: why, slots: null })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 撞到的闸里,哪几道拦的是「假话」。
 *
 * 只有这几道值得把答案整段换掉 —— 见 `HARD_GATES` 的注释。
 *
 * @param input 这一轮撞到的全部闸。
 * @returns 其中的硬闸;没有则空。
 */
function hardHits(input: HardHitsIn): HardHitsOut {
  const out: GateHit[] = []
  for (const h of input.fired) {
    if (HARD_GATES.includes(h.gate)) {
      out.push(h)
    }
  }
  return out
}

/**
 * 造这一趟的收件箱。
 *
 * 🔴 **调用方给了 `profile.noc`,就必须当场把 `title`/`teer` 一起查出来** ——
 * 光有码是个半拉身份。`nocOf` 只在「模型挑的码与手上这个不同」时才补那两格,
 * 而预填的码一进来就已经相等,那个分支永远不走,`teer` 一路 `null` 到底。
 * 门槛行是按 TEER 划适用范围的(`lib/gauge` 的 `teerHit`:分 TEER 又不知道 TEER
 * = 这一行根本挑不出来),于是整条语言要求**从事实里消失**,模型看不见它,
 * 就写出「官方并未列出语言分数线」—— 而库里明明有「TEER 2/3/4/5 四项各 CLB 4」那一行。
 * 「官方不公布」是需要举证的断言,不是默认值(CLAUDE.md 数据约定),这是最重的一类错。
 *
 * 2026-08-21 实测同一句「木匠在 BC 对语言有什么要求」:不给 profile 答「四项各 CLB 4」,
 * 给了 `profile.noc` 答「官方并未列出」——两个都 `degraded=false`、都过了全部出口闸。
 *
 * @param input 库连接与调用方给的档案。
 * @returns 收件箱;没有预填的码时 `title`/`teer` 留空,由 `nocOf` 后补。
 */
async function boxFor(input: BoxForIn): BoxForOut {
  const noc = input.profile.noc
  if (noc === '') {
    return { facts: [], candidates: [], noc: null, title: TITLE_PENDING, teer: null }
  }
  const { rows } = await input.db.query(SQL.NOC_TITLE_TEER, [noc])
  const tt = toTitleTeer(rows)
  return { facts: [], candidates: [], noc: noc, title: tt.title, teer: tt.teer }
}

/**
 * 答一个问题:跑工具循环,过出口闸,撞了重写一次,再撞就降级成事实清单。
 *
 * 降级只认**硬闸**(拦假话的那几道):软闸没过只是难看,留着模型那一版,
 * 换成一行英文事实清单反而更糟(2026-08-20 实拍,见 `HARD_GATES` 的注释)。
 *
 * @param input 库连接、用户原话、语种、档案、历史与两个回调。
 * @returns 过完闸的答复、标好 `cited` 的事实、采信的职业码、是不是降级来的。
 */
export async function consult(input: RunIn): ConsultOut {
  if (BASE === '') {
    throw chatError({ code: CHAT_CODE.llm, msg: FAIL_MSG.noBase, slots: null })
  }
  const box: Inbox = await boxFor({ db: input.db, profile: input.profile })
  const echo = input.history.filter(isUserTurn).map(contentOf).concat(input.text).join(NL)
  const t0 = Date.now()

  let answer = ANSWER_PENDING
  let fired: GateHit[] = []
  for (let attempt = 0; attempt <= GUARD_RETRIES; attempt += 1) {
    let extra = SEG_NONE
    if (fired.length) {
      extra = `${NL}${NL}${retryNote(fired)}`
    }
    answer = clampAnswer({ answer: await draftOnce({ run: input, box, extra }), lang: input.lang })
    fired = runGates({ answer, facts: box.facts, echo, lang: input.lang, codes: codesOf(box) })
    if (fired.length === 0) {
      break
    }
    log({
      tag: CHAT_LOG.tag,
      text: `${GATE_LOG.hit}${attempt + 1} ${fired.map(gateLabel).join(GATE_LOG.comma)}${GATE_LOG.noc}${orNone2({ v: box.noc, fallback: GATE_LOG.none })}`,
    })
  }

  const hard = hardHits({ fired: fired })
  const degraded = hard.length > 0
  if (degraded) {
    if (box.facts.length === 0) {
      throw chatError({ code: CHAT_CODE.guard, msg: `${FAIL_MSG.noFacts}${hard.map(gateLabel).join(GATE_LOG.comma)}`, slots: null })
    }
    answer = factSheet(box.facts)
  }
  const facts = citeFacts({ answer, facts: box.facts })
  log({
    tag: CHAT_LOG.tag,
    text: `${CHAT_LOG.loopDone}${orNone2({ v: box.noc, fallback: GATE_LOG.none })}${CHAT_LOG.facts}${box.facts.length}`
      + `${CHAT_LOG.ms}${Date.now() - t0}${CHAT_LOG.out}${answer.length}${GATE_LOG.degraded}${degraded}`,
  })
  return { answer, facts, noc: box.noc, degraded }
}

/**
 * 是不是用户说的那一轮。
 *
 * @param turn 一轮对话。
 * @returns 是不是用户轮。
 */
function isUserTurn(turn: IsUserTurnIn): boolean {
  return turn.role === ROLE.user
}

/**
 * 取一轮的正文。
 *
 * @param turn 一轮对话。
 * @returns 正文。
 */
function contentOf(turn: ContentOfIn): string {
  return turn.content
}

/**
 * 一道闸在日志里的样子:名字加撞了几条。**逐道具名** —— 「撞了」要看得见,「撞的是谁」也要看得见。
 *
 * @param hit 一道闸的判定结果。
 * @returns 日志里的一段。
 */
function gateLabel(hit: GateHit): string {
  return `${hit.gate}${GATE_LOG.paren}${hit.hits.join(GATE_LOG.pipe)}${GATE_LOG.parenEnd}`
}

/**
 * 重写时追加给模型的那段话:点名上一稿撞了什么,并把违规内容列成黑名单。
 *
 * 首句那道闸额外带上**怎么改**:光报「你违反了哪一条」对它没用(实拍两次重写都没改掉)。
 *
 * @param fired 撞到的每一道闸。
 * @returns 追加进 system prompt 的那段话。
 */
function retryNote(fired: RetryNoteIn): string {
  const lines = [RETRY_HEAD]
  for (const hit of fired) {
    lines.push(`${RETRY_BULLET}${hit.gate}${RETRY_COLON}${hit.hits.join(RETRY_COMMA)}`)
  }
  for (const hit of fired) {
    if (hit.gate === GATE.opening) {
      lines.push(RETRY_OPENING)
    }
  }
  return lines.join(NL)
}

/**
 * 采信出职业那一拍的轨迹一行(模板在 constants 的 CONSULT_STEP_OCC_TPL,{occ} 槽用 fill 填)。
 *
 * @param input 语言与职业名。
 * @returns 轨迹一行。
 */
export function stepOccLineOf(input: StepOccLineIn): string {
  return fill({ tpl: CONSULT_STEP_OCC_TPL[input.lang], params: { occ: input.occ } })
}

/**
 * 一个对象 → 一包 SSE 字节。
 *
 * @param o 要发的对象。
 * @returns 编码后的一包。
 */
export function sseChunk(o: SsePacket): SseBytes {
  return new TextEncoder().encode(SSE_PREFIX + JSON.stringify(o) + SSE_SUFFIX)
}

/**
 * 同一串追问的 id = 首轮提问文本的哈希。不用 IP/UA/session —— 那三样都指向人,
 * 而我们只需要「这几轮是一串」这一个信息。
 *
 * @param input 本轮提问与历史。
 * @returns 16 位十六进制串。
 */
export function threadIdOf(input: ThreadIdIn): string {
  let first = input.text
  for (const h of input.history) {
    if (h.role === ROLE.user) {
      first = h.content
      break
    }
  }
  return createHash(HASH_SHA256).update(first.trim().slice(0, THREAD_SEED)).digest(HASH_HEX).slice(0, THREAD_ID_LEN)
}

/**
 * 本串里的第几轮:history 里的 user 消息数 + 1。
 *
 * @param history 多轮历史。
 * @returns 轮次(1 起)。
 */
export function turnOf(history: TurnList): number {
  let n = 0
  for (const h of history) {
    if (h.role === ROLE.user) {
      n = n + 1
    }
  }
  return n + 1
}

/**
 * 写一行 chat_logs。fire-and-forget,自己吞异常(swallowChatlogError 留痕)——
 * 留痕是副产品,它挂了用户不该有任何感知;列形状一字不动。
 *
 * @param input 句柄与一轮的问/答/错误码/耗时。
 * @returns 没有返回值(不等写库)。
 */
export function logChat(input: LogChatIn): void {
  if (input.payload == null) {
    return
  }
  let answer: string | null = null
  let nocCell: string | null = null
  let slotsCell: ChatOut['slots'] | null = null
  let factsCell: Fact[] | null = null
  let toolsCell: string[] | null = null
  let degraded = false
  if (input.result != null) {
    if (input.result.answer !== '') {
      answer = input.result.answer.slice(0, A_CAP)
    }
    nocCell = input.result.slots.noc
    slotsCell = input.result.slots
    if (input.result.facts.length > 0) {
      factsCell = input.result.facts
      const tools = new Set<string>()
      for (const f of input.result.facts) {
        tools.add(f.tool)
      }
      toolsCell = Array.from(tools)
    }
    degraded = input.result.degraded
  }
  input.payload.create({
    collection: COLLECTION_CHAT_LOGS,
    data: {
      thread: threadIdOf({ text: input.text, history: input.history }),
      turn: turnOf(input.history),
      lang: input.lang,
      question: input.text.slice(0, Q_CAP),
      answer: answer,
      noc: nocCell,
      slots: slotsCell,
      facts: factsCell,
      tools: toolsCell,
      degraded: degraded,
      err: input.err,
      ms: Math.round(input.ms),
    },
  }).catch(swallowChatlogError)
}

/**
 * chat_logs 写库失败的收尾(catch 传具名函数;只留痕不影响用户)。
 *
 * @param e 捕到的错。
 * @returns 没有返回值。
 */
function swallowChatlogError(e: CaughtError): void {
  log({ tag: CHAT_LOG.tag, text: CHAT_LOG.chatlogSkipped + e.message.slice(0, ERR_LOG_CAP) })
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * 检索行 → 干净命中。每格空值决策见 `lib/db` 的词汇表(text/count/numOrNull),
 * 下面九个映射函数同此 —— 收窄只在映射里做一次,循环与调用处不再出现 `??`。
 *
 * @param r 原始行。
 * @returns 收窄后的命中。
 */
export function toNocHit(r: NocSearchRow): NocHit {
  return { noc: text(r.noc), title: text(r.title), n: count(r.n) }
}

/**
 * 各省在招数行 → `JobsRow`。open/named 是计数,0 无害。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toProvOpen(r: ProvOpenRow): JobsRow {
  return { prov: text(r.province), open: count(r.open), named: count(r.named) }
}

/**
 * 职业名与 TEER 结果集 → 干净对象。零行在这儿显式落空(''/null),数组越界的 undefined
 * 不进契约。TEER 走 `numOrNull` —— 不知道就是 null,分 TEER 的条款那时一条都挑不出来,那是实话。
 *
 * @param rows 查询结果集,可能为空。
 * @returns 收窄后的对象。
 */
export function toTitleTeer(rows: ToTitleTeerIn): TitleTeer {
  if (rows.length === 0) {
    return { title: '', teer: null }
  }
  return { title: text(rows[0].title), teer: numOrNull(rows[0].teer) }
}

/**
 * 清单收录行 → 干净记录。通道名官方缺失时落到本站短名。
 *
 * @param r 原始行。
 * @returns 收窄后的记录。
 */
export function toOccFlat(r: OccFlatRow): OccFlat {
  return {
    province: text(r.province),
    noc: text(r.noc),
    stream: text(r.stream) || text(r.label),
    type: text(r.type),
    url: text(r.url),
    fetched: text(r.fetched),
  }
}

/**
 * 抽选行 → `DrawRow`。分数线与邀请数走 `numOrNull` —— 官方没公布就是 null,不折 0。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toDrawRow(r: DrawDbRow): DrawRow {
  return {
    prov: text(r.province),
    date: text(r.draw_date).slice(0, DATE_LEN),
    stream: text(r.stream),
    scale: text(r.scale),
    score: numOrNull(r.score),
    invitations: numOrNull(r.invitations),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * 运营统计行 → `OpsRow`。value 走 `numOrNull` —— 隐私抑制值折成 0 就是替官方编数。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toOpsRow(r: OpsDbRow): OpsRow {
  return {
    key: text(r.metric),
    scope: text(r.scope),
    label: text(r.label),
    value: numOrNull(r.value),
    valueText: text(r.value_text),
    unit: text(r.unit),
    asOf: text(r.as_of),
    period: text(r.period),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * EE 类别行 → `EeRow`。分数线与邀请数走 `numOrNull`。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toEeRow(r: EeDbRow): EeRow {
  return {
    category: text(r.category),
    label: text(r.label),
    drawCrs: numOrNull(r.draw_crs),
    drawDate: text(r.draw_date).slice(0, DATE_LEN),
    drawSize: numOrNull(r.draw_size),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * 联邦规则行 → `PermitRow`。value 走 `numOrNull`(`rule` 行本来就没有阈值);
 * 出处页 url 缺失时落到所属页面 page_url。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toPermitRow(r: PermitDbRow): PermitRow {
  return {
    program: text(r.program),
    stream: text(r.stream),
    factor: text(r.factor),
    op: text(r.op),
    value: numOrNull(r.value),
    valueText: text(r.value_text),
    unit: text(r.unit),
    basis: text(r.basis),
    label: text(r.label),
    evidence: { url: text(r.url) || text(r.page_url), fetched: text(r.fetched) },
  }
}

/**
 * 计分表行 → `PointsRow`。points 走 `numOrNull` —— 官方写 n/a 就是 null,原文在 pointsText。
 *
 * @param r 原始行。
 * @returns 收窄后的行。
 */
export function toPointsRow(r: PointsDbRow): PointsRow {
  return {
    grid: text(r.grid),
    section: text(r.section),
    sectionLabel: text(r.section_label),
    kind: text(r.kind),
    heading: text(r.heading),
    factor: text(r.factor),
    criterion: text(r.criterion),
    columnLabel: text(r.column_label),
    points: numOrNull(r.points),
    pointsText: text(r.points_text),
    evidence: { url: text(r.url), fetched: text(r.fetched) },
  }
}

/**
 * 门槛行的 subject 列 → 两个合法值之一。不是 employer 的一律按 applicant 读 ——
 * 这两个搞混,句子本身就是假的(「你要开满一年」vs「雇主要开满一年」)。
 *
 * @param raw 库里的 subject 列。
 * @returns applicant 或 employer。
 */
export function subjectOf(raw: SubjectOfIn): SubjectOfOut {
  if (text(raw) === SUBJECT.employer) {
    return SUBJECT.employer
  }
  return SUBJECT.applicant
}

/**
 * 库里一行门槛条文 → `lib/rules` 认的 `Requirement`。
 *
 * 只做列名映射,一个判定都不做 —— 判定是 `evaluateRequirements` 的活,本域不重写它。
 *
 * @param row 库里的一行。
 * @returns 判定引擎认的形状。
 */
export function toRequirement(row: ReqRow): Requirement {
  return {
    province: text(row.province),
    program: text(row.program),
    stream: text(row.stream),
    subject: subjectOf(row.subject),
    factor: text(row.factor),
    op: text(row.op),
    value: numOrNull(row.value),
    valueText: text(row.value_text),
    unit: text(row.unit),
    appliesTeer: text(row.applies_teer),
    appliesNoc: text(row.applies_noc),
    excludesNoc: text(row.excludes_noc),
    appliesArea: text(row.applies_area),
    appliesCondition: text(row.applies_condition),
    familySize: numOrNull(row.applies_family_size),
    basis: text(row.basis),
    label: text(row.label),
    section: text(row.section),
    effective: text(row.effective),
    url: text(row.url),
    pageUrl: text(row.page_url),
    fetched: text(row.fetched),
  }
}

// =========================================================================
// 回调(callbacks 抽屉 2026-08-23 撤编后的固定尾段;签名由外部库/语言定死,逐行特批)
// =========================================================================

/**
 * 在招数从多到少。并列时按省码排,保证同一次查询连查两遍结果一模一样。
 *
 * 两个参数是 `Array.prototype.sort` 定死的签名(外部规定)。
 *
 * @param a 左边那行。
 * @param b 右边那行。
 * @returns 排序比较值。
 */
// eslint-disable-next-line local/one-parameter, local/typed-signature -- 签名由外部库/语言定死(callbacks 撤编,宪法钦定逐行特批形态)
export function byOpenDesc(a: JobsRow, b: JobsRow): number {
  return b.open - a.open || a.prov.localeCompare(b.prov)
}
