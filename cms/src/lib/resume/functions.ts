/**
 * 简历域的行为:取字(上传文件 → 纯文本)与对照(简历 × JD 的逐条对照)。
 * AI 进两头不进中间:JD/简历的自由文本理解交给 LLM(completeText),
 * 免费/付费怎么裁、JSON 怎么收口、prompt 怎么组装,全在这里(可单测,不碰网络)。
 * 不落盘不入库(E11-07 首用,G3 上传复用)。
 * 2026-10-05 加「我的简历」原件存取(user_resumes,设计稿 docs/design/我的模块v2-20261005.md「定稿」):
 * 原件入库只走 routes 的 file 三芯(本人主动上传、可随时删);上面三条解析路照旧不落库。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

import { count, firstOf, numOrNull, queryRows, SQL, text } from '../db'
import { fill } from '../template'
import { log, RESUME_LOG } from '../log'
import {
  BODY_MAX,
  CLAMP, ERR_SLICE, ERR_UNSUPPORTED, EXT_DOCX, EXT_PDF, EXT_SEP, FREE_ROWS, IELTS_CLB, NOC_CAND_MAX, ROLE_SYSTEM,
  ROLE_USER, BRACE_CLOSE, BRACE_OPEN, NOTE_MAX, REQ_MAX, RGBA_BYTES, ROWS_MAX, ROWS_MIN, ERR_NONE, REWRITE_NONE,
  TITLE_PENDING, B64, DISP_ATTACH, DISP_INLINE, DISP_NAME_HEAD, DOCX_MAGIC, FILE_NAME_DOCX, FILE_NAME_MAX, FILE_NAME_PDF,
  FILE_NAME_NONE, MIME_DOCX, MIME_PDF, P_ID, PDF_MAGIC, TIME_NONE, E_NO_RESUME, E_PARSE, E_SCAN, EXTRACT_TEXT_MIN, ONE_SPACE,
  PREFILL_MAJORS_MAX, PREFILL_NONE, PREFILL_SIM_MIN, TITLES_N_MAX, WS_ALL_RE,
  PREFILL_CRED_LEN, PREFILL_EDU_MAX, PREFILL_SCHOOL_LEN, PREFILL_YEAR_LEN, PREFILL_YEAR_RE,
  PREFILL_EDU_KINDS, PREFILL_EDU_LENS, PREFILL_EDU_PROVS, PREFILL_OPT_LEN,
  PREFILL_JOB_LINE_LEN, PREFILL_JOB_NOTES_LEN, PREFILL_JOBS_MAX, PREFILL_SIDE_RE, PREFILL_YM_LEN, PREFILL_YM_RE,
} from './constants'
import { MATCH_REWRITE, MATCH_SYSTEM, MATCH_USER, OUT_LANG, OUT_LANG_DEFAULT } from './prompts'
import type {
  ResumeBodyOut,
  CaughtError, ExtractIn, ExtractOut, GateMatchIn, Gated, MatchMessages, MatchPromptIn, MatchRows,
  MaybeIelts, MaybeNum, NocCandidate, NocCandidatesIn, NocCandidatesOut, JsonObj, MaybeMatchRows, NocSimDbRow,
  NocTitleDbRow, NocTitleRow, ParsedJson, DispositionIn, FileMimeIn, FileNameIn, MaybeMime, ResumeBlob, ResumeBlobDbRow,
  ResumeBlobOut, ResumeDeleteOut, ResumeFileDbRow, ResumeFileMeta, ResumeListOut, ResumeSaveIn, ResumeSaveOut, ResumeUserIn,
  CountDbRow, MaybeResumeId, ResumeCountOut, ResumeIdDbRow, ResumeIdFact, ResumeOneIn, TimeCell,
  CellTextsIn, JsonCell, MaybePrefillEdu, NocSimFact, PrefillCellIn, PrefillCodes, PrefillEdus, PrefillData, PrefillFact, PrefillMajorsIn, PrefillTextOut, PrefillWorksIn, PrefillWorksOut,
  PrefillOptIn, MaybePrefillJob, PrefillJob, PrefillJobs, PrefillJobsIn, PrefillJobsOut, PrefillWork,
} from './types'

/**
 * pdf 解析器 destroy 失败的吞错(资源清理失败不该盖过已拿到的文本)。
 *
 * @param e 捕到的错误。
 * @returns 无。
 */
function ignoreDestroyFailure(e: CaughtError): void {
  log({ tag: RESUME_LOG.tag, text: RESUME_LOG.destroyFailed + e.message })
}

