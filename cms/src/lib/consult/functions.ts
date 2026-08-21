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

import { runAgentLoop } from '@earendil-works/pi-agent-core'
import type { AgentMessage, StreamFn } from '@earendil-works/pi-agent-core'
import { streamSimple } from '@earendil-works/pi-ai/api/openai-completions'
import type { Model } from '@earendil-works/pi-ai'
import { acceptNoc, passThroughMessages } from '../agent/server'
import { loadVerdictTables, pathVerdict } from '../ruling/server'
import { cleanProvs } from '../location'
import { chatError, CHAT_CODE } from '../error'
import { CHAT_FN, CHAT_LOG, GATE_LOG, log } from '../log'
import * as SQL from '../db/sql'
import { evaluateRequirements } from '../gauge'
import type { Requirement, RuleProfile } from '../gauge'
import {
  API, AS_FOLLOWS, AUTH_HEADER, AVAIL, BASE, BEARER, BOLD_RE, CLAIMS_CAP, CLAIM_TEXT_CAP, CONTEXT_WINDOW,
  DRAW_LIMIT, EARLIER_HEAD, EN, EN_UNIT_WORDS, FAIL_MSG, FED, FIRST_LINE_CAP, FULL_STOP, GATE, GRID_CRS,
  GUARD_RETRIES, HARD_GATES, HAS_DIGIT, HEADING_RE, HISTORY_CAP, HISTORY_TURNS, INELIGIBLE, INTERNAL_WORDS,
  JOBS_LINK, KEY, KIND_SUMMARY, LABEL, LANG_NAME, LEAD_MARK, LEN_CAP, LIKE_ANY, LIKE_ESCAPE, LIKE_SPECIAL,
  MARKUP, MAX_FACTS, MAX_QUERY, MAX_TOKENS, MESSAGE_UPDATE, MODEL_ID, NL, NOISE_RATIO, NOW_HEAD,
  NO_KEY_PLACEHOLDER, NUMBERED_RE, NUM_RE, OPENING_COLON, OPENING_SAMPLE, POINTS_LIMIT, PRIVATE_PROMISE,
  PROVIDER, PROVS, QC, REASON_EXCLUDED, ROLE, SAID, SAMPLING, SEARCH_LIMIT, SEP, SHEET_CAP, SPACE, STAR_RE,
  STATUS_WORDS, SUBJECT, TABLE_RE, THOUSANDS_COMMA, TIER_TEXT, TIMEOUT_MS, TOOL_LABEL, TOOL_NAME,
  TRAILING_ZEROS, UNIT, V1, WORD_EDGE,
} from './constants'
import {
  BLOCK_UNKNOWN_NOC, PROFILE_HEAD, PROFILE_NONE, REPLY_LANGUAGE_HEAD, RETRY_BULLET, RETRY_COLON, RETRY_COMMA,
  RETRY_HEAD, RETRY_OPENING, SYSTEM_RULES, TOOL_DESC, TOOL_REPLY,
} from './prompts'
import { CLAIMS_PARAMS, CRS_PARAMS, NOC_PARAMS, NOC_PROVS_PARAMS, PERMIT_PARAMS, PROV_PARAMS, SEARCH_PARAMS, VERDICT_PARAMS } from './schemas'
import { byOpenDesc } from './callbacks'
import type {
  AllowedNumbersIn, AllowedNumbersOut, AnswerLangIn, BeforeToolCallIn, BeforeToolCallOut, BlankCoverageIn,
  BlankCoverageOut, BlankIfNumberedIn, BlankIfNumberedOut, BoxForIn, BoxForOut, Candidate, CiteFactsIn,
  CiteFactsOut, ClampAnswerOut, CodesOfIn, CodesOfOut, ConsultIn, ConsultOut, ContentOfIn, ContentOfOut,
  CoverageFactsIn, CoverageFactsOut, CoverageRow, DraftOnceIn, DraftOnceOut, DrawRow, DrawsFactsIn,
  DrawsFactsOut, EeFactsIn, EeFactsOut, EeRow, ExecCoverageIn, ExecCoverageOut, ExecDrawsIn, ExecDrawsOut,
  ExecEeIn, ExecEeOut, ExecJobsIn, ExecJobsOut, ExecOpsIn, ExecOpsOut, ExecPermitIn, ExecPermitOut,
  ExecPointsIn, ExecPointsOut, ExecSearchIn, ExecSearchOut, ExecThresholdsIn, ExecThresholdsOut, Fact, FactIn,
  FactOut, FactSheetIn, FactSheetOut, FindEnglishUnitsOut, FindInternalWordsIn, FindInternalWordsOut,
  FindRawMarkupIn, FindRawMarkupOut, FindRestatedOpeningIn, FindRestatedOpeningOut, FindUngroundedNumbersOut,
  FirstLineOfIn, FirstLineOfOut, FirstPromptIn, FirstPromptOut, GateHit, GateLabelIn, GateLabelOut, HardHitsIn,
  HardHitsOut, Inbox, IsUserTurnIn, IsUserTurnOut, JobsFactsIn, JobsFactsOut, JobsRow, LastDraftOfIn,
  LastDraftOfOut, LookupCoverageIn, LookupCoverageOut, LookupDrawsIn, LookupDrawsOut, LookupEeIn, LookupEeOut,
  LookupJobsIn, LookupJobsOut, LookupOpsIn, LookupOpsOut, LookupPermitIn, LookupPermitOut, LookupPointsIn,
  LookupPointsOut, LookupThresholdsIn, LookupThresholdsOut, MakeToolGatesIn, MakeToolGatesOut, MakeToolsIn,
  MakeToolsOut, ModelOut, NocOfIn, NocOfOut, NormNumIn, NormNumOut, NumberCheckIn, OnEventIn, OnEventOut,
  OnTimeoutOut, OpsFactsIn, OpsFactsOut, OpsRow, PermitFactsIn, PermitFactsOut, PermitRow, PointsFactsIn,
  PointsFactsOut, PointsRow, ProvOfIn, ProvOfOut, RetryNoteIn, RetryNoteOut, RunGatesIn, RunGatesOut, RunIn,
  SayIn, SayOut, SearchOccupationsIn, SearchOccupationsOut, StatusFactIn, StatusFactOut, StepIn, StepOut,
  SystemOfOut, TakeIn, TakeOut, TextOfIn, TextOfOut, ThresholdsFactsIn, ThresholdsFactsOut, ThresholdsRow,
  TierTextIn, TierTextOut, ToRequirementIn, ToRequirementOut, Tool, ToolArgs, VerdictFactsIn, VerdictFactsOut,
  VerdictProfileOfIn, VerdictProfileOfOut, ExecClaimsIn, ExecClaimsOut, ExecVerdictIn, ExecVerdictOut,
} from './types'

