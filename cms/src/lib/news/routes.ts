/**
 * 新闻域的 HTTP 芯（第十一抽屉）：/api/news/translate（正文懒翻译）与
 * /api/news/summarize（AI 速读）。翻译/速读的行为借 llm 基建叶
 * （translateParasStrict / summarizeNews），存取在本域 functions。
 * 每个 handler 的 `await req.json() as NewsTransBody` 是跨边界断言：
 * 网络 body 先按声明形状收下，逐格判后才用。
 *
 * @author Frank
 * @time 2026-08-23 12:40:00
 */
import { getDb } from '../db/server'
import { BAD_GATEWAY, BAD_REQUEST, NOT_FOUND, TOO_MANY, UNAVAILABLE } from '../http'
import {
  E_BAD_REQUEST, E_COL_NOT_READY, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, E_TRANSLATE_NOT_CONFIGURED,
  SUM_LANGS, summarizeNews, TRANS_LANGS, TRANSLATE_ROUTE_TIMEOUT_MS, translateParasStrict, translateReady,
} from '../llm'
import { checkLimit, ipOf } from '../quota/server'
import { E_EMPTY_SUMMARY, E_PARA_ALIGN, NSUM_IP_DAILY, NSUM_LIMIT_PREFIX, NTR_IP_DAILY, NTR_LIMIT_PREFIX } from './constants'
import { loadNewsForSummary, loadNewsForTranslate, saveNewsSummary, saveNewsTranslation } from './functions'
import type { NewsSummaryRow, NewsTransBody } from './types'

/**
 * POST /api/news/summarize {slug, lang}:新闻 AI 速读按需生成(E12-06 P1f)。
 * 命中 DB 缓存(summary_zh/ko/en)直接回;缺则定向语言无联网生成 → 写回 = 永久缓存。
 * summary_en 列未建(DDL4 未跑)时英文速读暂不可用 503,不炸 500。
 *
 * @param req 请求(body 是 { slug, lang })。
 * @returns { ok, summary, cached };生成太短/没给 502(E_EMPTY_SUMMARY)。
 */
export async function newsSummarizeRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let slug = ''
  let lang = ''
  try {
    const b = await req.json() as NewsTransBody
    if (typeof b.slug === 'string') {
      slug = b.slug
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    slug = ''
  }
  if (slug === '' || SUM_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  let row: NewsSummaryRow | null = null
  try {
    row = await loadNewsForSummary({ db: db, slug: slug, lang: lang })
  } catch {
    return Response.json({ ok: false, error: E_COL_NOT_READY }, { status: UNAVAILABLE })
  }
  if (row == null || row.en == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (row.cached != null) {
    return Response.json({ ok: true, summary: row.cached, cached: true })
  }
  if (checkLimit([[NSUM_LIMIT_PREFIX + ipOf(req), NSUM_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  const summary = await summarizeNews({ title: row.title, en: row.en, lang: lang })
  if (summary == null) {
    return Response.json({ ok: false, error: E_EMPTY_SUMMARY }, { status: BAD_GATEWAY })
  }
  await saveNewsSummary({ db: db, slug: slug, lang: lang, summary: summary })
  return Response.json({ ok: true, summary: summary, cached: false })
}

/**
 * POST /api/news/translate {slug, lang}:新闻正文懒翻译(E12-06 P1e,「线上实时」拍板)。
 * 命中 DB 缓存(body_zh/ko)直接回;缺则整段严格对位翻(缺一段整篇拒收不缓存 ——
 * 宁可失败不出错位页)→ 校验过写回 news 表 = 永久缓存(第二个读者秒开)。
 *
 * @param req 请求(body 是 { slug, lang })。
 * @returns { ok, body, cached };对位失败 502(E_PARA_ALIGN)。
 */
export async function newsTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_TRANSLATE_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let slug = ''
  let lang = ''
  try {
    const b = await req.json() as NewsTransBody
    if (typeof b.slug === 'string') {
      slug = b.slug
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    slug = ''
  }
  if (slug === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const row = await loadNewsForTranslate({ db: db, slug: slug, lang: lang })
  if (row == null || row.en == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (row.cached != null) {
    return Response.json({ ok: true, body: row.cached, cached: true })
  }
  if (checkLimit([[NTR_LIMIT_PREFIX + ipOf(req), NTR_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const body = await translateParasStrict({ text: row.en, lang: lang, signal: AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS) })
    if (body == null) {
      return Response.json({ ok: false, error: E_PARA_ALIGN }, { status: BAD_GATEWAY })
    }
    await saveNewsTranslation({ db: db, slug: slug, lang: lang, body: body })
    return Response.json({ ok: true, body: body, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}
