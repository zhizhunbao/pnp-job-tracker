/**
 * 按职位改写域的行为(2026-11-09):拆要求、写简历、写求职信、逐条核对打分。跨域能力由路由注入,这里不碰模型与 PDF 的实现。
 * 铁律:模型给的每一句引文都在服务端逐字核对,对不上按没写到;改写里出现基础简历没有的数字,这一版作废。
 *
 * @author Frank
 * @time 2026-11-09 18:00:00
 */
import { count, firstOf, queryRows, SQL, text } from '../db'
import {
  B64, BASE_CHARS_MAX, COVER_MIN_LEN, COVER_TOKENS_MAX, AUDIT_TOKENS_MAX, E_LLM, E_NONE, E_RESUME_BAD, E_SENT, FACT_CHARS_MAX,
  FACT_SEP, FEATURE_AUDIT, FEATURE_COVER, FEATURE_PLAN, FEATURE_RESUME, FIELD_RETRY_COVER, FIELD_RETRY_RESUME, JD_CHARS_MAX,
  KEY_BASIS, KEY_COVER, KEY_ID, KEY_ITEMS, KEY_LABEL, KEY_QUOTE, KEY_REQS, KEY_RESUME, KEY_UNSUPPORTED, LABEL_MAX, LINE_SEP,
  MSG_SEP, NUM_SEP, NUMBER_RE, NUMBER_TAIL_RE, ONE_SPACE, PLAN_TOKENS_MAX, REQ_MAX, RESUME_TOKENS_MAX, RETRY_MAX, SCORE_COVER,
  SCORE_MIN, SCORE_PENALTY, SCORE_RESUME, STATUS_DRAFT, STATUS_QUEUED, STEP_AUDIT, STEP_COVER, STEP_DONE, STEP_PLAN,
  STEP_RESUME, TEXT_NONE, WS_RE,
  YEAR_RE,
  BAD_PDF, DURATION_RE,
  CONTACT_FIELDS, CRED_FIELDS, EDU_FIELDS, PLAN_FIELDS, WORK_FIELDS,
  KEY_ASK,
  AUDIT_ITEM_FIELDS, AUDIT_TOP_FIELDS, PLAN_TOP_FIELDS, SCHEMA_ARRAY, SCHEMA_BOOLEAN, SCHEMA_INTEGER, SCHEMA_OBJECT, SCHEMA_STRING,
} from './constants'
import {
  AUDIT_SYSTEM, COVER_EXTRA, LABEL_BASE, LABEL_COVER, LABEL_FACTS, LABEL_JD, LABEL_MISSING, LABEL_REQS, LABEL_TAILORED,
  PLAN_SYSTEM, RESUME_SYSTEM,
} from './prompts'
import type {
  AuditMsgIn, AuditOfIn, BumpOfIn, CellOfIn, FactMap, FailOfIn, JsonCell, MaybeScore, MaybeStepBody, MergedFactsIn,
  NewNumbersIn, NormText, SchemaNode, QuotedOfIn, ReqsOfIn, RetryValueIn, RunDocIn, RunPlanIn, SaveCoverIn, SavePlanIn,
  SaveResumeIn, SaveReviewIn, ScoreOfIn, SignerOfIn, StepBodyJson, StepFact, StepOut, StepRunIn, TailorBool, TailorDbRow,
  TailorKeyIn, TailorReq, TailorReqs, TailorReview, TailorRow, TailorRowOut, TailorWriteOut, TextList, UnsupportedOfIn,
  UserMsgIn,
  ResumeBadIn,
  DurationDropFn,
  KeepFactsIn,
} from './types'

// =========================================================================
// 1. 洗数与核对
// =========================================================================

/**
 * 请求体 → 步骤入参。
 *
 * @param raw 请求体。
 * @returns 洗净的入参;不合形给 null。
 */
export function toStepBody(raw: StepBodyJson): MaybeStepBody {
  const jobId = Number(raw.jobId)
  const steps: string[] = [STEP_PLAN, STEP_RESUME, STEP_COVER, STEP_AUDIT]
  if (Number.isInteger(jobId) === false || jobId <= 0 || raw.step == null || steps.includes(raw.step) === false) {
    return null
  }
  return { jobId, step: raw.step, facts: factsOf(raw), both: raw.both === true, regen: raw.regen === true, fill: raw.fill === true }
}