// =========================================================================
// 1. 模型
// =========================================================================

/**
 * 这一趟用哪个模型。协议锁 openai-completions —— 局域网直连与经隧道两个门说的都是它。
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
    // 这四个 0 是照实说,不是省事:两道门(局域网直连、朋友服务器经 ngrok 暴露的那个)
    // 都不按 token 计费。⚠️ 哪天换成按量收费的云 API,这里就成了假话 —— pi 拿它记账,
    // 填 0 等于把花掉的钱报成零;那时要填真实单价,而且单价随模型变,得跟着 MODEL_ID 走。
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    samplingParams: SAMPLING,
  }
  // 直连局域网那台裸 Ollama 没有鉴权,没钥匙就不挂这个头(挂个空的会被某些网关当成鉴权失败)
  if (KEY) m.headers = { [AUTH_HEADER]: `${BEARER}${KEY}` }
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
function provOf(raw: ProvOfIn): ProvOfOut {
  const p = raw.trim().toUpperCase()
  if (p === FED) return p
  return PROVS.has(p) ? p : ''
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
  const { rows } = await input.db.query(SQL.NOC_LIST_WITH_TITLES, [like, SEARCH_LIMIT])
  const top = Number(rows[0]?.n ?? 0)
  const hits: Candidate[] = []
  for (const r of rows) {
    const noc = String(r.noc ?? '')
    const title = String(r.title ?? '')
    if (noc && title && Number(r.n ?? 0) >= top * NOISE_RATIO) hits.push({ noc, title })
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
async function lookupJobs(input: LookupJobsIn): LookupJobsOut {
  const [counts, title] = await Promise.all([
    input.db.query(SQL.PROV_OPEN_BY_PROV, [input.noc]),
    input.db.query(SQL.NOC_TITLE_TEER, [input.noc]),
  ])
  const byProv = new Map<string, JobsRow>()
  for (const prov of PROVS) byProv.set(prov, { prov, open: 0, named: 0 })
  for (const r of counts.rows) {
    const prov = String(r.province ?? '')
    if (byProv.has(prov)) byProv.set(prov, { prov, open: Number(r.open ?? 0), named: Number(r.named ?? 0) })
  }
  const rows = Array.from(byProv.values()).sort(byOpenDesc)
  const head = title.rows[0]
  return { noc: input.noc, title: String(head?.title ?? ''), teer: head?.teer == null ? null : Number(head.teer), rows }
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
async function lookupCoverage(input: LookupCoverageIn): LookupCoverageOut {
  const { rows } = await input.db.query(SQL.PNP_OCCUPATIONS_FLAT, [])
  const byProv = new Map<string, CoverageRow>()
  for (const r of rows) {
    const prov = String(r.province ?? '')
    const noc = String(r.noc ?? '')
    if (!PROVS.has(prov) || noc !== input.noc) continue
    const row = byProv.get(prov) ?? blankCoverage(prov)
    const stream = String(r.stream ?? r.label ?? '')
    if (String(r.type ?? '') === INELIGIBLE) row.excluded.push(stream)
    else row.streams.push(stream)
    row.availability = AVAIL.ok
    row.evidence = { url: String(r.url ?? ''), fetched: String(r.fetched ?? '') }
    byProv.set(prov, row)
  }
  const out: CoverageRow[] = []
  for (const prov of PROVS) out.push(byProv.get(prov) ?? blankCoverage(prov))
  return { noc: input.noc, rows: out }
}

/**
 * 一个省的空白收录行:**默认是「本站未收录」而不是「不收录」** —— 举不出证就不许说官方的话。
 *
 * @param prov 两位省码。
 * @returns 空白行。
 */
function blankCoverage(prov: BlankCoverageIn): BlankCoverageOut {
  return { prov, streams: [], excluded: [], availability: AVAIL.notCollected, evidence: { url: '', fetched: '' } }
}

/**
 * 库里一行门槛条文 → `lib/rules` 认的 `Requirement`。
 *
 * 只做列名映射,一个判定都不做 —— 判定是 `evaluateRequirements` 的活,本域不重写它。
 *
 * @param row 库里的一行。
 * @returns 判定引擎认的形状。
 */