/**
 * 简历文件 → 纯文本(内存解析)。只管 pdf/docx。
 * 加密 PDF/损坏文件等 → 统一走 parse 失败回退;真实错误必须留痕 ——
 * 2026-08-03 生产 PDF 必败查了两轮,才发现 catch 把 module/引擎错误也吞了。
 *
 * @param input 文件名与字节。
 * @returns 文本;解析不了 text=null 且 err 说明原因。
 */
export async function extractText(input: ExtractIn): ExtractOut {
  const parts = input.name.toLowerCase().split(EXT_SEP)
  const ext = parts[parts.length - 1]
  try {
    if (ext === EXT_PDF) {
      shimPdfGlobals()
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(input.buf) })
      try {
        const got = await parser.getText()
        return { text: got.text, err: ERR_NONE }
      } finally {
        await parser.destroy().catch(ignoreDestroyFailure)
      }
    }
    if (ext === EXT_DOCX) {
      const mod = await import('mammoth')
      const got = await mod.default.extractRawText({ buffer: input.buf })
      return { text: got.value, err: ERR_NONE }
    }
  } catch (e) {
    let err = String(e)
    if (e instanceof Error) {
      err = e.name + RESUME_LOG.errSep + e.message
    }
    log({ tag: RESUME_LOG.tag, text: RESUME_LOG.extractFailed + ext + RESUME_LOG.errSep + err.slice(0, ERR_SLICE) })
    return { text: null, err: err }
  }
  return { text: null, err: ERR_UNSUPPORTED }
}

/**
 * pdfjs 5.x 模块初始化引用 DOM 全局(DOMMatrix 等)。本机/Windows 由 @napi-rs/canvas 原生包顶上;
 * 生产 Linux 上它加载不成 → 「Failed to load external module pdf-parse: DOMMatrix is not defined」
 * (2026-08-03 生产实撞,detail 探针抓到)。文本抽取不做矩阵运算,垫最小 stub 让模块能初始化即可。
 * 体内的 class 与 any 都是**外部库要求的全局垫片**这一条宪法明许的例外(pdf.js 要 `new DOMMatrix()`,
 * 全局对象的形状由平台定,不归我们的类型管)。
 *
 * @returns 无(往 globalThis 上垫)。
 */
function shimPdfGlobals(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 全局垫片:globalThis 的形状由平台定,垫的就是平台缺的格
  const g = globalThis as any
  if (typeof g.DOMMatrix === 'undefined') {
    // eslint-disable-next-line local/no-class -- 外部库要求的全局垫片(pdf.js 要 new DOMMatrix()),宪法明许的唯一 class 例外
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
      constructor(init: number[] = []) {
        const [a, b, c, d, e, f] = init
        if (a != null && b != null && c != null && d != null && e != null && f != null) {
          this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f
        }
      }
      translate() {
        return this 
      }
      scale() {
        return this 
      }
      multiply() {
        return this 
      }
      inverse() {
        return this 
      }
      transformPoint(p: object) {
        return p 
      }
    }
  }
  if (typeof g.ImageData === 'undefined') {
    // eslint-disable-next-line local/no-class -- 同上:pdf.js 初始化要的平台全局
    g.ImageData = class ImageData {
      width = 0
      height = 0
      data: Uint8ClampedArray
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
        this.data = new Uint8ClampedArray(w * h * RGBA_BYTES)
      }
    }
  }
  if (typeof g.Path2D === 'undefined') {
    // eslint-disable-next-line local/no-class -- 同上:pdf.js 初始化要的平台全局
    g.Path2D = class Path2D {
      addPath() {}
      moveTo() {}
      lineTo() {}
    }
  }
}

/**
 * prompt 实际发出去的字符数 = 网关口径(所有 message content 之和)。预算单测靠它,别再手算。
 *
 * @param msgs 要发的消息。
 * @returns 字符数。
 */
export function promptChars(msgs: MatchMessages): number {
  let n = 0
  for (const m of msgs) {
    n += m.content.length
  }
  return n
}

/**
 * 免费闸(服务端裁,同 gateReport 惯例:锁区正文根本不下发)。
 * 缺的排前 → 可见=前 FREE_ROWS 条;lockedN=真实剩余行数(前端打几行码就看它)。
 *
 * @param input 校验过的行与付费态。
 * @returns 裁决。
 */
export function gateMatch(input: GateMatchIn): Gated {
  const misses: MatchRows = []
  const hits: MatchRows = []
  for (const r of input.rows) {
    if (r.hit) {
      hits.push(r)
    } else {
      misses.push(r)
    }
  }
  const sorted = misses.concat(hits)
  if (input.pro) {
    return { visible: sorted, lockedN: 0, hitN: hits.length, total: input.rows.length }
  }
  return {
    visible: sorted.slice(0, FREE_ROWS),
    lockedN: Math.max(0, input.rows.length - FREE_ROWS),
    hitN: hits.length,
    total: input.rows.length,
  }
}