/**
 * 用户补充收窄:只收字符串,截断,空的不要。
 *
 * @param raw 请求体。
 * @returns 用户补充。
 */
function factsOf(raw: StepBodyJson): FactMap {
  const out: FactMap = {}
  if (raw.facts == null) {
    return out
  }
  for (const [k, v] of Object.entries(raw.facts)) {
    if (typeof v === 'string' && v.trim() !== TEXT_NONE) {
      out[k] = v.trim().slice(0, FACT_CHARS_MAX)
    }
  }
  return out
}

/**
 * 空的核对结果。
 *
 * @param reqs 职位要求。
 * @returns 核对结果。
 */
function emptyReview(reqs: TailorReqs): TailorReview {
  return { reqs, unsupported: [], score: null, retryResume: 0, retryCover: 0, bad: [] }
}

/**
 * 模型回包 → 职位要求:quote 必须能在职位描述里逐字找到,否则这条不要。
 *
 * @param x 模型回包与职位描述。
 * @returns 职位要求。
 */
export function reqsOf(x: ReqsOfIn): TailorReqs {
  const out: TailorReqs = []
  const list = cellOf({ obj: x.parsed, key: KEY_REQS })
  if (Array.isArray(list) === false) {
    return out
  }
  const jd = normOf(x.jd)
  for (const item of list as JsonCell[]) {
    const quote = normOf(strOf(cellOf({ obj: item, key: KEY_QUOTE })))
    const label = strOf(cellOf({ obj: item, key: KEY_LABEL })).slice(0, LABEL_MAX)
    if (quote !== TEXT_NONE && label !== TEXT_NONE && jd.includes(quote) && out.length < REQ_MAX) {
      out.push({
        id: out.length + 1, label, jd: quote, ask: strOf(cellOf({ obj: item, key: KEY_ASK })), basis: false, resume: TEXT_NONE, cover: TEXT_NONE,
      })
    }
  }
  return out
}

/**
 * 文字归一:空白折成一个空格(PDF 取出来的文字换行位置不同)。
 *
 * @param s 文字。
 * @returns 归一后的文字。
 */
export function normOf(s: string): NormText {
  return s.replace(WS_RE, ONE_SPACE).trim()
}

/**
 * 模型回的一格 → 对象的某一格。
 *
 * @param x 对象与键。
 * @returns 那一格;不是对象给 null。
 */
function cellOf(x: CellOfIn): JsonCell {
  if (x.obj == null || typeof x.obj !== 'object' || Array.isArray(x.obj)) {
    return null
  }
  const v = x.obj[x.key]
  if (v == null) {
    return null
  }
  return v
}

/**
 * 一格 → 字符串(不是字符串给空串)。
 *
 * @param c 一格。
 * @returns 字符串。
 */
function strOf(c: JsonCell): string {
  if (typeof c === 'string') {
    return c.trim()
  }
  return TEXT_NONE
}

/**
 * 模型回的核对 → 核对结果:引文逐字对不上按没写到;没有依据的要求不算覆盖。
 *
 * @param x 现有结果、模型回包与两份文字。
 * @returns 新的核对结果(分数已算好)。
 */
export function auditOf(x: AuditOfIn): TailorReview {
  const resume = normOf(x.resumeText)
  const cover = normOf(x.coverText)
  const items = cellOf({ obj: x.parsed, key: KEY_ITEMS })
  const reqs: TailorReq[] = []
  for (const r of x.review.reqs) {
    let hit: JsonCell = null
    if (Array.isArray(items)) {
      for (const it of items) {
        if (cellOf({ obj: it, key: KEY_ID }) === r.id) {
          hit = it
        }
      }
    }
    const basis = cellOf({ obj: hit, key: KEY_BASIS }) === true
    reqs.push({
      id: r.id, label: r.label, jd: r.jd, ask: r.ask, basis,
      resume: quotedOf({ quote: strOf(cellOf({ obj: hit, key: KEY_RESUME })), text: resume, basis }),
      cover: quotedOf({ quote: strOf(cellOf({ obj: hit, key: KEY_COVER })), text: cover, basis }),
    })
  }
  const unsupported = unsupportedOf({ parsed: x.parsed, cover })
  return {
    reqs, unsupported, score: scoreOf({ reqs, unsupported }), retryResume: x.review.retryResume, retryCover: x.review.retryCover, bad: [],
  }
}

