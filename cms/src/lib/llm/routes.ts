/**
 * 模型域的 HTTP 芯(第十一抽屉):四个懒翻译端点(co/jd/noc/news-translate)与新闻速读
 * (news-summarize)。共同防线:只翻/只读库内内容(不收任意文本,防开放代理)、IP 日限
 * (缓存命中不计)、env 未配置 503。取数借 jobs/employers 的 server 门;翻译与速读的
 * 行为全在本域 functions。每个 handler 的 `await req.json() as TransBody` 是跨边界断言:
 * 网络 body 先按声明形状收下,逐格判后才用。
 *
 * @author Frank
 * @time 2026-08-23 09:40:00
 */
import { getDb } from '../db/server'
import { loadCompanyBrief } from '../employers/server'
import { BAD_GATEWAY, BAD_REQUEST, NOT_FOUND, TOO_MANY, UNAVAILABLE } from '../http'
import { loadJdFormatted, loadNewsForSummary, loadNewsForTranslate, loadNocDuties, saveNewsSummary, saveNewsTranslation } from '../jobs/server'
import { checkLimit, ipOf } from '../quota/server'
import {
  CO_IP_DAILY, CO_LIMIT_PREFIX, CO_MARKS_RE, E_BAD_REQUEST, E_COL_NOT_READY, E_EMPTY_SUMMARY, E_NOT_CONFIGURED,
  E_NOT_FOUND, E_PARA_ALIGN, E_RATE_LIMITED, E_TRANSLATE_NOT_CONFIGURED, JD_MARKS_RE, JDTR_IP_DAILY,
  JDTR_LIMIT_PREFIX, NOCTR_IP_DAILY, NOCTR_LIMIT_PREFIX, NSUM_IP_DAILY, NSUM_LIMIT_PREFIX, NTR_IP_DAILY,
  NTR_LIMIT_PREFIX, SUM_LANGS, TRANS_KEY_SEP, TRANS_LANGS, TRANSLATE_ROUTE_TIMEOUT_MS,
} from './constants'
import { summarizeNews, translateParasStrict, translatePlainLines, translateReady, translateSectioned } from './functions'
import { CACHE } from './variables'
import type { NewsSummaryRow } from '../jobs/server'
import type { TransBody } from './types'

/**
 * POST /api/co-translate {name, lang}:公司 AI 检索简介懒翻译(公司弹框「显示中文对照」)。
 * 只翻库内 companies.ai_brief(五节标记);节标记与 (not stated) 原样保留,输出与原文
 * 行结构完全一致 —— 前端按节配对,英文下显中文(#185)。进程缓存 name+lang(全量翻齐才进)。
 *
 * @param req 请求(body 是 { name, lang })。
 * @returns { ok, text, cached };未配置 503、参数非法 400、查无 404、超限 429、翻挂 502。
 */
export async function coTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let name = ''
  let lang = ''
  try {
    const b = await req.json() as TransBody
    if (typeof b.name === 'string') {
      name = b.name.trim()
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    name = ''
  }
  if (name === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = name.toLowerCase() + TRANS_KEY_SEP + lang
  const hit = CACHE.coBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, text: hit, cached: true })
  }
  const brief = await loadCompanyBrief({ db: await getDb(), name: name })
  if (brief == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (checkLimit([[CO_LIMIT_PREFIX + ipOf(req), CO_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const r = await translateSectioned({
      text: brief, lang: lang, signal: AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS),
      marks: CO_MARKS_RE, bullets: false,
    })
    if (r.full) {
      CACHE.coBy.set(ck, r.text)
    }
    return Response.json({ ok: true, text: r.text, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}

/**
 * POST /api/jd-translate {url, lang}:JD 五节整理版懒翻译(职位弹框「显示中文对照」)。
 * 只翻库内 jobs.jd_formatted(整理版就绪才可翻);标记可与正文同行(#180 教训),
 * 「- 」子弹前缀剥下保管只翻正文。进程缓存 url+lang(全量翻齐才进;部分翻齐下次点重试补齐)。
 *
 * @param req 请求(body 是 { url, lang })。
 * @returns { ok, text, cached };状态码同 co-translate。
 */
export async function jdTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let url = ''
  let lang = ''
  try {
    const b = await req.json() as TransBody
    if (typeof b.url === 'string') {
      url = b.url.trim()
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    url = ''
  }
  if (url === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = url + TRANS_KEY_SEP + lang
  const hit = CACHE.jdBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, text: hit, cached: true })
  }
  const fmt = await loadJdFormatted({ db: await getDb(), url: url })
  if (fmt == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (checkLimit([[JDTR_LIMIT_PREFIX + ipOf(req), JDTR_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const r = await translateSectioned({
      text: fmt, lang: lang, signal: AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS),
      marks: JD_MARKS_RE, bullets: true,
    })
    if (r.full) {
      CACHE.jdBy.set(ck, r.text)
    }
    return Response.json({ ok: true, text: r.text, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}

/**
 * POST /api/noc-translate {noc, lang}:NOC 官方职责/任职要求懒翻译(分类弹框)。
 * 数据层只存英文(单语),这里按需逐行对位翻;一个 NOC 全站翻一次(进程缓存,重启按需重暖)
 * —— 刻意不动 DB schema(不碰生产列)。
 *
 * @param req 请求(body 是 { noc, lang })。
 * @returns { ok, duties, requirements, cached };状态码同 co-translate。
 */
export async function nocTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let noc = ''
  let lang = ''
  try {
    const b = await req.json() as TransBody
    if (typeof b.noc === 'string') {
      noc = b.noc
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    noc = ''
  }
  if (noc === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = noc + TRANS_KEY_SEP + lang
  const hit = CACHE.nocBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, duties: hit.duties, requirements: hit.requirements, cached: true })
  }
  const row = await loadNocDuties({ db: await getDb(), noc: noc })
  if (row == null || (row.duties === '' && row.requirements === '')) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (checkLimit([[NOCTR_LIMIT_PREFIX + ipOf(req), NOCTR_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const signal = AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS)
    let duties = { text: '', full: true }
    if (row.duties !== '') {
      duties = await translatePlainLines({ text: row.duties, lang: lang, signal: signal })
    }
    let requirements = { text: '', full: true }
    if (row.requirements !== '') {
      requirements = await translatePlainLines({ text: row.requirements, lang: lang, signal: signal })
    }
    if (duties.full && requirements.full) {
      CACHE.nocBy.set(ck, { duties: duties.text, requirements: requirements.text })
    }
    return Response.json({ ok: true, duties: duties.text, requirements: requirements.text, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}

/**
 * POST /api/news-translate {slug, lang}:新闻正文懒翻译(E12-06 P1e,「线上实时」拍板)。
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
    const b = await req.json() as TransBody
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

/**
 * POST /api/news-summarize {slug, lang}:新闻 AI 速读按需生成(E12-06 P1f)。
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
    const b = await req.json() as TransBody
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