/**
 * 对照 prompt 组装(G3):system 的 {rewrite}/{outLang} 与 user 的 {jd}/{resume} 槽
 * 用 lib/template 的 fill 填;JD/简历各截 CLAMP(输入侧封顶,#102 账单教训)。
 *
 * @param input JD、简历、语言与付费态。
 * @returns 发给模型的两条消息。
 */
export function matchPrompt(input: MatchPromptIn): MatchMessages {
  const outLang = outLangOf(input.lang)
  let rewrite = REWRITE_NONE
  if (input.pro) {
    rewrite = MATCH_REWRITE
  }
  return [
    { role: ROLE_SYSTEM, content: fill({ tpl: MATCH_SYSTEM, params: { rewrite: rewrite, outLang: outLang } }) },
    {
      role: ROLE_USER,
      content: fill({ tpl: MATCH_USER, params: { jd: input.jd.slice(0, CLAMP), resume: input.resume.slice(0, CLAMP) } }),
    },
  ]
}

/**
 * IELTS（G 类）→ CLB：四项都是数才换，从高到低扫首个四项全达标的档
 * （= 四技能各自换算取最小，IRCC 官方对照）。
 *
 * @param b 四项分；简历没写是 null。
 * @returns CLB 档；换不出是 null（绝不猜）。
 */
export function ieltsToClb(b: MaybeIelts): MaybeNum {
  if (b == null) {
    return null
  }
  if (typeof b.listening !== 'number' || typeof b.reading !== 'number'
    || typeof b.writing !== 'number' || typeof b.speaking !== 'number') {
    return null
  }
  for (const row of IELTS_CLB) {
    if (b.listening >= row.l && b.reading >= row.r && b.writing >= row.w && b.speaking >= row.s) {
      return row.clb
    }
  }
  return null
}

/**
 * 职名 → NOC 候选：在库职位标题 pg_trgm 相似度（真实在招岗位的 title→noc
 * 映射，比官方类名更贴简历用语）；去重封顶 NOC_CAND_MAX，再回表补官方英文名。
 *
 * @param input 连接与验过形的职名清单。
 * @returns 候选清单（可空）。
 */
export async function nocCandidatesOf(input: NocCandidatesIn): NocCandidatesOut {
  const seen = new Set<string>()
  const out: NocCandidate[] = []
  for (const q of input.titles) {
    if (out.length >= NOC_CAND_MAX) {
      break
    }
    const codes = await queryRows({ db: input.db, sql: SQL.NOC_BY_TITLE_SIM, params: [q], map: toNocCodeCell })
    for (const noc of codes) {
      if (noc === '' || seen.has(noc) || out.length >= NOC_CAND_MAX) {
        continue
      }
      seen.add(noc)
      out.push({ noc: noc, title: TITLE_PENDING })
    }
  }
  if (out.length > 0) {
    const wanted: string[] = []
    for (const c of out) {
      wanted.push(c.noc)
    }
    const titles = await queryRows({ db: input.db, sql: SQL.NOC_TITLES_BY_CODES, params: [wanted], map: toNocTitleRow })
    const byNoc = new Map<string, string>()
    for (const t of titles) {
      byNoc.set(t.noc, t.title)
    }
    for (const c of out) {
      const title = byNoc.get(c.noc)
      if (title != null) {
        c.title = title
      }
    }
  }
  return out
}

// =========================================================================
// 从简历填档案(2026-11-09「我的」第一批;/api/resume/prefill,结果先填表单,用户保存后才入档案)
// =========================================================================

/**
 * 读本人默认简历的文字(清单第一份就是默认那份)。
 *
 * @param x 连接与用户 id。
 * @returns 文字或错误码。
 */
export async function loadPrefillText(x: ResumeUserIn): PrefillTextOut {
  const first = firstOf(await loadResumeList(x))
  if (first == null) {
    return { text: PREFILL_NONE, error: E_NO_RESUME }
  }
  const blob = await loadResumeBlob({ db: x.db, userId: x.userId, id: first.id })
  if (blob == null) {
    return { text: PREFILL_NONE, error: E_NO_RESUME }
  }
  const got = await extractText({ name: blob.fileName, buf: Buffer.from(blob.bytes) })
  if (got.text == null) {
    return { text: PREFILL_NONE, error: E_PARSE }
  }
  const text = got.text.replace(WS_ALL_RE, ONE_SPACE).trim()
  if (text.length < EXTRACT_TEXT_MIN) {
    return { text: PREFILL_NONE, error: E_SCAN }
  }
  return { text, error: PREFILL_NONE }
}