/**
 * 一句引文的去留。
 *
 * @param x 引文、原文与有没有依据。
 * @returns 对得上给归一后的引文,否则空串。
 */
function quotedOf(x: QuotedOfIn): string {
  const q = normOf(x.quote)
  if (x.basis === false || q === TEXT_NONE || x.text.includes(q) === false) {
    return TEXT_NONE
  }
  return q
}

/**
 * 没有依据的句子(同样逐字核对)。
 *
 * @param x 模型回包与求职信。
 * @returns 句子。
 */
function unsupportedOf(x: UnsupportedOfIn): TextList {
  const list = cellOf({ obj: x.parsed, key: KEY_UNSUPPORTED })
  const out: TextList = []
  if (Array.isArray(list)) {
    for (const c of list) {
      const q = normOf(strOf(c))
      if (q !== TEXT_NONE && x.cover.includes(q)) {
        out.push(q)
      }
    }
  }
  return out
}

/**
 * 分数:简历覆盖占 70,求职信回应简历已覆盖的要求占 30,一句无依据扣 4。
 *
 * @param x 要求与无依据的句子。
 * @returns 0 到 100。
 */
export function scoreOf(x: ScoreOfIn): MaybeScore {
  if (x.reqs.length === 0) {
    return SCORE_MIN
  }
  let inResume = 0
  let inBoth = 0
  for (const r of x.reqs) {
    if (r.resume !== TEXT_NONE) {
      inResume++
      if (r.cover !== TEXT_NONE) {
        inBoth++
      }
    }
  }
  let letter = 0
  if (inResume > 0) {
    letter = inBoth / inResume
  }
  const raw = SCORE_RESUME * (inResume / x.reqs.length) + SCORE_COVER * letter - SCORE_PENALTY * x.unsupported.length
  return Math.max(SCORE_MIN, Math.round(raw))
}

/**
 * 这一版简历作废的原因。
 *
 * @param x 有没有排出 PDF、改写文字、基础文字(含用户补充)与基础简历。
 * @returns 原因;合格给空列。
 */
function resumeBadOf(x: ResumeBadIn): TextList {
  if (x.hasPdf === false) {
    return [BAD_PDF]
  }
  return newNumbersOf({ text: x.text, base: x.base }).concat(droppedYearsOf({ text: x.text, base: x.resumeBase }))
}

/**
 * 改写里新增的数字(年份、人数、金额):基础简历和用户补充里没有的都算。
 *
 * @param x 改写文字与基础文字。
 * @returns 新增的数字。
 */
export function newNumbersOf(x: NewNumbersIn): TextList {
  const baseNumbers = numbersIn(x.base)
  const out: TextList = []
  const found = withoutDurationsOf(x).match(NUMBER_RE)
  if (found == null) {
    return out
  }
  for (const m of found) {
    const n = m.replace(NUMBER_TAIL_RE, TEXT_NONE)
    if (n === TEXT_NONE) {
      continue
    }
    if (n !== TEXT_NONE && baseNumbers.includes(n) === false) {
      out.push(n)
    }
  }
  return out
}

/**
 * 文字里的数字(整串比较,150 不算含 15)。
 *
 * @param s 文字。
 * @returns 数字串。
 */
function numbersIn(s: string): TextList {
  const out: TextList = []
  const found = s.match(NUMBER_RE)
  if (found != null) {
    for (const m of found) {
      out.push(m.replace(NUMBER_TAIL_RE, TEXT_NONE))
    }
  }
  return out
}

/**
 * 去掉从简历日期算得出的年限说法:年限不超过基础简历最早与最晚年份之差才放行,再大的仍按新增数字拦。
 *
 * @param x 改写文字与基础文字。
 * @returns 去掉放行年限后的文字。
 */
function withoutDurationsOf(x: NewNumbersIn): string {
  const years: number[] = []
  const found = x.base.match(YEAR_RE)
  if (found != null) {
    for (const y of found) {
      years.push(Number(y))
    }
  }
  if (years.length === 0) {
    return x.text
  }
  const span = Math.max(...years) - Math.min(...years)
  return x.text.replace(DURATION_RE, makeDurationDrop(span))
}

/**
 * 造年限说法的替换函数。
 *
 * @param span 基础简历的年份跨度。
 * @returns 替换函数。
 */
