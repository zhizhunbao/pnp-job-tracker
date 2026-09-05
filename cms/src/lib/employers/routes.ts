/**
 * 雇主域的 HTTP 芯(第十一抽屉):/api/employers(名录懒取)、/api/employers/sponsors
 * (橱窗三分表)、/api/employers/export(付费 CSV 导出)、/api/employers/info(公司懒探索)。
 * 懒取与三分表挂了回空表保底,前端继续用 SSR 那一页,绝不 500(#313 拆运输方式那批的红线)。
 * employersInfoRoute 体内 `await req.json() as InfoBody` 是跨边界断言:网络来的 body
 * 先按声明形状收下,逐格判后才用。
 *
 * @author Frank
 * @time 2026-08-23 05:10:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { employerVerdict } from '../ruling/server'
import { textResponseOf,
  BAD_GATEWAY, BAD_REQUEST, HDR_CACHE_CONTROL, HDR_CONTENT_DISPOSITION, HDR_CONTENT_TYPE, NO_CONTENT,
  NOT_FOUND, PAYMENT_REQUIRED, TOO_MANY, UNAVAILABLE,
} from '../http'
import {
  E_BAD_REQUEST, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, friendLlmReady,
  TRANS_KEY_SEP, TRANS_LANGS, TRANSLATE_ROUTE_TIMEOUT_MS, translateReady, translateSectioned,
} from '../llm'
import { denyBodyOf, checkLimit, freeGate, getUser, getUserOrNull, ipOf, isPro } from '../quota/server'
import {
  CACHE_TTL_MS, CITY_LEN_MAX, CO_IP_DAILY, CO_LIMIT_PREFIX, CO_MARKS_RE, CSV_CACHE_CONTROL, CSV_CONTENT_TYPE, CSV_DISPOSITION, E_PRO, EMP_CACHE_CONTROL,
  EMP_PAGE_SIZE, EXPORT_PROVS, EXPORT_Q_LEN_MAX, MODE, NAME_LEN_MAX, NOC5_RE, PAGE_SIZE_MAX, PARAM, SORT_OPEN,
  SORT_SKILLED, SPONSORS_CACHE_CONTROL, VIEW,
  FETCHED_NONE, FILTER_UNSET, LANG_UNSET, NAME_UNSET, WD_LANG_ZH,
} from './constants'
import {
  applySponsorFilters, buildSponsorBoards, companyRow, loadSponsorEmployers, investigateCompany,
  loadCompanyBrief, loadCompanyBriefZh, loadEmployerPage, normalizeEmployerFilters, saveCompanyBriefZh, sponsorCsvOf,
} from './functions'
import { CACHE } from './variables'
import type { EmployersTransBody, InfoBody, SponsorFilters } from './types'

/**
 * GET /api/employers:雇主板懒取(2026-08-16,雇主页照职位板重做那批)。
 * #313 同款拆法:名录 6,680 行不进 SSR/RSC payload —— SSR 只带第一页 + total,
 * 换筛选/翻页由前端打本端点。筛选/分页口径全在 normalizeEmployerFilters(单一来源,不 fork)。
 * noc 口径红线:名录没写职业的行照常保留(空 = 官方没列清单,不是「不招这个职业」)。
 *
 * @param req 请求(mode/program/prov/city/noc/q/page/pageSize)。
 * @returns 一页名录 json;查挂回空表(total 0)。
 */
export async function employersRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const f = normalizeEmployerFilters({
    get: function get(k: string) {
      return sp.get(k)
    },
    defMode: MODE.designated,
  })
  let pageSize = EMP_PAGE_SIZE
  const sizeRaw = Number(sp.get(PARAM.pageSize))
  if (Number.isFinite(sizeRaw) && sizeRaw > 0) {
    pageSize = Math.min(Math.floor(sizeRaw), PAGE_SIZE_MAX)
  }
  try {
    const data = await loadEmployerPage({ db: await getDb(), filters: f, pageSize: pageSize })
    return Response.json(data, { headers: { [HDR_CACHE_CONTROL]: EMP_CACHE_CONTROL } })
  } catch {
    return Response.json({
      mode: f.mode, rows: [], total: 0, page: f.page, pageSize: pageSize,
      facets: { provs: [], programs: [], cities: [], nocs: [] }, fetched: FETCHED_NONE, nocTitles: {},
    })
  }
}