/**
 * 本人默认那份简历还没提取过正文就提取一次、记进库(2026-11-11 任务书第 44 条:今日推荐的简历匹配要它)。
 * 用到时才提(已有的简历不批量回填);提取不出来(扫描件、加密、坏文件)记空串,不再重试 —— 换了文件库里会清回未提取。
 *
 * @param x 连接与用户 id。
 * @returns 无。
 */
export async function ensureResumeBody(x: ResumeUserIn): ResumeBodyOut {
  const pending = firstOf(await queryRows({ db: x.db, sql: SQL.RESUME_BODY_PENDING, params: [x.userId], map: toResumeId }))
  if (pending == null) {
    return
  }
  let body = PREFILL_NONE
  const blob = await loadResumeBlob({ db: x.db, userId: x.userId, id: pending.id })
  if (blob != null) {
    const got = await extractText({ name: blob.fileName, buf: Buffer.from(blob.bytes) })
    if (got.text != null) {
      body = got.text.replace(WS_ALL_RE, ONE_SPACE).trim().slice(0, BODY_MAX)
    }
  }
  await x.db.query(SQL.RESUME_BODY_SET, [x.userId, pending.id, body])
}

/**
 * 模型回的 JSON → 洗净的提取结果(非字符串项丢掉,坏格按没有)。
 *
 * @param d 模型回的 JSON。
 * @returns 提取结果。
 */
export function prefillFactOf(d: PrefillData): PrefillFact {
  let name: string = PREFILL_NONE
  if (typeof d.name === 'string') {
    name = d.name.trim()
  }
  return {
    name,
    titles: cellTextsOf({ cell: d.titles, max: TITLES_N_MAX }),
    majors: cellTextsOf({ cell: d.majors, max: PREFILL_MAJORS_MAX }),
    education: toPrefillEdus(d.education),
    jobs: toPrefillJobs({ cell: d.jobs, max: PREFILL_JOBS_MAX }),
  }
}

/**
 * 模型回的工作经历一格 → 洗净的几段(2026-11-12):不是数组(含缺席)给空列;不合形或全空的项丢掉;至多 PREFILL_JOBS_MAX 段。
 * 2026-11-13 Frank「做」(起因:他简历的项目一节排在前面,名额全被项目占了):模型给每段标了它所在的节;
 * 只要有一段来自雇佣经历那一节,项目、课程作业、志愿这些节下的段全删;一段雇佣经历都没有(简历只有项目)才照留。
 *
 * @param x 模型回的一格(缺席按没有读)与至多几段。
 * @returns 几段工作经历。
 */
function toPrefillJobs(x: PrefillCellIn): PrefillJobs {
  const all: PrefillJobs = []
  const side: boolean[] = []
  if (Array.isArray(x.cell)) {
    for (const c of x.cell) {
      const job = toPrefillJob(c)
      if (job != null) {
        all.push(job)
        side.push(isSideSection(c))
      }
    }
  }
  const employed = side.includes(false)
  const out: PrefillJobs = []
  for (const [i, job] of all.entries()) {
    if ((employed === false || side[i] === false) && out.length < x.max) {
      out.push(job)
    }
  }
  return out
}

/**
 * 模型回的一项是不是来自「不算雇佣经历」的节(项目、课程作业、志愿这些):看它标的节标题;没标节的按雇佣经历算。
 *
 * @param c 模型回的一项。
 * @returns 来自项目类的节 = true。
 */
function isSideSection(c: JsonCell): boolean {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) {
    return false
  }
  return PREFILL_SIDE_RE.test(prefillCellOf({ cell: c.section, max: PREFILL_JOB_LINE_LEN }))
}

/**
 * 模型回的一项 → 一段工作经历:各格去首尾空白、截到上限;起止年月不合形的清空;职位名称、雇主、职责都没有的整项丢。
 *
 * @param c 模型回的一项。
 * @returns 一段;不是对象或全空 null。
 */
function toPrefillJob(c: JsonCell): MaybePrefillJob {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) {
    return null
  }
  const job: PrefillJob = {
    occupation: prefillCellOf({ cell: c.occupation, max: PREFILL_JOB_LINE_LEN }),
    title: prefillCellOf({ cell: c.title, max: PREFILL_JOB_LINE_LEN }),
    employer: prefillCellOf({ cell: c.employer, max: PREFILL_JOB_LINE_LEN }),
    city: prefillCellOf({ cell: c.city, max: PREFILL_JOB_LINE_LEN }),
    from: prefillYmOf({ cell: c.from, max: PREFILL_YM_LEN }),
    to: prefillYmOf({ cell: c.to, max: PREFILL_YM_LEN }),
    notes: prefillCellOf({ cell: c.notes, max: PREFILL_JOB_NOTES_LEN }),
  }
  if (job.title === PREFILL_NONE && job.employer === PREFILL_NONE && job.notes === PREFILL_NONE) {
    return null
  }
  return job
}