function makeDurationDrop(span: number): DurationDropFn {
  return function dropDuration(m: string, n: string): string {
    if (Number(n) <= span) {
      return TEXT_NONE
    }
    return m
  }
}

/**
 * 改写丢掉的年份:基础简历里有、改写里没有,说明删了一段经历(2026-11-09 实测 qwen 删掉与职位无关的工作,留下时间线空白)。
 *
 * @param x 改写文字与基础简历。
 * @returns 丢掉的年份。
 */
export function droppedYearsOf(x: NewNumbersIn): TextList {
  const out: TextList = []
  const found = x.base.match(YEAR_RE)
  if (found == null) {
    return out
  }
  for (const y of found) {
    if (x.text.includes(y) === false && out.includes(y) === false) {
      out.push(y)
    }
  }
  return out
}

/**
 * 核对的用户消息。
 *
 * @param x 各段。
 * @returns 用户消息。
 */
export function auditMsgOf(x: AuditMsgIn): string {
  return [userMsgOf(x), LABEL_TAILORED + x.resumeText, LABEL_COVER + x.coverText].join(MSG_SEP)
}

/**
 * 用户消息:要求、这次必须补的、基础简历、用户补充、职位描述。
 *
 * @param x 各段。
 * @returns 用户消息。
 */
export function userMsgOf(x: UserMsgIn): string {
  const lines: string[] = [LABEL_REQS + reqLinesOf(x.reqs)]
  if (x.missing.length > 0) {
    lines.push(LABEL_MISSING + reqLinesOf(x.missing))
  }
  lines.push(LABEL_BASE + x.base.slice(0, BASE_CHARS_MAX))
  lines.push(LABEL_FACTS + factLinesOf(x))
  lines.push(LABEL_JD + x.jd.slice(0, JD_CHARS_MAX))
  return lines.join(MSG_SEP)
}

/**
 * 要求逐行。
 *
 * @param reqs 要求。
 * @returns 文字。
 */
function reqLinesOf(reqs: TailorReqs): string {
  const out: string[] = []
  for (const r of reqs) {
    out.push(String(r.id) + NUM_SEP + r.jd)
  }
  return out.join(LINE_SEP)
}

/**
 * 用户补充逐行(按要求编号带上要求原文)。
 *
 * @param x 要求与用户补充。
 * @returns 文字。
 */
function factLinesOf(x: UserMsgIn): string {
  const out: string[] = []
  for (const r of x.reqs) {
    const f = x.facts[String(r.id)]
    if (f != null) {
      out.push(r.jd + FACT_SEP + f)
    }
  }
  return out.join(LINE_SEP)
}

// =========================================================================
// 2. 跑一步
// =========================================================================

/**
 * 跑一步:每步最多调一次模型,回包告诉前端下一步。
 *
 * @param x 一步的全部入参。
 * @returns 下一步与核对结果。
 */
export async function runStep(x: StepRunIn): StepOut {
  const row = await loadTailorRow(x)
  if (row != null && row.status !== STATUS_DRAFT && row.status !== STATUS_QUEUED) {
    return failOf({ error: E_SENT, review: row.review })
  }
  if (x.step === STEP_PLAN) {
    return runPlan({ x, row })
  }
  if (row == null || row.review == null) {
    return failOf({ error: E_NONE, review: null })
  }
  await keepNewFacts({ x, row })
  if (x.step === STEP_RESUME) {
    return runResume({ x, row, review: row.review })
  }
  if (x.step === STEP_COVER) {
    return runCover({ x, row, review: row.review })
  }
  return runAudit({ x, row, review: row.review })
}

/**
 * 这次带来的用户补充先存下,后面写求职信、核对都读得到(同一次运行分几个请求)。
 *
 * @param y 入参与现有行。
 * @returns 无;现有行的补充更新为合并后的。
 */
async function keepNewFacts(y: KeepFactsIn): TailorWriteOut {
  if (Object.keys(y.x.newFacts).length === 0) {
    return
  }
  const facts = mergedFactsOf({ row: y.row, added: y.x.newFacts })
  await y.x.db.query(SQL.TAILOR_FACTS, [y.x.userId, y.x.jobId, JSON.stringify(facts)])
  y.row.facts = facts
}

/**
 * 失败的回包。
 *
 * @param y 错误码与现有结果。
 * @returns 回包。
 */
