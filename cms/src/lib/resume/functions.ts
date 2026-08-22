/**
 * 简历域的行为:取字(上传文件 → 纯文本)与对照(简历 × JD 的逐条对照)。
 * AI 进两头不进中间:JD/简历的自由文本理解交给 LLM(completeText),
 * 免费/付费怎么裁、JSON 怎么收口、prompt 怎么组装,全在这里(可单测,不碰网络)。
 * 不落盘不入库(E11-07 首用,G3 上传复用)。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

import { fill } from '../template'
import { log, RESUME_LOG } from '../log'
import {
  CLAMP, ERR_SLICE, ERR_UNSUPPORTED, EXT_DOCX, EXT_PDF, EXT_SEP, FREE_ROWS, ROLE_SYSTEM, ROLE_USER,
} from './constants'
import { MATCH_REWRITE, MATCH_SYSTEM, MATCH_USER } from './prompts'
import { outLangOf } from './rows'
import type {
  CaughtError, ExtractIn, ExtractOut, Gated, GateMatchIn, MatchMessages, MatchPromptIn, MatchRows,
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
      // eslint-disable-next-line local/no-bare-strings -- 模块说明符必须是字面量:打包器(Turbopack/webpack)静态分析靠它,变量化会断依赖追踪
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(input.buf) })
      try {
        const got = await parser.getText()
        return { text: got.text, err: '' }
      } finally {
        await parser.destroy().catch(ignoreDestroyFailure)
      }
    }
    if (ext === EXT_DOCX) {
      // eslint-disable-next-line local/no-bare-strings -- 同上:动态 import 的说明符必须是字面量
      const mod = await import('mammoth')
      const got = await mod.default.extractRawText({ buffer: input.buf })
      return { text: got.value, err: '' }
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
  let rewrite = ''
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