/**
 * GET /api/employers/sponsors:把脉页(/start)橱窗三分表(lmia/named/aip)全量。
 * #313(LCP 7.15s 真因):三表 16,430 行全量序列化进 /start 的 RSC payload,SSR 文档
 * 6.92MB —— 拆法照 /api/stats/market:SSR 只带每表前 SE_SSR_ROWS 行 + total,
 * 全量改挂载后后台拉。进程内 10 分钟缓存(CACHE.boards)+ 浏览器侧 5 分钟 + SWR;
 * loadSponsorEmployers 自带进程缓存 + in-flight 去重,聚合不站在请求路径上排队。
 *
 * @param _req 请求(不读参数)。
 * @returns 三分表 json;查挂回三张空表。
 */
export async function employersSponsorsRoute(_req: Request): Promise<Response> {
  if (CACHE.boards == null || Date.now() - CACHE.boards.ts >= CACHE_TTL_MS) {
    try {
      const rows = await loadSponsorEmployers({ db: await getDb(), judge: employerVerdict })
      CACHE.boards = { v: buildSponsorBoards(rows), ts: Date.now() }
    } catch {
      const empty = { top: [], total: 0 }
      return Response.json({ lmia: empty, named: empty, aip: empty })
    }
  }
  return Response.json(CACHE.boards.v, { headers: { [HDR_CACHE_CONTROL]: SPONSORS_CACHE_CONTROL } })
}

/**
 * GET /api/employers/export:B3 担保雇主名单导出(docs/implementation/在招担保雇主/03_B3)。
 * 付费层 = 按当前筛选出全量 CSV:浏览/筛选在 /employers 免费,成文件带走的名单是付费交付物。
 *
 * @param req 请求(f/prov/city/noc/q/sort 六个筛选参数)。
 * @returns CSV 附件;非 Pro 402。
 */
export async function employersExportRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null || isPro(user) === false) {
    return Response.json({ error: E_PRO }, { status: PAYMENT_REQUIRED })
  }
  const sp = new URL(req.url).searchParams
  let f: SponsorFilters['f'] = FILTER_UNSET
  const fRaw = paramOf(sp, PARAM.f)
  if (fRaw === VIEW.aip || fRaw === VIEW.lmia || fRaw === VIEW.named) {
    f = fRaw
  }
  let prov = FILTER_UNSET
  const provRaw = paramOf(sp, PARAM.prov).toUpperCase()
  if (EXPORT_PROVS.includes(provRaw)) {
    prov = provRaw
  }
  let noc = FILTER_UNSET
  const nocRaw = paramOf(sp, PARAM.noc)
  if (NOC5_RE.test(nocRaw)) {
    noc = nocRaw
  }
  let sort: SponsorFilters['sort'] = SORT_OPEN
  if (paramOf(sp, PARAM.sort) === SORT_SKILLED) {
    sort = SORT_SKILLED
  }
  const filters: SponsorFilters = {
    f: f, prov: prov, city: paramOf(sp, PARAM.city).slice(0, CITY_LEN_MAX),
    noc: noc, q: paramOf(sp, PARAM.q).slice(0, EXPORT_Q_LEN_MAX), sort: sort,
  }
  const rows = applySponsorFilters({ rows: await loadSponsorEmployers({ db: await getDb(), judge: employerVerdict }), filters: filters })
  return new Response(sponsorCsvOf(rows), {
    headers: {
      [HDR_CONTENT_TYPE]: CSV_CONTENT_TYPE,
      [HDR_CONTENT_DISPOSITION]: CSV_DISPOSITION,
      [HDR_CACHE_CONTROL]: CSV_CACHE_CONTROL,
    },
  })
}