/**
 * 模型回的一格 → 起止年月:合形(2021 或 2021-03)才留,别的给空串。
 *
 * @param x 模型回的一格(缺席按没有读)与至多几个字。
 * @returns 年月或空串。
 */
function prefillYmOf(x: PrefillCellIn): string {
  const v = prefillCellOf(x)
  if (PREFILL_YM_RE.test(v)) {
    return v
  }
  return PREFILL_NONE
}

/**
 * 几段工作经历 → 回给档案表单的几段(2026-11-12):每段按职业的英文通称(没有就用职位名称)映射一个职业码
 * (规矩同 prefillWorksOf:相似度够、库内有名字才收),映射不上这一段照留、不挂职业。
 *
 * @param x 连接与洗净的几段。
 * @returns 表单用的几段。
 */
export async function prefillJobsOf(x: PrefillJobsIn): PrefillJobsOut {
  const out: PrefillWork[] = []
  for (const j of x.jobs) {
    let q = j.occupation
    if (q === PREFILL_NONE) {
      q = j.title
    }
    let nocs: string[] = []
    if (q !== PREFILL_NONE) {
      nocs = await prefillWorksOf({ db: x.db, titles: [q] })
    }
    out.push({ nocs, title: j.title, org: j.employer, city: j.city, from: j.from, to: j.to, desc: j.notes })
  }
  return out
}

/**
 * 模型回的教育经历一格 → 洗净的清单(2026-11-12):不是数组给空列;不合形或四格全空的项丢掉;至多 PREFILL_EDU_MAX 条。
 *
 * @param cell 模型回的一格。
 * @returns 教育经历清单。
 */
function toPrefillEdus(cell: JsonCell): PrefillEdus {
  const out: PrefillEdus = []
  if (Array.isArray(cell)) {
    for (const c of cell) {
      const row = toPrefillEdu(c)
      if (row != null && out.length < PREFILL_EDU_MAX) {
        out.push(row)
      }
    }
  }
  return out
}

/**
 * 模型回的一项 → 一条教育经历:名称与学校去首尾空白、截到上限;年份只认四位数字(模型给成数字的也认),别的清空。
 * 2026-11-12 Frank「简历里能抽出来吧」:多洗三格 —— 院校所在地、公立私立、课程时长,不是档案表单那三只下拉的取值一律空串
 * (见 prefillOptOf);这三格不算进「四格全空就丢」。
 *
 * @param c 模型回的一项。
 * @returns 一条;不是对象或四格全空 null。
 */
function toPrefillEdu(c: JsonCell): MaybePrefillEdu {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) {
    return null
  }
  const credential = prefillCellOf({ cell: c.credential, max: PREFILL_CRED_LEN })
  const school = prefillCellOf({ cell: c.school, max: PREFILL_SCHOOL_LEN })
  let from = prefillCellOf({ cell: c.from, max: PREFILL_YEAR_LEN + 1 })
  if (PREFILL_YEAR_RE.test(from) === false) {
    from = PREFILL_NONE
  }
  let to = prefillCellOf({ cell: c.to, max: PREFILL_YEAR_LEN + 1 })
  if (PREFILL_YEAR_RE.test(to) === false) {
    to = PREFILL_NONE
  }
  if (credential === PREFILL_NONE && school === PREFILL_NONE && from === PREFILL_NONE && to === PREFILL_NONE) {
    return null
  }
  return {
    credential,
    school,
    from,
    to,
    prov: prefillOptOf({ cell: c.prov, opts: PREFILL_EDU_PROVS }),
    kind: prefillOptOf({ cell: c.kind, opts: PREFILL_EDU_KINDS }),
    len: prefillOptOf({ cell: c.len, opts: PREFILL_EDU_LENS }),
  }
}

/**
 * 模型回的一格 → 只认给定取值的一格(2026-11-12):去首尾空白后一字不差是其中之一才留(大小写也要对),别的给空串。
 *
 * @param x 模型回的一格与只认的取值。
 * @returns 取值或空串。
 */
function prefillOptOf(x: PrefillOptIn): string {
  const v = prefillCellOf({ cell: x.cell, max: PREFILL_OPT_LEN })
  if (x.opts.includes(v)) {
    return v
  }
  return PREFILL_NONE
}

/**
 * 模型回的一格 → 一段字:字符串去首尾空白后截到上限;数字转成字;别的(null、对象、缺席)给空串。
 *
 * @param x 模型回的一格与上限。
 * @returns 一段字。
 */
