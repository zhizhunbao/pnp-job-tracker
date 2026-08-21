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
import type { Message, Model } from '@earendil-works/pi-ai'
import { chatError, CHAT_CODE } from '../error'
import { CHAT_FN, CHAT_LOG, GATE_LOG, log } from '../log'
import * as SQL from '../db/sql'
import { evaluateRequirements } from '../rules'
import type { Requirement, RuleProfile } from '../rules'
import {
  API, AUTH_HEADER, AVAIL, BASE, BEARER, BOLD_RE, CONTEXT_WINDOW, EARLIER_HEAD, EN, EN_UNIT_WORDS, FAIL_MSG,
  FULL_STOP, GATE, GUARD_RETRIES, HAS_DIGIT, HEADING_RE, HISTORY_CAP, HISTORY_TURNS, INELIGIBLE, INTERNAL_WORDS,
  JOBS_LINK, KEY, LABEL, LANG_NAME, LEAD_MARK, LEN_CAP, LIKE_ANY, LIKE_ESCAPE, LIKE_SPECIAL, MARKUP, MAX_FACTS,
  MAX_QUERY, MAX_TOKENS, MESSAGE_UPDATE, MODEL_ID, NL, NO_KEY_PLACEHOLDER, NOC_RE, NOISE_RATIO, NOW_HEAD, NUM_RE,
  NUMBERED_RE, PROVIDER, PROVS, QC, ROLE, SAID, SAMPLING, SEARCH_LIMIT, SEP, SHEET_CAP, SPACE, STAR_RE, SUBJECT,
  TABLE_RE, THOUSANDS_COMMA, TIMEOUT_MS, TOOL_LABEL, TOOL_NAME, TRAILING_ZEROS, UNIT, V1, WORD_EDGE,
} from './constants'
import {
  PROFILE_HEAD, PROFILE_NONE, REPLY_LANGUAGE_HEAD, RETRY_BULLET, RETRY_COLON, RETRY_COMMA, RETRY_HEAD,
  SYSTEM_RULES, TOOL_DESC, TOOL_REPLY,
} from './prompts'
import { NOC_PARAMS, NOC_PROVS_PARAMS, SEARCH_PARAMS } from './schemas'
import { byOpenDesc } from './callbacks'
import type {
  AcceptNocIn, AcceptNocOut, AllowedNumbersIn, AllowedNumbersOut, AnswerLangIn, BlankCoverageIn, BlankCoverageOut,
  BlankIfNumberedIn, BlankIfNumberedOut, Candidate, CiteFactsIn, CiteFactsOut, ClampAnswerOut, CleanProvsIn,
  CleanProvsOut, CodesOfIn, CodesOfOut, ConsultIn, ConsultOut, ContentOfIn, ContentOfOut, CoverageFactsIn,
  CoverageFactsOut, CoverageRow, DraftOnceIn, DraftOnceOut, ExecCoverageIn, ExecCoverageOut, ExecJobsIn,
  ExecJobsOut, ExecSearchIn, ExecSearchOut, ExecThresholdsIn, ExecThresholdsOut, Fact, FactIn, FactOut, FactSheetIn,
  FactSheetOut, FindEnglishUnitsOut, FindInternalWordsIn, FindInternalWordsOut, FindRawMarkupIn, FindRawMarkupOut,
  FindUngroundedNumbersOut, FirstPromptIn, FirstPromptOut, GateHit, GateLabelIn, GateLabelOut, Inbox, IsUserTurnIn,
  IsUserTurnOut, JobsFactsIn, JobsFactsOut, JobsRow, LookupCoverageIn, LookupCoverageOut, LookupJobsIn,
  LookupJobsOut, LookupThresholdsIn, LookupThresholdsOut, MakeToolsIn, MakeToolsOut, ModelOut, NocOfIn, NocOfOut,
  NormNumIn, NormNumOut, NumberCheckIn, OnEventIn, OnEventOut, OnTimeoutOut, PassThroughMessagesIn,
  PassThroughMessagesOut, RetryNoteIn, RetryNoteOut, RunGatesIn, RunGatesOut, RunIn, SayIn, SayOut,
  SearchOccupationsIn, SearchOccupationsOut, StatusFactIn, StatusFactOut, StepIn, StepOut, SystemOfOut, TakeIn,
  TakeOut, TextOfIn, TextOfOut, ThresholdsFactsIn, ThresholdsFactsOut, ThresholdsRow, TierTextIn, TierTextOut,
  ToRequirementIn, ToRequirementOut, Tool,
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
    // 自家网关不按 token 计费,填 0 是照实说,不是省事
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
 * 模型给的省码 → 认得出的留下,认不出的丢掉。**宁可少一个省,不许把 NB 当 NS。**
 *
 * @param raw 模型给的省码,可以缺省。
 * @returns 认得出的那些,去重保序。
 */
function cleanProvs(raw: CleanProvsIn): CleanProvsOut {
  const kept: string[] = []
  for (const one of raw ?? []) {
    const prov = one.trim().toUpperCase()
    if (PROVS.has(prov) && !kept.includes(prov)) kept.push(prov)
  }
  return kept
}

/**
 * 模型挑的职业码只有在**这一趟检索真返回过**才算数 —— 它没法拿库外的码蒙混过去。
 *
 * @param box 这一趟的收件箱。
 * @param raw 模型填的码。
 * @returns 采信就返回那个码,不采信返回 null。
 */
function acceptNoc(input: AcceptNocIn): AcceptNocOut {
  const noc = (input.raw ?? '').trim()
  if (!NOC_RE.test(noc)) return null
  for (const c of input.box.candidates) if (c.noc === noc) return noc
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
    out.push({ prov, availability: AVAIL.ok, results: evaluateRequirements(reqs, profile) })
  }
  return { noc: input.noc, teer: input.teer, rows: out }
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
    const ok = acceptNoc({ box, raw })
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
      db: run.db, noc, teer: box.teer, provs: cleanProvs(args.provs), expMonths: run.profile.expMonths ?? null,
    })
    return take({ box, facts: thresholdsFacts(r) })
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
  return [search, jobs, coverage, thresholds]
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
 * 我们只产 user 消息,pi harness 那几种非 LLM 消息一条都不会出现 —— 比对 role 让编译器自己窄化。
 *
 * @param ms 循环里流动的全部消息(签名由 pi 的 convertToLlm 定死)。
 * @returns 能喂给模型的那三种,顺序不变。
 */