/**
 * POST /api/employers/info {name}:公司信息懒探索(K,2026-07-19 Frank 批「点开没链接
 * AI 现去查」)。命中 companies.ai_brief 直接回;缺则 friendChat + web_search 联网调查 →
 * 存 ai_* 四列 = 永久缓存。一家公司全站只查一次(#107 与顾问公司初判共享)。
 * 红线:出处列表随答案返回;查不到如实回空;掉线静默 204。
 * 调查并入统一免费池(第25轮打码批;缓存命中不计费)。
 *
 * @param req 请求(body 是 { name })。
 * @returns 公司信息 json;掉线/查无 204、名字非法 400、超额由 freeGate 裁决。
 */
export async function employersInfoRoute(req: Request): Promise<Response> {
  if (friendLlmReady() === false) {
    return new Response(null, { status: NO_CONTENT })
  }
  let name = NAME_UNSET
  try {
    const body = await req.json() as InfoBody
    if (typeof body.name === 'string') {
      name = body.name.trim()
    }
  } catch {
    name = NAME_UNSET
  }
  if (name === '' || name.length > NAME_LEN_MAX) {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const row = await companyRow({ db: db, name: name })
  if (row == null) {
    return new Response(null, { status: NO_CONTENT })
  }
  if (row.cached != null) {
    return Response.json(row.cached)
  }
  const g = freeGate({ user: await getUser(req.headers), headers: req.headers })
  const deny = denyBodyOf(g)
  if (deny != null) {
    return textResponseOf(deny)
  }
  const out = await investigateCompany({ db: db, id: row.id, name: name })
  if (out == null) {
    return new Response(null, { status: NO_CONTENT })
  }
  return Response.json(out)
}

/**
 * 查询参数取值:缺位空串,取到去首尾空白(导出端点六个参数同款取洗)。
 *
 * @param sp 查询参数集。
 * @param key 参数名。
 * @returns 洗过的值;缺位空串。
 */
// eslint-disable-next-line local/routes-shape -- 参数取值小件(URLSearchParams+键名两参是 Web API 形状),非 HTTP 芯本体
function paramOf(sp: URLSearchParams, key: string): string {
  const v = sp.get(key)
  if (v == null) {
    return FILTER_UNSET
  }
  return v.trim()
}

/**
 * POST /api/employers/translate {name, lang}:公司 AI 检索简介懒翻译(公司弹框「显示中文对照」)。
 * 只翻库内 companies.ai_brief(五节标记);节标记与 (not stated) 原样保留,输出与原文
 * 行结构完全一致 —— 前端按节配对,英文下显中文(#185)。进程缓存 name+lang(全量翻齐才进)。
 *
 * @param req 请求(body 是 { name, lang })。
 * @returns { ok, text, cached };未配置 503、参数非法 400、查无 404、超限 429、翻挂 502。
 */
export async function employersTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let name = NAME_UNSET
  let lang = LANG_UNSET
  try {
    const b = await req.json() as EmployersTransBody
    if (typeof b.name === 'string') {
      name = b.name.trim()
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    name = NAME_UNSET
  }
  if (name === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = name.toLowerCase() + TRANS_KEY_SEP + lang
  const hit = CACHE.briefTransBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, text: hit, cached: true })
  }
  const db = await getDb()
  if (lang === WD_LANG_ZH) {
    const stored = await loadCompanyBriefZh({ db: db, name: name })
    if (stored != null) {
      CACHE.briefTransBy.set(ck, stored)
      return Response.json({ ok: true, text: stored, cached: true })
    }
  }
  const brief = await loadCompanyBrief({ db: db, name: name })
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
      CACHE.briefTransBy.set(ck, r.text)
      if (lang === WD_LANG_ZH) {
        await saveCompanyBriefZh({ db: db, name: name, text: r.text })
      }
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