function prefillCellOf(x: PrefillCellIn): string {
  if (typeof x.cell === 'string') {
    return x.cell.trim().slice(0, x.max)
  }
  if (typeof x.cell === 'number' && Number.isFinite(x.cell)) {
    return String(x.cell).slice(0, x.max)
  }
  return PREFILL_NONE
}

/**
 * 模型回的一格清单 → 字符串清单。
 *
 * @param x 原格与上限。
 * @returns 字符串清单;不是数组给空列。
 */
function cellTextsOf(x: CellTextsIn): PrefillCodes {
  const out: string[] = []
  if (Array.isArray(x.cell)) {
    for (const c of x.cell) {
      if (typeof c === 'string' && c.trim() !== PREFILL_NONE && out.length < x.max) {
        out.push(c.trim())
      }
    }
  }
  return out
}

/**
 * 职业名 → 职业码:每个名字只取相似度最高的那一个,够 PREFILL_SIM_MIN 才收,且必须是库内有名字的码;映射不上留空。
 *
 * @param x 连接与职业名。
 * @returns 职业码(去重)。
 */
export async function prefillWorksOf(x: PrefillWorksIn): PrefillWorksOut {
  const codes: string[] = []
  for (const q of x.titles) {
    const top = firstOf(await queryRows({ db: x.db, sql: SQL.NOC_BY_TITLE_SIM, params: [q], map: toNocSim }))
    if (top != null && top.sim >= PREFILL_SIM_MIN && codes.includes(top.noc) === false) {
      codes.push(top.noc)
    }
  }
  if (codes.length === 0) {
    return codes
  }
  const known = await queryRows({ db: x.db, sql: SQL.NOC_TITLES_BY_CODES, params: [codes], map: toNocTitleRow })
  const has = new Set<string>()
  for (const k of known) {
    has.add(k.noc)
  }
  const out: string[] = []
  for (const c of codes) {
    if (has.has(c)) {
      out.push(c)
    }
  }
  return out
}

/**
 * 专业名 → 专业码:每个名字取搜索第一名。
 *
 * @param x 专业名与搜索函数。
 * @returns 专业码(去重)。
 */