function passThroughMessages(ms: PassThroughMessagesIn): PassThroughMessagesOut {
  const kept: Message[] = []
  for (const m of ms) {
    if (m.role === ROLE.user || m.role === ROLE.assistant || m.role === ROLE.toolResult) kept.push(m)
  }
  return kept
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
      { model: model(), apiKey: KEY || NO_KEY_PLACEHOLDER, maxTokens: MAX_TOKENS, convertToLlm: passThroughMessages },
      onEvent,
      ac.signal,
      // pi 的 StreamFn 要通吃所有 Api,而这个 stream 锁死 openai-completions —— 逆变对不上,只能断言
      streamSimple as StreamFn,
    )
    const drafts: string[] = []
    for (const m of messages) {
      const t = textOf(m)
      if (t) drafts.push(t)
    }
    return drafts.length ? drafts[drafts.length - 1] : ''
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
 * 答一个问题:跑工具循环,过出口闸,撞了重写一次,再撞就降级成事实清单。
 *
 * @param input 库连接、用户原话、语种、档案、历史与两个回调。
 * @returns 过完闸的答复、标好 `cited` 的事实、采信的职业码、是不是降级来的。
 */
export async function consult(input: ConsultIn): ConsultOut {
  if (!BASE) throw chatError({ code: CHAT_CODE.llm, msg: FAIL_MSG.noBase })
  const box: Inbox = { facts: [], candidates: [], noc: input.profile.noc ?? null, title: '', teer: null }
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

  const degraded = fired.length > 0
  if (degraded) {
    if (!box.facts.length) throw chatError({ code: CHAT_CODE.guard, msg: `${FAIL_MSG.noFacts}${fired.map(gateLabel).join(GATE_LOG.comma)}` })
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
  return lines.join(NL)
}