function failOf(y: FailOfIn): StepFact {
  return { error: y.error, next: STEP_DONE, review: y.review }
}

/**
 * 拆要求:已经拆过的直接用(重开投递框不再花模型),用户补充并进来。
 *
 * @param y 入参与现有行。
 * @returns 回包。
 */
async function runPlan(y: RunPlanIn): StepOut {
  const x = y.x
  let review: TailorReview | null = null
  if (y.row != null && y.row.review != null && y.row.review.reqs.length > 0) {
    review = y.row.review
  }
  if (review == null) {
    const raw = await x.deps.complete({ feature: FEATURE_PLAN, system: PLAN_SYSTEM, schema: planSchemaOf(), user: LABEL_JD + x.jd.slice(0, JD_CHARS_MAX), maxTokens: PLAN_TOKENS_MAX })
    const reqs = reqsOf({ parsed: x.deps.parse(raw), jd: x.jd })
    if (reqs.length === 0) {
      return failOf({ error: E_LLM, review: null })
    }
    review = emptyReview(reqs)
  }
  await savePlan({ db: x.db, userId: x.userId, jobId: x.jobId, title: x.title, company: x.company, resumeId: x.resumeId, review, facts: mergedFactsOf({ row: y.row, added: x.newFacts }) })
  return { error: TEXT_NONE, next: STEP_RESUME, review }
}

/**
 * 合并用户补充。
 *
 * @param y 现有行与新补充。
 * @returns 合并后的补充。
 */
function mergedFactsOf(y: MergedFactsIn): FactMap {
  const out: FactMap = {}
  if (y.row != null) {
    for (const [k, v] of Object.entries(y.row.facts)) {
      out[k] = v
    }
  }
  for (const [k, v] of Object.entries(y.added)) {
    out[k] = v
  }
  return out
}

/**
 * 写本岗简历:带上这次要补的要求;含基础简历没有的数字或排不成 PDF 就作废,重试到上限后报错。
 *
 * @param y 入参、现有行与结果。
 * @returns 回包。
 */
async function runResume(y: RunDocIn): StepOut {
  const x = y.x
  const facts = mergedFactsOf({ row: y.row, added: x.newFacts })
  const missing = y.review.reqs.filter(isMissingInResume)
  const review = bumpOf({ review: y.review, field: FIELD_RETRY_RESUME, reset: x.regen, counted: missing.length > 0 })
  const raw = await x.deps.complete({
    feature: FEATURE_RESUME, system: RESUME_SYSTEM, maxTokens: RESUME_TOKENS_MAX, schema: resumeSchemaOf(),
    user: userMsgOf({ reqs: review.reqs, missing, base: x.base, facts, jd: x.jd }),
  })
  const cv = x.deps.parse(raw)
  const pdf = await x.deps.cvPdf(cv)
  const base = x.base + ONE_SPACE + Object.values(facts).join(ONE_SPACE)
  const bad = resumeBadOf({ hasPdf: pdf.bytes != null, text: pdf.text, base, resumeBase: x.base })
  if (pdf.bytes == null || bad.length > 0) {
    const failed = bumpOf({ review, field: FIELD_RETRY_RESUME, reset: false, counted: true })
    failed.bad = bad
    await saveReview({ db: x.db, userId: x.userId, jobId: x.jobId, review: failed })
    if (failed.retryResume <= RETRY_MAX) {
      return { error: TEXT_NONE, next: STEP_RESUME, review: failed }
    }
    return failOf({ error: E_RESUME_BAD, review: failed })
  }
  await saveResume({ db: x.db, userId: x.userId, jobId: x.jobId, cv, pdfB64: Buffer.from(pdf.bytes).toString(B64), review })
  if (y.row.cover === TEXT_NONE || x.both) {
    return { error: TEXT_NONE, next: STEP_COVER, review }
  }
  return { error: TEXT_NONE, next: STEP_AUDIT, review }
}

/**
 * 有依据但简历没写到。
 *
 * @param r 一条要求。
 * @returns 是 true。
 */
function isMissingInResume(r: TailorReq): TailorBool {
  return r.basis && r.resume === TEXT_NONE
}

/**
 * 有依据但求职信没写到。
 *
 * @param r 一条要求。
 * @returns 是 true。
 */
function isMissingInCover(r: TailorReq): TailorBool {
  return r.basis && r.cover === TEXT_NONE
}