export function prefillMajorsOf(x: PrefillMajorsIn): PrefillCodes {
  const out: string[] = []
  for (const q of x.names) {
    const top = firstOf(x.hitsOf(q))
    if (top != null && out.includes(top) === false) {
      out.push(top)
    }
  }
  return out
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

/**
 * LLM 输出收口:先整体 parse(wholeJsonOf),不行再取第一个平衡的大括号块
 * (模型偶发裹说明文字)。最终收不出来返回 null,由调用方给用户报「对照失败」。
 *
 * @param text 模型原文。
 * @returns 一个 JSON 对象;收不出来是 null。
 */
export function parseLlmJson(text: string): ParsedJson {
  const t = text.trim()
  const whole = wholeJsonOf(t)
  if (whole != null) {
    return whole
  }
  const i = t.indexOf(BRACE_OPEN)
  if (i < 0) {
    return null
  }
  let depth = 0
  for (let j = i; j < t.length; j++) {
    if (t[j] === BRACE_OPEN) {
      depth++
    } else if (t[j] === BRACE_CLOSE) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(t.slice(i, j + 1)) as ParsedJson
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/**
 * LLM 输出收口·第一步:整体 JSON.parse,且要求结果是对象(模型偶发给裸数组/标量,
 * 对照吃不了,交给第二步截取)。catch 是收口算法的分支切换,不是降级。
 * 体内 `as` 是跨边界断言:JSON.parse 的返回没有形状。
 *
 * @param t 修剪过的模型原文。
 * @returns 一个 JSON 对象;不是对象或坏 JSON 是 null。
 */
function wholeJsonOf(t: string): ParsedJson {
  try {
    const whole = JSON.parse(t) as ParsedJson
    if (whole != null && typeof whole === 'object' && Array.isArray(whole) === false) {
      return whole
    }
    return null
  } catch {
    return null
  }
}

/**
 * 形状不可信(模型输出)→ 逐行校验;脏行丢弃,最多收 ROWS_MAX 行,
 * 少于 ROWS_MIN 条 = 解析失败或 JD 太空,不硬凑,返回 null。
 *
 * @param raw 收口出来的 JSON 对象。
 * @returns 干净的行;不够是 null。
 */
export function normalizeRows(raw: ParsedJson): MaybeMatchRows {
  if (raw == null) {
    return null
  }
  const rowsCell = raw.rows
  if (Array.isArray(rowsCell) === false) {
    return null
  }
  const out: MatchRows = []
  for (const r of rowsCell) {
    if (out.length >= ROWS_MAX) {
      break
    }
    if (r == null || typeof r !== 'object' || Array.isArray(r)) {
      continue
    }
    const row: JsonObj = r
    const req = row.req
    const hit = row.hit
    if (typeof req !== 'string' || req.trim() === '' || typeof hit !== 'boolean') {
      continue
    }
    let note = ''
    if (row.note != null) {
      note = String(row.note).trim().slice(0, NOTE_MAX)
    }
    out.push({ req: req.trim().slice(0, REQ_MAX), hit: hit, note: note })
  }
  if (out.length >= ROWS_MIN) {
    return out
  }
  return null
}

/**
 * 词汇:界面语言码 → 给模型的输出语言名(表里没有落 OUT_LANG_DEFAULT;
 * Record 查表的 undefined 在这一行当场收)。
 *
 * @param lang 界面语言码。
 * @returns 输出语言名。
 */
export function outLangOf(lang: string): string {
  const hit = OUT_LANG[lang]
  if (hit == null) {
    return OUT_LANG_DEFAULT
  }
  return hit
}

/**
 * 一行 trgm 命中（SQL.NOC_BY_TITLE_SIM）→ 职业码（只消费这一格）。
 *
 * @param r 库里的一行。
 * @returns 职业码；缺位空串。
 */
export function toNocCodeCell(r: NocSimDbRow): string {
  return text(r.noc)
}

/**
 * 一行 trgm 命中 → 职业码与相似度(从简历填档案要按相似度卡线)。
 *
 * @param r 库里的一行。
 * @returns 码与相似度;相似度缺位按 0。
 */
export function toNocSim(r: NocSimDbRow): NocSimFact {
  let sim = 0
  const n = numOrNull(r.sim)
  if (n != null) {
    sim = n
  }
  return { noc: text(r.noc), sim }
}

/**
 * 一行 NOC 官方名（SQL.NOC_TITLES_BY_CODES；多出的三语列不消费）。
 *
 * @param r 库里的一行。
 * @returns 码 + 英文名。
 */
export function toNocTitleRow(r: NocTitleDbRow): NocTitleRow {
  return { noc: text(r.noc), title: text(r.title) }
}

/**
 * 简历元信息库行 → 元信息。
 *
 * @param r 库行。
 * @returns 元信息。
 */
export function toResumeFileMeta(r: ResumeFileDbRow): ResumeFileMeta {
  return {
    id: count(r.id), isDefault: r.is_default === true, fileName: text(r.file_name), mime: text(r.mime),
    sizeBytes: count(r.size_bytes), uploadedAt: isoOf(r.uploaded_at),
  }
}

/**
 * 时刻格 → ISO 串(pg 的 timestamptz 交回 Date;老驱动或测试桩可能给串;空折空串)。
 *
 * @param x 库回的时刻格。
 * @returns ISO 串。
 */
function isoOf(x: TimeCell): string {
  if (x == null) {
    return TIME_NONE
  }
  if (x instanceof Date) {
    return x.toISOString()
  }
  return x
}

/**
 * 简历原件库行 → 原件(base64 解回字节)。
 *
 * @param r 库行。
 * @returns 原件。
 */
export function toResumeBlob(r: ResumeBlobDbRow): ResumeBlob {
  return { fileName: text(r.file_name), mime: text(r.mime), bytes: new Uint8Array(Buffer.from(text(r.file_b64), B64)) }
}

/**
 * 计数库行 → 份数。
 *
 * @param r 库行。
 * @returns 份数。
 */
export function toCount(r: CountDbRow): number {
  return count(r.n)
}

/**
 * 写入回行 → id 与是否默认。
 *
 * @param r 库行。
 * @returns 洗净的回行。
 */
export function toResumeId(r: ResumeIdDbRow): ResumeIdFact {
  return { id: count(r.id), isDefault: r.is_default === true }
}

/**
 * 本人的简历清单(默认那份在最前);没传过给空清单。
 *
 * @param x 数据库连接与用户 id。
 * @returns 清单。
 */
export async function loadResumeList(x: ResumeUserIn): ResumeListOut {
  return queryRows({ db: x.db, sql: SQL.RESUME_FILE_LIST, params: [x.userId], map: toResumeFileMeta })
}

/**
 * 本人有几份简历。
 *
 * @param x 数据库连接与用户 id。
 * @returns 份数。
 */
export async function loadResumeCount(x: ResumeUserIn): ResumeCountOut {
  const row = firstOf(await queryRows({ db: x.db, sql: SQL.RESUME_FILE_COUNT, params: [x.userId], map: toCount }))
  if (row == null) {
    return 0
  }
  return row
}

/**
 * 本人某一份的原件;没有(或不是本人的)给 null。
 *
 * @param x 连接、用户 id 与简历 id。
 * @returns 原件或 null。
 */
export async function loadResumeBlob(x: ResumeOneIn): ResumeBlobOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.RESUME_FILE_GET, params: [x.userId, x.id], map: toResumeBlob }))
}

