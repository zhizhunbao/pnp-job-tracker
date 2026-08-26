/**
 * 简历域的行为:取字(上传文件 → 纯文本)与对照(简历 × JD 的逐条对照)。
 * AI 进两头不进中间:JD/简历的自由文本理解交给 LLM(completeText),
 * 免费/付费怎么裁、JSON 怎么收口、prompt 怎么组装,全在这里(可单测,不碰网络)。
 * 不落盘不入库(E11-07 首用,G3 上传复用)。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

import { queryRows, SQL, text } from '../db'
import { fill } from '../template'
import { log, RESUME_LOG } from '../log'
import {
  CLAMP, ERR_SLICE, ERR_UNSUPPORTED, EXT_DOCX, EXT_PDF, EXT_SEP, FREE_ROWS, IELTS_CLB, NOC_CAND_MAX, ROLE_SYSTEM,
  ROLE_USER, BRACE_CLOSE, BRACE_OPEN, NOTE_MAX, REQ_MAX, ROWS_MAX, ROWS_MIN, ERR_NONE, REWRITE_NONE,
  TITLE_PENDING,
} from './constants'
import { MATCH_REWRITE, MATCH_SYSTEM, MATCH_USER, OUT_LANG, OUT_LANG_DEFAULT } from './prompts'
import type {
  CaughtError, ExtractIn, ExtractOut, GateMatchIn, Gated, MatchMessages, MatchPromptIn, MatchRows,
  MaybeIelts, MaybeNum, NocCandidate, NocCandidatesIn, NocCandidatesOut, JsonObj, MaybeMatchRows, NocSimDbRow,
  NocTitleDbRow, NocTitleRow, ParsedJson,
} from './types'

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
        if (Array.isArray(init) && init.length === 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init
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
        this.data = new Uint8ClampedArray(w * h * 4)
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
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;体内只许词汇表 + 纯拼装)
// =========================================================================

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
 * 一行 NOC 官方名（SQL.NOC_TITLES_BY_CODES；多出的三语列不消费）。
 *
 * @param r 库里的一行。
 * @returns 码 + 英文名。
 */
export function toNocTitleRow(r: NocTitleDbRow): NocTitleRow {
  return { noc: text(r.noc), title: text(r.title) }
}