/**
 * 记一次重试(手动重新生成先清零)。
 *
 * @param y 结果、哪一格与要不要清零。
 * @returns 新结果。
 */
function bumpOf(y: BumpOfIn): TailorReview {
  const r = y.review
  let resume = r.retryResume
  let cover = r.retryCover
  if (y.field === FIELD_RETRY_RESUME) {
    resume = valueOf({ now: resume, reset: y.reset, counted: y.counted })
  } else {
    cover = valueOf({ now: cover, reset: y.reset, counted: y.counted })
  }
  return { reqs: r.reqs, unsupported: r.unsupported, score: r.score, retryResume: resume, retryCover: cover, bad: [] }
}

/**
 * 重试计数的新值。
 *
 * @param y 现值与要不要清零。
 * @returns 新值。
 */
function valueOf(y: RetryValueIn): number {
  if (y.reset) {
    return 0
  }
  if (y.counted === false) {
    return y.now
  }
  return y.now + 1
}

/**
 * 写本岗求职信。
 *
 * @param y 入参、现有行与结果。
 * @returns 回包。
 */
async function runCover(y: RunDocIn): StepOut {
  const x = y.x
  const facts = mergedFactsOf({ row: y.row, added: x.newFacts })
  const missing = y.review.reqs.filter(isMissingInCover)
  const review = bumpOf({ review: y.review, field: FIELD_RETRY_COVER, reset: x.regen, counted: missing.length > 0 })
  const raw = await x.deps.complete({
    feature: FEATURE_COVER, system: x.deps.coverSystem(signerOf({ name: x.name, row: y.row })) + COVER_EXTRA, maxTokens: COVER_TOKENS_MAX, schema: null,
    user: userMsgOf({ reqs: review.reqs, missing, base: x.base, facts, jd: x.jd }),
  })
  const cover = x.deps.coverClean(raw)
  if (cover.length < COVER_MIN_LEN) {
    return failOf({ error: E_LLM, review })
  }
  await saveCover({ db: x.db, userId: x.userId, jobId: x.jobId, cover, review })
  return { error: TEXT_NONE, next: STEP_AUDIT, review }
}

/**
 * 求职信的署名:档案里有用档案的,否则用本岗简历上的姓名。
 *
 * @param y 署名与投递行。
 * @returns 署名。
 */
function signerOf(y: SignerOfIn): string {
  if (y.name !== TEXT_NONE) {
    return y.name
  }
  return y.row.cvName
}

/**
 * 逐条核对:简历文字直接从要发出的 PDF 读;核对完决定要不要自动重试。
 * 2026-11-10 Frank「第二次让用户补齐信息 再修复 要不然 白花钱」,模型对比后定「全部 sonnet」:核对完不再自动打回重写
 * (原 retryStepOf:有依据没写到的先补简历再补求职信,每份最多 2 次)。一个职位固定四步各一次;没写到的照实标出来,
 * 第二次重写只在用户补了经历或手动点「重新生成」时发生。写坏的简历(新增数字、丢经历、出不了 PDF)那一路的重试照旧。
 *
 * @param y 入参、现有行与结果。
 * @returns 回包。
 */
async function runAudit(y: RunDocIn): StepOut {
  const x = y.x
  const resumeText = await x.deps.pdfText(y.row.pdfB64)
  const raw = await x.deps.complete({
    feature: FEATURE_AUDIT, system: AUDIT_SYSTEM, maxTokens: AUDIT_TOKENS_MAX, schema: auditSchemaOf(),
    user: auditMsgOf({ reqs: y.review.reqs, missing: [], base: x.base, facts: y.row.facts, jd: x.jd, resumeText, coverText: y.row.cover }),
  })
  const parsed = x.deps.parse(raw)
  if (parsed == null) {
    return failOf({ error: E_LLM, review: y.review })
  }
  const review = auditOf({ review: y.review, parsed, resumeText, coverText: y.row.cover })
  await saveReview({ db: x.db, userId: x.userId, jobId: x.jobId, review })
  await x.deps.markTrial()
  return { error: TEXT_NONE, next: STEP_DONE, review }
}

/**
 * 拆要求的返回结构。
 *
 * @returns JSON Schema。
 */
function planSchemaOf(): SchemaNode {
  return { type: SCHEMA_OBJECT, additionalProperties: false, required: PLAN_TOP_FIELDS, properties: { reqs: arrayOf(strObjectOf(PLAN_FIELDS)) } }
}