/**
 * 新加一份(这个人第一份自动成默认),或原地替换某一份(默认与否不变)。上传时刻在这里取一次。
 * 2026-11-11 Frank「只留一份上传的吧」:没指明替换哪一份而本人已经有基础简历的,替换那一份 —— 上传和生成简历都走这里,
 * 所以一个人不会再多出第二份。
 *
 * @param x 连接、用户 id、替换哪一份与已判过类型的原件。
 * @returns 写好的元信息;替换的那一份不是本人的给 null。
 */
export async function saveResumeFile(x: ResumeSaveIn): ResumeSaveOut {
  const uploadedAt = new Date().toISOString()
  let rows: ResumeIdFact[] = []
  let replaceId = x.replaceId
  if (replaceId == null) {
    const base = firstOf(await queryRows({ db: x.db, sql: SQL.RESUME_FILE_BASE_ID, params: [x.userId], map: toResumeId }))
    if (base != null) {
      replaceId = base.id
    }
  }
  if (replaceId == null) {
    rows = await queryRows({
      db: x.db, sql: SQL.RESUME_FILE_INSERT, params: [x.userId, x.b64, x.fileName, x.mime, x.sizeBytes, uploadedAt],
      map: toResumeId,
    })
  } else {
    rows = await queryRows({
      db: x.db, sql: SQL.RESUME_FILE_REPLACE,
      params: [x.userId, replaceId, x.b64, x.fileName, x.mime, x.sizeBytes, uploadedAt], map: toResumeId,
    })
  }
  const row = firstOf(rows)
  if (row == null) {
    return null
  }
  return { id: row.id, isDefault: row.isDefault, fileName: x.fileName, mime: x.mime, sizeBytes: x.sizeBytes, uploadedAt }
}

/**
 * 删本人某一份(没有也不报错);删的是默认那份就把最新的一份补成默认。
 *
 * @param x 连接、用户 id 与简历 id。
 * @returns 无。
 */
export async function deleteResumeFile(x: ResumeOneIn): ResumeDeleteOut {
  await x.db.query(SQL.RESUME_FILE_DELETE, [x.userId, x.id])
  await x.db.query(SQL.RESUME_FILE_PROMOTE, [x.userId])
}

/**
 * 查询参数里的简历 id:正整数才认,其余(缺席、乱填)给 null。
 *
 * @param url 请求地址。
 * @returns 简历 id 或 null。
 */
export function resumeIdOf(url: string): MaybeResumeId {
  const n = Number(new URL(url).searchParams.get(P_ID))
  if (Number.isInteger(n) && n > 0) {
    return n
  }
  return null
}

/**
 * 按文件头判简历类型(审查 #17:只看扩展名会放进改了后缀的任意文件)。
 * PDF 认文件头就够;.docx 是 zip 包,zip 文件头还得配 .docx 扩展名(xlsx、普通 zip 文件头一样)。
 *
 * @param x 文件名与文件头。
 * @returns MIME;不收给 null。
 */
export function fileMimeOf(x: FileMimeIn): MaybeMime {
  if (x.head.startsWith(PDF_MAGIC)) {
    return MIME_PDF
  }
  const name = x.name.trim()
  const ext = name.slice(name.lastIndexOf(EXT_SEP) + 1).toLowerCase()
  if (x.head.startsWith(DOCX_MAGIC) && ext === EXT_DOCX) {
    return MIME_DOCX
  }
  return null
}

/**
 * 入库的文件名:去首尾空白、截到入库上限;浏览器没给名字就按类型补一个(下载时才有扩展名)。
 *
 * @param x 浏览器交来的文件名与 MIME。
 * @returns 文件名。
 */
export function fileNameOf(x: FileNameIn): string {
  const name = x.name.trim().slice(0, FILE_NAME_MAX)
  if (name !== FILE_NAME_NONE) {
    return name
  }
  if (x.mime === MIME_PDF) {
    return FILE_NAME_PDF
  }
  return FILE_NAME_DOCX
}

/**
 * 取原件响应的处置头:打开或下载 + 百分号编码的文件名(中文名照样对)。
 *
 * @param x 文件名与是否下载。
 * @returns Content-Disposition 头值。
 */
export function dispositionOf(x: DispositionIn): string {
  let kind = DISP_INLINE
  if (x.download) {
    kind = DISP_ATTACH
  }
  return kind + DISP_NAME_HEAD + encodeURIComponent(x.fileName)
}