function toRequirement(row: ToRequirementIn): ToRequirementOut {
  return {
    province: String(row.province ?? ''),
    program: String(row.program ?? ''),
    stream: String(row.stream ?? ''),
    subject: String(row.subject ?? '') === SUBJECT.employer ? SUBJECT.employer : SUBJECT.applicant,
    factor: String(row.factor ?? ''),
    op: String(row.op ?? ''),
    value: row.value == null ? null : Number(row.value),
    valueText: String(row.value_text ?? ''),
    unit: String(row.unit ?? ''),
    appliesTeer: String(row.applies_teer ?? ''),
    appliesNoc: String(row.applies_noc ?? ''),
    excludesNoc: String(row.excludes_noc ?? ''),
    appliesArea: String(row.applies_area ?? ''),
    appliesCondition: String(row.applies_condition ?? ''),
    familySize: row.applies_family_size == null ? null : Number(row.applies_family_size),
    basis: String(row.basis ?? ''),
    label: String(row.label ?? ''),
    section: String(row.section ?? ''),
    effective: String(row.effective ?? ''),
    url: String(row.url ?? ''),
    pageUrl: String(row.page_url ?? ''),
    fetched: String(row.fetched ?? ''),
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
  const { rows } = await input.db.query(SQL.PNP_REQUIREMENTS_ALL, [])
  const byProv = new Map<string, Requirement[]>()
  for (const row of rows) {
    const req = toRequirement(row)
    if (!PROVS.has(req.province) || req.province === QC) continue
    const got = byProv.get(req.province) ?? []
    got.push(req)
    byProv.set(req.province, got)
  }
  const want = input.provs.length ? input.provs : Array.from(byProv.keys()).sort()
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
    const reqs = byProv.get(prov) ?? []
    if (!reqs.length) {
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
  const { rows } = await input.db.query(SQL.PNP_DRAWS_BY_PROV, [input.prov])
  const out: DrawRow[] = []
  for (const r of rows) {
    if (!r.url) continue
    if (out.length >= DRAW_LIMIT) break
    out.push({
      prov: input.prov,
      date: String(r.draw_date ?? '').slice(0, 10),
      stream: String(r.stream ?? ''),
      scale: String(r.scale ?? ''),
      score: r.score == null ? null : Number(r.score),
      invitations: r.invitations == null ? null : Number(r.invitations),
      evidence: { url: String(r.url ?? ''), fetched: String(r.fetched ?? '') },
    })
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
  const { rows } = await input.db.query(SQL.PNP_OPS_METRICS, [input.prov])
  const out: OpsRow[] = []
  for (const r of rows) {
    out.push({
      key: String(r.metric ?? ''),
      scope: String(r.scope ?? ''),
      label: String(r.label ?? ''),
      value: r.value == null ? null : Number(r.value),
      valueText: String(r.value_text ?? ''),
      unit: String(r.unit ?? ''),
      asOf: String(r.as_of ?? ''),
      period: String(r.period ?? ''),
      evidence: { url: String(r.url ?? ''), fetched: String(r.fetched ?? '') },
    })
  }
  return { prov: input.prov, rows: out }
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
async function lookupEe(input: LookupEeIn): LookupEeOut {
  const { rows } = await input.db.query(SQL.EE_CATEGORIES_BY_NOC, [input.noc])
  const out: EeRow[] = []
  for (const r of rows) {
    if (!r.url) continue
    out.push({
      category: String(r.category ?? ''),
      label: String(r.label ?? ''),
      drawCrs: r.draw_crs == null ? null : Number(r.draw_crs),
      drawDate: String(r.draw_date ?? '').slice(0, 10),
      drawSize: r.draw_size == null ? null : Number(r.draw_size),
      evidence: { url: String(r.url ?? ''), fetched: String(r.fetched ?? '') },
    })
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
  const { rows } = await input.db.query(SQL.PERMIT_RULES, [input.program])
  const out: PermitRow[] = []
  for (const r of rows) {
    if (!r.url && !r.page_url) continue
    out.push({
      program: String(r.program ?? input.program),
      stream: String(r.stream ?? ''),
      factor: String(r.factor ?? ''),
      op: String(r.op ?? ''),
      value: r.value == null ? null : Number(r.value),
      valueText: String(r.value_text ?? ''),
      unit: String(r.unit ?? ''),
      basis: String(r.basis ?? ''),
      label: String(r.label ?? ''),
      evidence: { url: String(r.url ?? r.page_url ?? ''), fetched: String(r.fetched ?? '') },
    })
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
  const kind = !input.section && input.grid === GRID_CRS ? KIND_SUMMARY : ''
  const { rows } = await input.db.query(SQL.EE_POINTS_GRID, [input.grid, input.section, kind, '', '', POINTS_LIMIT])
  const out: PointsRow[] = []
  for (const r of rows) {
    if (!r.url) continue
    out.push({
      grid: String(r.grid ?? input.grid),
      section: String(r.section ?? ''),
      sectionLabel: String(r.section_label ?? ''),
      kind: String(r.kind ?? ''),
      heading: String(r.heading ?? ''),
      factor: String(r.factor ?? ''),
      criterion: String(r.criterion ?? ''),
      columnLabel: String(r.column_label ?? ''),
      points: r.points == null ? null : Number(r.points),
      pointsText: String(r.points_text ?? ''),
      evidence: { url: String(r.url ?? ''), fetched: String(r.fetched ?? '') },
    })
  }
  return { grid: input.grid, rows: out }
}

// =========================================================================
// 4. 事实渲染(取数结果 → Fact)
// =========================================================================

/**
 * 造一条带数值的事实。
 *
 * @param input 工具名、说明、数值、展示形态、单位、出处。
 * @returns 一条事实。
 */
function fact(input: FactIn): FactOut {
  return {
    tool: input.tool, label: input.label, quote: input.quote, value: input.value,
    valueText: input.valueText, unit: input.unit, evidence: input.evidence,
  }
}

/**
 * 造一条**没有值**的事实,四态之一。它的 `value` 永远是 null,数字闸不会去查它。
 *
 * @param input 工具名、说明、是四态里的哪一种、出处。
 * @returns 一条四态事实。
 */
function statusFact(input: StatusFactIn): StatusFactOut {
  return {
    tool: input.tool, label: input.label, quote: input.quote, value: null, valueText: '', unit: UNIT.status,
    evidence: input.evidence, availability: input.availability,
  }
}

/**
 * 在招岗位 → 事实。每个省一条,**含 0 的省**。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function jobsFacts(r: JobsFactsIn): JobsFactsOut {
  const out: Fact[] = []
  for (const row of r.rows) {
    out.push(fact({
      tool: TOOL_NAME.jobs,
      label: `${row.prov}${LABEL.openPostings}${r.title || r.noc}${LABEL.nocOpen}${r.noc}${LABEL.nocClose}`,
      quote: `${row.prov}${SEP.dot}${r.title || r.noc}${LABEL.nocOpen}${r.noc}${LABEL.nocClose}`,
      value: row.open,
      valueText: String(row.open),
      unit: UNIT.jobs,
      evidence: { url: `${JOBS_LINK.head}${r.noc}${JOBS_LINK.prov}${row.prov}`, fetched: '' },
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
function coverageFacts(r: CoverageFactsIn): CoverageFactsOut {
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
function tierText(res: TierTextIn): TierTextOut {
  if (res.tiers?.length) {
    const parts: string[] = []
    for (const t of res.tiers) parts.push(`${t.area}${SEP.colon}${t.value ?? SEP.none}${res.unit ? ` ${res.unit}` : ''}`)
    return parts.join(SEP.semi)
  }
  if (res.need == null) return res.verdict
  const low = res.needLow != null && res.needLow !== res.need ? `${res.needLow}${LABEL.range}` : ''
  return `${low}${res.need}${res.unit ? ` ${res.unit}` : ''}`
}

/**
 * 门槛判定 → 事实。**一条门槛一条事实**,官方原文当说明,阈值当数值。
 *
 * 判不出来的(TEER 不知道 / 用户侧的值没有)照样给出来 —— 「这条要看你的语言分」本身就是答案,
 * 压掉它等于替用户假设了一个值。
 *
 * @param r 查询结果。
 * @returns 事实清单。
 */
function thresholdsFacts(r: ThresholdsFactsIn): ThresholdsFactsOut {
  const out: Fact[] = []
  for (const row of r.rows) {
    if (row.availability !== AVAIL.ok) {
      out.push(statusFact({
        tool: TOOL_NAME.thresholds,
        label: `${row.prov}${LABEL.requirements}${r.noc}`,
        quote: `${row.prov}${LABEL.nocDot}${r.noc}`,
        availability: row.availability,
        evidence: { url: '', fetched: '' },
      }))
      continue
    }
    for (const res of row.results) {
      out.push(fact({
        tool: TOOL_NAME.thresholds,
        label: `${row.prov} ${res.subject} ${res.factor}${res.basis ? `${LABEL.nocOpen.slice(0, 2)}${res.basis}${LABEL.nocClose}` : ''}${LABEL.dash}${res.evidence.label}`,
        // 官方原文原样带出:降级清单只许印它
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
function drawsFacts(r: DrawsFactsIn): DrawsFactsOut {
  if (!r.rows.length) {
    return [statusFact({
      tool: TOOL_NAME.draws,
      label: `${r.prov}${LABEL.drawsList}`,
      quote: r.prov,
      availability: r.prov === QC ? AVAIL.notApplicable : AVAIL.notCollected,
      evidence: { url: '', fetched: '' },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    out.push(fact({
      tool: TOOL_NAME.draws,
      label: `${row.prov}${LABEL.drawRound}${row.date}${SPACE}${row.stream}${SEP.comma}${row.invitations ?? SEP.none}${LABEL.invited}`,
      quote: `${row.prov}${SEP.dot}${row.date}${SEP.dot}${row.stream}`,
      value: row.score,
      valueText: row.score == null ? '' : `${row.score}${SPACE}${row.scale}`,
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
 * @param r 查询结果。
 * @returns 事实清单。
 */
function opsFacts(r: OpsFactsIn): OpsFactsOut {
  if (!r.rows.length) {
    return [statusFact({
      tool: TOOL_NAME.ops,
      label: `${r.prov}${LABEL.opsList}`,
      quote: r.prov,
      availability: r.prov === QC ? AVAIL.notApplicable : AVAIL.notCollected,
      evidence: { url: '', fetched: '' },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const scope = row.scope ? `${LABEL.nocOpen.slice(0, 2)}${row.scope}${LABEL.nocClose}` : ''
    const when = row.asOf ? `${LABEL.asOf}${row.asOf}` : row.period ? `${SPACE}${row.period}` : ''
    out.push(fact({
      tool: TOOL_NAME.ops,
      label: `${r.prov}${LABEL.opsHead}${row.label}${scope}${when}`,
      quote: `${r.prov}${SEP.dot}${row.label}`,
      value: row.value,
      valueText: row.valueText || (row.value == null ? '' : String(row.value)),
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
function eeFacts(r: EeFactsIn): EeFactsOut {
  if (!r.rows.length) {
    return [statusFact({
      tool: TOOL_NAME.ee,
      label: `${SAID.noc}${r.noc}${LABEL.eeNone}`,
      quote: `${LABEL.eeHead.slice(0, 2)}${LABEL.nocDot}${r.noc}`,
      availability: AVAIL.notApplicable,
      evidence: { url: '', fetched: '' },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const last = row.drawDate
      ? `${LABEL.eeLast}${row.drawDate}${SEP.comma}${row.drawSize ?? SEP.none}${LABEL.invited}`
      : ''
    out.push(fact({
      tool: TOOL_NAME.ee,
      label: `${LABEL.eeHead}${row.category}${LABEL.dash}${row.label}${last}`,
      quote: `${row.category}${SEP.dot}${row.label}`,
      value: row.drawCrs,
      valueText: row.drawCrs == null ? '' : `${row.drawCrs}${SPACE}${GRID_CRS}`,
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
function permitFacts(r: PermitFactsIn): PermitFactsOut {
  if (!r.rows.length) {
    return [statusFact({
      tool: TOOL_NAME.permit,
      label: `${r.program}${LABEL.permitList}`,
      quote: r.program,
      availability: AVAIL.notCollected,
      evidence: { url: '', fetched: '' },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const tier = row.stream ? `${LABEL.nocOpen.slice(0, 2)}${row.stream}${LABEL.nocClose}` : ''
    const basis = row.basis ? `${LABEL.nocOpen.slice(0, 2)}${row.basis}${LABEL.nocClose}` : ''
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
function pointsFacts(r: PointsFactsIn): PointsFactsOut {
  if (!r.rows.length) {
    return [statusFact({
      tool: TOOL_NAME.points,
      label: `${r.grid}${LABEL.pointsList}`,
      quote: r.grid,
      availability: AVAIL.notCollected,
      evidence: { url: '', fetched: '' },
    })]
  }
  const out: Fact[] = []
  for (const row of r.rows) {
    const col = row.columnLabel ? `${LABEL.nocOpen.slice(0, 2)}${row.columnLabel}${LABEL.nocClose}` : ''
    out.push(fact({
      tool: TOOL_NAME.points,
      label: `${row.grid}${LABEL.pointsHead}${row.sectionLabel || row.heading}${LABEL.dash}${row.criterion || row.factor}${col}`,
      quote: `${row.grid}${SEP.dot}${row.criterion || row.heading}`,
      value: row.points,
      valueText: row.pointsText || (row.points == null ? '' : String(row.points)),
      unit: UNIT.points,
      evidence: row.evidence,
    }))
  }
  return out
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
function verdictProfileOf(input: VerdictProfileOfIn): VerdictProfileOfOut {
  const said = input.profile.status ?? ''
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
    status: STATUS_WORDS.includes(said) ? said : null,
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
    let evidence = { url: '', fetched: '' }
    for (const r of p.reasons) {
      if (r.kind === REASON_EXCLUDED && r.quote) {
        quote = `${p.province}${SEP.dot}${r.quote}`
        evidence = { url: r.evidence?.url ?? '', fetched: r.evidence?.fetched ?? '' }
        break
      }
    }
    const tier = p.tier == null ? '' : `${LABEL.tierHead}${TIER_TEXT[p.tier]}`
    const blocked = p.blockedBy ? `${LABEL.blockedBy}${p.blockedBy}` : ''
    const missing = p.missingSlots?.length ? `${LABEL.missing}${p.missingSlots.join(SEP.comma)}` : ''
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
function normNum(raw: NormNumIn): NormNumOut {
  const s = raw.replace(THOUSANDS_COMMA, '')
  return s.includes(SAID.stop) ? s.replace(TRAILING_ZEROS, '') : s
}

/**
 * 这一趟允许出现的所有数字:事实里的 + 用户自己写的。
 *
 * @param input 事实清单与用户原话。
 * @returns 允许的数字集合。
 */
function allowedNumbers(input: AllowedNumbersIn): AllowedNumbersOut {
  const ok = new Set<string>()
  // 🔴 职业码与 TEER 是**我们自己查出来给它的**,不是它编的 —— 漏掉这一条,
  //    模型每写一次「NOC 72310」都会被判成编造,整轮降级(实撞)。
  for (const c of input.codes) if (c) ok.add(normNum(c))
  for (const f of input.facts) {
    if (f.value != null) ok.add(normNum(String(f.value)))
    for (const m of `${f.valueText} ${f.label}`.matchAll(NUM_RE)) ok.add(normNum(m[0]))
  }
  for (const m of input.echo.matchAll(NUM_RE)) ok.add(normNum(m[0]))
  return ok
}

/**
 * 行首的排版记号:项目符号 `- ` 或一两位序号。
 *
 * @param mark 匹配到的那一段。
 * @returns 它是序号就抹成空白(那个数是排版不是事实),是项目符号就原样留下。
 */
function blankIfNumbered(mark: BlankIfNumberedIn): BlankIfNumberedOut {
  return HAS_DIGIT.test(mark) ? SPACE : mark
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
      if (!ok.has(n) && !bad.includes(n)) bad.push(n)
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
function findInternalWords(answer: FindInternalWordsIn): FindInternalWordsOut {
  const low = answer.toLowerCase()
  const bad: string[] = []
  for (const w of INTERNAL_WORDS) if (low.includes(w)) bad.push(w)
  return bad
}

/**
 * 中/韩答复里夹了英文单位速记。数据是英文的,话不能是。
 *
 * @param input 答复与语种。
 * @returns 撞到的词;英文答复永远是空。
 */
function findEnglishUnits(input: AnswerLangIn): FindEnglishUnitsOut {
  if (input.lang === EN) return []
  const low = input.answer.toLowerCase()
  const bad: string[] = []
  for (const w of EN_UNIT_WORDS) if (new RegExp(`${WORD_EDGE}${w}${WORD_EDGE}`).test(low)) bad.push(w)
  return bad
}

/**
 * 前端只渲染得出两样排版:空行分段、行首 `- `。其余记号会原样见客。
 *
 * @param answer 答复。
 * @returns 撞到的记号。
 */
function findRawMarkup(answer: FindRawMarkupIn): FindRawMarkupOut {
  const bad: string[] = []
  if (BOLD_RE.test(answer)) bad.push(MARKUP.bold)
  if (STAR_RE.test(answer)) bad.push(MARKUP.star)
  if (HEADING_RE.test(answer)) bad.push(MARKUP.heading)
  if (TABLE_RE.test(answer)) bad.push(MARKUP.pipe)
  if (NUMBERED_RE.test(answer)) bad.push(MARKUP.numbered)
  return bad
}

/**
 * 整段答复的第一句 —— 到第一个换行或第一个句号为止。
 *
 * @param input 整段答复。
 * @returns 第一句;整段没有断句记号时按长度截。
 */
function firstLineOf(input: FirstLineOfIn): FirstLineOfOut {
  const head = input.answer.trim().split(NL)[0] ?? ''
  const stop = head.indexOf(FULL_STOP)
  const line = stop >= 0 ? head.slice(0, stop + 1) : head
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
  if (!line) return bad
  if (OPENING_COLON.test(line)) bad.push(line.slice(-OPENING_SAMPLE))
  if (AS_FOLLOWS.test(line)) bad.push(line.slice(-OPENING_SAMPLE))
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
  for (const c of checks) if (c.hits.length) fired.push(c)
  return fired
}

/**
 * 按句截断到见客上限。截在句号处,不切半句。
 *
 * @param input 答复与语种。
 * @returns 截好的答复。
 */
function clampAnswer(input: AnswerLangIn): ClampAnswerOut {
  const cap = LEN_CAP[input.lang]
  if (input.answer.length <= cap) return input.answer
  const cut = input.answer.slice(0, cap)
  const stop = Math.max(cut.lastIndexOf(FULL_STOP), cut.lastIndexOf(SAID.stop), cut.lastIndexOf(NL))
  return (stop > cap * 0.5 ? cut.slice(0, stop + 1) : cut).trim()
}

/**
 * 降级:出口闸两次都没过 → 直接给一张能溯源的事实清单。
 *
 * **宁可给一张朴素的清单,也不给一句编出来的话。**
 *
 * @param facts 这一趟的事实。
 * @returns 事实清单。
 */
function factSheet(facts: FactSheetIn): FactSheetOut {
  const lines: string[] = []
  for (const f of facts.slice(0, SHEET_CAP)) lines.push(`${SEP.bullet}${f.quote}${f.valueText ? `${SEP.colon}${f.valueText}` : ''}`)
  return lines.join(NL)
}

/**
 * 这一趟我们自己给过模型的码:采信下来的职业码、候选里的每个码、TEER。
 *
 * @param box 这一趟的收件箱。
 * @returns 码的清单。
 */
function codesOf(box: CodesOfIn): CodesOfOut {
  const out: string[] = []
  if (box.noc) out.push(box.noc)
  if (box.teer != null) out.push(String(box.teer))
  for (const c of box.candidates) out.push(c.noc)
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
 * @param box 这一趟的收件箱。
 * @param facts 这一把工具产出的事实。
 * @returns pi 认的工具回执。
 */
function take(input: TakeIn): TakeOut {
  const room = MAX_FACTS - input.box.facts.length
  const kept = room > 0 ? input.facts.slice(0, room) : []
  const lines: string[] = []
  for (const f of kept) {
    input.box.facts.push(f)
    lines.push(`${SEP.bullet}${f.label}${f.valueText ? `${SEP.colon}${f.valueText}` : ''}`)
  }
  return { content: [{ type: ROLE.text, text: lines.length ? lines.join(NL) : TOOL_REPLY.empty }], details: { n: kept.length }, terminate: false }
}

/**
 * 拼一段纯话术的回执(拿不到职业码这类)。
 *
 * @param text 给模型看的那句话。
 * @returns pi 认的工具回执。
 */
function say(text: SayIn): SayOut {
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
 * @param input 这一趟的收件箱。
 * @returns pi 要的两个挂点。
 */
function makeToolGates(input: MakeToolGatesIn): MakeToolGatesOut {
  const box = input.box

  /**
   * 工具调用发出之前过一道。两个参数是 pi 定死的签名(外部规定)。
   *
   * @param ctx pi 给的上下文:哪一把工具、校验过的入参。
   * @returns 要拦就给 `block` 与理由;放行给 undefined。
   */
  async function beforeToolCall(ctx: BeforeToolCallIn): BeforeToolCallOut {
    // 信任边界的第一行:收窄成本域自己的形状,下面一个字都不再碰 `unknown`
    const args = ctx.args as ToolArgs
    const noc = typeof args?.noc === 'string' ? args.noc.trim() : ''
    if (!noc) return undefined
    if (noc === box.noc) return undefined
    for (const c of box.candidates) if (c.noc === noc) return undefined
    log({ tag: CHAT_LOG.tag, text: `${GATE_LOG.blocked}${noc}` })
    return { block: true, reason: BLOCK_UNKNOWN_NOC }
  }

  return { beforeToolCall: beforeToolCall }
}

/**
 * 造这一趟的全部工具。每把的 `execute` 里都闭包着库连接与收件箱。
 *
 * @param input 跑这一趟要的东西。
 * @param box 这一趟的收件箱。
 * @returns 交给模型的工具表。
 */
// eslint-disable-next-line local/function-length -- 工具表:12 把工具的 execute 各自闭包着库连接与收件箱,拆开就得把这两样显式传一大串,反而更绕
function makeTools(input: MakeToolsIn): MakeToolsOut {
  const { run, box } = input
  /**
   * 轨迹:这一步真的开始打了才发。
   *
   * @param text 这一步在做什么。
   * @returns 没有返回值。
   */
  function step(text: StepIn): StepOut {
    run.onStep?.(text)
  }

  /**
   * 拿已经采信的职业码;拿不到就回 null,调用方回一句「先去搜」。
   *
   * 🔴 **采信的同时把 TEER 一起定下来**。实撞:TEER 原来是 `lookup_jobs` 的副产品,
   * 于是只问门槛不问岗位的那一轮 `teer` 是 null,而分 TEER 的条款(BC 对 TEER 2-5 要 CLB 4)
   * 在 `teerHit` 里一条都挑不出来 —— 语言要求整条静默消失,答复看起来还很完整。
   *
   * @param raw 模型填的码。
   * @returns 采信下来的码;拿不到就是 null。
   */
  async function nocOf(raw: NocOfIn): NocOfOut {
    const ok = acceptNoc({ raw: raw, candidates: box.candidates })
    if (ok && ok !== box.noc) {
      box.noc = ok
      const { rows } = await run.db.query(SQL.NOC_TITLE_TEER, [ok])
      box.title = String(rows[0]?.title ?? '')
      box.teer = rows[0]?.teer == null ? null : Number(rows[0].teer)
    }
    return box.noc
  }

  /**
   * 查职业候选。
   *
   * ⚠️ 两个参数是 pi 定的(它按位置传 toolCallId、args),第一位我们用不上。
   *
   * @param args 模型拼的检索词。
   * @returns 候选清单,或者一句「一个都没有」。
   */
  async function execSearch(_id: string, args: ExecSearchIn): ExecSearchOut {
    step(TOOL_DESC.search)
    const hits = await searchOccupations({ db: run.db, query: args.query.trim().slice(0, MAX_QUERY) })
    if (!hits.length) return say(TOOL_REPLY.noCandidates)
    const lines: string[] = []
    for (const hit of hits) {
      box.candidates.push(hit)
      lines.push(`${hit.noc}${LABEL.dash}${hit.title}`)
    }
    return say(`${TOOL_REPLY.candidatesHead}${NL}${lines.join(NL)}`)
  }

  /**
   * 在招岗位。
   *
   * @param args 模型填的职业码。
   * @returns 各省在招数的事实回执。
   */
  async function execJobs(_id: string, args: ExecJobsIn): ExecJobsOut {
    const noc = await nocOf(args.noc)
    if (!noc) return say(TOOL_REPLY.needNoc)
    step(TOOL_DESC.jobs)
    const r = await lookupJobs({ db: run.db, noc })
    return take({ box, facts: jobsFacts(r) })
  }

  /**
   * 清单收录。
   *
   * @param args 模型填的职业码。
   * @returns 各省收录情况的事实回执。
   */
  async function execCoverage(_id: string, args: ExecCoverageIn): ExecCoverageOut {
    const noc = await nocOf(args.noc)
    if (!noc) return say(TOOL_REPLY.needNoc)
    step(TOOL_DESC.coverage)
    const r = await lookupCoverage({ db: run.db, noc })
    return take({ box, facts: coverageFacts(r) })
  }

  /**
   * 省提名门槛。要看哪几个省由模型说,认不出的省码丢掉;不给就看全部省。
   *
   * @param args 模型填的职业码与省份。
   * @returns 各省门槛的事实回执。
   */
  async function execThresholds(_id: string, args: ExecThresholdsIn): ExecThresholdsOut {
    const noc = await nocOf(args.noc)
    if (!noc) return say(TOOL_REPLY.needNoc)
    step(TOOL_DESC.thresholds)
    const r = await lookupThresholds({
      db: run.db, noc, teer: box.teer, provs: cleanProvs({ raw: args.provs }), expMonths: run.profile.expMonths ?? null,
    })
    return take({ box, facts: thresholdsFacts(r) })
  }

  /**
   * 抽选记录。省级 EOI 与联邦 Express Entry 共这一把,`prov=FED` 走联邦。
   *
   * @param args 模型填的省码。
   * @returns 近几轮抽选的事实回执。
   */
  async function execDraws(_id: string, args: ExecDrawsIn): ExecDrawsOut {
    const prov = provOf(args.prov)
    if (!prov) return say(TOOL_REPLY.badProv)
    step(TOOL_DESC.draws)
    const r = await lookupDraws({ db: run.db, prov })
    return take({ box, facts: drawsFacts(r) })
  }

  /**
   * 官方运营统计。
   *
   * @param args 模型填的省码。
   * @returns 处理时长 / 配额 / 池内人数的事实回执。
   */
  async function execOps(_id: string, args: ExecOpsIn): ExecOpsOut {
    const prov = provOf(args.prov)
    if (!prov || prov === FED) return say(TOOL_REPLY.badProv)
    step(TOOL_DESC.ops)
    const r = await lookupOps({ db: run.db, prov })
    return take({ box, facts: opsFacts(r) })
  }

  /**
   * 联邦 EE 类别。
   *
   * @param args 模型填的职业码。
   * @returns 类别命中情况的事实回执。
   */
  async function execEe(_id: string, args: ExecEeIn): ExecEeOut {
    const noc = await nocOf(args.noc)
    if (!noc) return say(TOOL_REPLY.needNoc)
    step(TOOL_DESC.ee)
    const r = await lookupEe({ db: run.db, noc })
    return take({ box, facts: eeFacts(r) })
  }

  /**
   * 联邦项目规则。program 由 schema 收窄到四个联邦项目,这里不再采信。
   *
   * @param args 模型填的项目名。
   * @returns 官方条款的事实回执。
   */
  async function execPermit(_id: string, args: ExecPermitIn): ExecPermitOut {
    step(TOOL_DESC.permit)
    const r = await lookupPermit({ db: run.db, program: args.program })
    return take({ box, facts: permitFacts(r) })
  }

  /**
   * 官方计分表。grid 由 schema 收窄到 CRS / FSW67,这里不再采信。
   *
   * @param args 模型填的分表名与节号。
   * @returns 档位分值的事实回执。
   */
  async function execPoints(_id: string, args: ExecPointsIn): ExecPointsOut {
    step(TOOL_DESC.crs)
    const r = await lookupPoints({ db: run.db, grid: args.grid, section: args.section?.trim() ?? '' })
    return take({ box, facts: pointsFacts(r) })
  }

  /**
   * 路径裁决。**不收模型的参数**:档案从收件箱与档案槽闭包取,判定全在 `lib/ruling`,
   * 这里只装配 —— 喂它哪份档案正是本层的职责,喂错一格它照样判得出结果。
   *
   * @param _args 空对象(schema 定死不收参数)。
   * @returns 各通道判定的事实回执。
   */
  async function execVerdict(_id: string, _args: ExecVerdictIn): ExecVerdictOut {
    step(TOOL_DESC.verdict)
    const data = await loadVerdictTables(run.db)
    const rows = pathVerdict({ profile: verdictProfileOf({ box, profile: run.profile }), data: data })
    return take({ box, facts: verdictFacts(rows) })
  }

  /**
   * 主张对账:按**原话**先判「私人承诺 / 能对账」。私人承诺不查任何表 ——
   * 库里根本没有对应的官方事实,硬查一张不相干的表等于替中介背书;
   * 能对账的让模型拿数据工具的结果去对,这里只判类别。
   *
   * @param args 模型转述的职业码与各条主张原话。
   * @returns 每条主张的类别判定;私人承诺同时落一条事实(用户原话当引文)。
   */
  async function execClaims(_id: string, args: ExecClaimsIn): ExecClaimsOut {
    const noc = await nocOf(args.noc)
    if (!noc) return say(TOOL_REPLY.needNoc)
    step(TOOL_DESC.claims)
    const lines: string[] = []
    for (const raw of args.claims.slice(0, CLAIMS_CAP)) {
      const text = raw.trim().slice(0, CLAIM_TEXT_CAP)
      if (!text) continue
      if (PRIVATE_PROMISE.test(text)) {
        lines.push(`${SEP.bullet}${text}${LABEL.dash}${TOOL_REPLY.claimPrivate}`)
        // 落进收件箱:降级清单里也要有「这条核不了」这一行(用户原话当引文,他自己的话可以见客)
        if (box.facts.length < MAX_FACTS) {
          box.facts.push(statusFact({
            tool: TOOL_NAME.claims,
            label: `${LABEL.claimHead}${text}`,
            quote: text,
            availability: AVAIL.notApplicable,
            evidence: { url: '', fetched: '' },
          }))
        }
        continue
      }
      lines.push(`${SEP.bullet}${text}${LABEL.dash}${TOOL_REPLY.claimCheckable}`)
    }
    if (!lines.length) return say(TOOL_REPLY.empty)
    return say(lines.join(NL))
  }

  // 每把工具各带自己的 schema 泛型,数组本身就合法 —— 不需要断言
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
function systemOf(input: RunIn): SystemOfOut {
  const said: string[] = []
  const p = input.profile
  if (p.noc) said.push(`${SAID.noc}${p.noc}`)
  if (p.occText) said.push(`${SAID.occOpen}${p.occText}${SAID.occClose}`)
  if (p.provs?.length) said.push(`${SAID.provs}${p.provs.join(SEP.comma)}`)
  if (p.expMonths != null) said.push(`${p.expMonths}${SAID.exp}`)
  if (p.status) said.push(`${SAID.status}${p.status}`)
  const profile = said.length ? `${PROFILE_HEAD}${said.join(SEP.semi)}` : PROFILE_NONE
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
function firstPrompt(input: FirstPromptIn): FirstPromptOut {
  const lines: string[] = []
  if (input.history.length) lines.push(EARLIER_HEAD)
  for (const turn of input.history.slice(-HISTORY_TURNS)) lines.push(`${turn.role}${SEP.colon}${turn.content.slice(0, HISTORY_CAP)}`)
  const earlier = lines.length ? `${lines.join(NL)}${NL}${NL}${NOW_HEAD}` : ''
  const message: AgentMessage = {
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
function textOf(message: TextOfIn): TextOfOut {
  if (message.role !== ROLE.assistant) return ''
  const parts: string[] = []
  for (const block of message.content) if (block.type === ROLE.text) parts.push(block.text)
  return parts.join('')
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
function lastDraftOf(input: LastDraftOfIn): LastDraftOfOut {
  const drafts: string[] = []
  for (const m of input.messages) {
    const t = textOf(m)
    if (t) drafts.push(t)
  }
  if (input.aborted) throw chatError({ code: CHAT_CODE.busy, msg: `${FAIL_MSG.timeout}${TIMEOUT_MS}${FAIL_MSG.ms}` })
  if (!drafts.length) throw chatError({ code: CHAT_CODE.llm, msg: FAIL_MSG.emptyDraft })
  return drafts[drafts.length - 1]
}

/**
 * 跑一趟 pi 循环,拿模型写的稿子。
 *
 * @param input 跑这一趟要的东西。
 * @param box 这一趟的收件箱。
 * @param extra 重试时追加的一段话(告诉它上一稿撞了什么),第一稿是空串。
 * @returns 模型写的稿子。
 */
async function draftOnce(input: DraftOnceIn): DraftOnceOut {
  const { run, box, extra } = input
  const ac = new AbortController()

  /**
   * 到点掐断:多轮循环没有单发看门狗,预算按整趟算。
   *
   * @returns 没有返回值。
   */
  function onTimeout(): OnTimeoutOut {
    ac.abort()
  }
  const timer = setTimeout(onTimeout, TIMEOUT_MS)
  const sent = { n: 0 }

  /**
   * 事件回调:工具轨迹在各 execute 里发过了,这里只管正文增量。
   * ⚠️ 思考期间 `content` 是**空串**不是缺字段,按真值判会漏计。
   *
   * @param event pi 抛出来的一个事件。
   * @returns 没有返回值。
   */
  function onEvent(event: OnEventIn): OnEventOut {
    if (event.type !== MESSAGE_UPDATE || !event.message || !run.onDelta) return
    const full = textOf(event.message)
    if (full.length <= sent.n) return
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
      // pi 的 StreamFn 要通吃所有 Api,而这个 stream 锁死 openai-completions —— 逆变对不上,只能断言
      streamSimple as StreamFn,
    )
    return lastDraftOf({ messages: messages, aborted: ac.signal.aborted })
  } catch (e) {
    const why = e instanceof Error ? e.message.slice(0, 160) : String(e)
    log({ tag: CHAT_LOG.tag, text: `${CHAT_FN.runChatLoop}${CHAT_LOG.failedTail}${why}` })
    if (ac.signal.aborted) throw chatError({ code: CHAT_CODE.busy, msg: `${FAIL_MSG.timeout}${TIMEOUT_MS}${FAIL_MSG.ms}` })
    throw chatError({ code: CHAT_CODE.llm, msg: why })
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
    if (HARD_GATES.includes(h.gate)) out.push(h)
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
  const noc = input.profile.noc ?? null
  if (!noc) return { facts: [], candidates: [], noc: null, title: '', teer: null }
  const { rows } = await input.db.query(SQL.NOC_TITLE_TEER, [noc])
  return {
    facts: [],
    candidates: [],
    noc: noc,
    title: String(rows[0]?.title ?? ''),
    teer: rows[0]?.teer == null ? null : Number(rows[0].teer),
  }
}

/**
 * 答一个问题:跑工具循环,过出口闸,撞了重写一次,再撞就降级成事实清单。
 *
 * @param input 库连接、用户原话、语种、档案、历史与两个回调。
 * @returns 过完闸的答复、标好 `cited` 的事实、采信的职业码、是不是降级来的。
 */
export async function consult(input: ConsultIn): ConsultOut {
  if (!BASE) throw chatError({ code: CHAT_CODE.llm, msg: FAIL_MSG.noBase })
  const box: Inbox = await boxFor({ db: input.db, profile: input.profile })
  const echo = input.history.filter(isUserTurn).map(contentOf).concat(input.text).join(NL)
  const t0 = Date.now()

  let answer = ''
  let fired: GateHit[] = []
  for (let attempt = 0; attempt <= GUARD_RETRIES; attempt += 1) {
    const extra = fired.length ? `${NL}${NL}${retryNote(fired)}` : ''
    answer = clampAnswer({ answer: await draftOnce({ run: input, box, extra }), lang: input.lang })
    fired = runGates({ answer, facts: box.facts, echo, lang: input.lang, codes: codesOf(box) })
    if (!fired.length) break
    log({
      tag: CHAT_LOG.tag,
      text: `${GATE_LOG.hit}${attempt + 1} ${fired.map(gateLabel).join(GATE_LOG.comma)}${GATE_LOG.noc}${box.noc ?? GATE_LOG.none}`,
    })
  }

  // 只有硬闸(拦假话的那几道)才值得把整段换成事实清单;软闸没过只是难看,留着模型那一版。
  const hard = hardHits({ fired: fired })
  const degraded = hard.length > 0
  if (degraded) {
    if (!box.facts.length) throw chatError({ code: CHAT_CODE.guard, msg: `${FAIL_MSG.noFacts}${hard.map(gateLabel).join(GATE_LOG.comma)}` })
    answer = factSheet(box.facts)
  }
  const facts = citeFacts({ answer, facts: box.facts })
  log({
    tag: CHAT_LOG.tag,
    text: `${CHAT_LOG.loopDone}${box.noc ?? GATE_LOG.none}${CHAT_LOG.facts}${box.facts.length}`
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
function isUserTurn(turn: IsUserTurnIn): IsUserTurnOut {
  return turn.role === ROLE.user
}

/**
 * 取一轮的正文。
 *
 * @param turn 一轮对话。
 * @returns 正文。
 */
function contentOf(turn: ContentOfIn): ContentOfOut {
  return turn.content
}

/**
 * 一道闸在日志里的样子:名字加撞了几条。**逐道具名** —— 「撞了」要看得见,「撞的是谁」也要看得见。
 *
 * @param hit 一道闸的判定结果。
 * @returns 日志里的一段。
 */
function gateLabel(hit: GateLabelIn): GateLabelOut {
  return `${hit.gate}${GATE_LOG.paren}${hit.hits.join(GATE_LOG.pipe)}${GATE_LOG.parenEnd}`
}

/**
 * 重写时追加给模型的那段话:点名上一稿撞了什么,并把违规内容列成黑名单。
 *
 * @param fired 撞到的每一道闸。
 * @returns 追加进 system prompt 的那段话。
 */
function retryNote(fired: RetryNoteIn): RetryNoteOut {
  const lines = [RETRY_HEAD]
  for (const hit of fired) lines.push(`${RETRY_BULLET}${hit.gate}${RETRY_COLON}${hit.hits.join(RETRY_COMMA)}`)
  // 光报「你违反了哪一条」对首句那道闸没用(实拍两次重写都没改掉)—— 带上怎么改。
  for (const hit of fired) if (hit.gate === GATE.opening) lines.push(RETRY_OPENING)
  return lines.join(NL)
}