/**
 * 全是字符串字段的对象结构。
 *
 * @param fields 字段名。
 * @returns JSON Schema。
 */
function strObjectOf(fields: TextList): SchemaNode {
  const properties: Record<string, object> = {}
  for (const f of fields) {
    properties[f] = { type: SCHEMA_STRING }
  }
  return { type: SCHEMA_OBJECT, additionalProperties: false, required: fields, properties }
}

/**
 * 数组结构。
 *
 * @param items 元素结构。
 * @returns JSON Schema。
 */
function arrayOf(items: SchemaNode): SchemaNode {
  return { type: SCHEMA_ARRAY, items }
}

/**
 * 写简历的返回结构。
 *
 * @returns JSON Schema。
 */
function resumeSchemaOf(): SchemaNode {
  const properties = {
    contact: strObjectOf(CONTACT_FIELDS),
    summary: { type: SCHEMA_STRING },
    work: arrayOf(strObjectOf(WORK_FIELDS)),
    edu: arrayOf(strObjectOf(EDU_FIELDS)),
    skills: { type: SCHEMA_STRING },
    creds: arrayOf(strObjectOf(CRED_FIELDS)),
  }
  return { type: SCHEMA_OBJECT, additionalProperties: false, required: Object.keys(properties), properties }
}

/**
 * 核对的返回结构。
 *
 * @returns JSON Schema。
 */
function auditSchemaOf(): SchemaNode {
  const item = {
    type: SCHEMA_OBJECT, additionalProperties: false, required: AUDIT_ITEM_FIELDS,
    properties: { id: { type: SCHEMA_INTEGER }, basis: { type: SCHEMA_BOOLEAN }, resume: { type: SCHEMA_STRING }, cover: { type: SCHEMA_STRING } },
  }
  return {
    type: SCHEMA_OBJECT, additionalProperties: false, required: AUDIT_TOP_FIELDS,
    properties: { items: arrayOf(item), unsupported: arrayOf({ type: SCHEMA_STRING }) },
  }
}

// =========================================================================
// 3. 库行与取数
// =========================================================================

/**
 * 本人这一岗的投递行。
 *
 * @param x 连接、用户与职位。
 * @returns 投递行;没有给 null。
 */
export async function loadTailorRow(x: TailorKeyIn): TailorRowOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.TAILOR_ROW, params: [x.userId, x.jobId], map: toTailorRow }))
}

/**
 * 建行并存要求。
 *
 * @param x 行键、快照、要求与补充。
 * @returns 无。
 */
async function savePlan(x: SavePlanIn): TailorWriteOut {
  await x.db.query(SQL.TAILOR_PLAN, [x.userId, x.jobId, x.title, x.company, x.resumeId, JSON.stringify(x.review), JSON.stringify(x.facts)])
}

/**
 * 存本岗简历。
 *
 * @param x 行键、草稿、PDF 与结果。
 * @returns 无。
 */
async function saveResume(x: SaveResumeIn): TailorWriteOut {
  await x.db.query(SQL.TAILOR_RESUME, [x.userId, x.jobId, JSON.stringify(x.cv), x.pdfB64, JSON.stringify(x.review)])
}

/**
 * 存求职信。
 *
 * @param x 行键、信与结果。
 * @returns 无。
 */
export async function saveCover(x: SaveCoverIn): TailorWriteOut {
  await x.db.query(SQL.TAILOR_COVER, [x.userId, x.jobId, x.cover, JSON.stringify(x.review)])
}

/**
 * 存核对结果。
 *
 * @param x 行键与结果。
 * @returns 无。
 */
async function saveReview(x: SaveReviewIn): TailorWriteOut {
  await x.db.query(SQL.TAILOR_REVIEW, [x.userId, x.jobId, JSON.stringify(x.review)])
}

/**
 * 库行 → 投递行。
 *
 * @param r 库行。
 * @returns 投递行。
 */
export function toTailorRow(r: TailorDbRow): TailorRow {
  let facts: FactMap = {}
  if (r.tailor_facts != null) {
    facts = r.tailor_facts
  }
  return { id: count(r.id), status: text(r.status), cover: text(r.cover_text), pdfB64: text(r.tailor_pdf_b64), review: r.tailor_review, facts, cvName: text(r.cv_name) }
}
