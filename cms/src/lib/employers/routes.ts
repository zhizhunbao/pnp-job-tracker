/**
 * 雇主域的 HTTP 芯(第十一抽屉):/api/employers(雇主板懒取,2026-09-13 起读雇主池)、/api/employers/sponsors
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
import { EMP_LOG, log } from '../log'
import { employerVerdict } from '../ruling/server'
import { textResponseOf,
  BAD_GATEWAY, BAD_REQUEST, HDR_CACHE_CONTROL, HDR_CONTENT_DISPOSITION, HDR_CONTENT_TYPE, NO_CONTENT,
  NOT_FOUND, PAYMENT_REQUIRED, TOO_MANY, UNAVAILABLE, FORBIDDEN, HDR_SEED_TOKEN, TEXT_UNAUTHORIZED, UNAUTHORIZED,
} from '../http'
import {
  E_BAD_REQUEST, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, friendLlmReady,
  TRANS_KEY_SEP, TRANS_LANGS, TRANSLATE_ROUTE_TIMEOUT_MS, translatePlainLines, translateReady, translateSectioned,
  translationOk,
} from '../llm'
import { denyBodyOf, checkLimit, freeGate, getUser, getUserOrNull, ipOf, isPro, isAdmin,
} from '../quota/server'
import {
  CACHE_TTL_MS, CITY_LEN_MAX, CO_IP_DAILY, CO_LIMIT_PREFIX, CO_MARKS_RE, CSV_CACHE_CONTROL, CSV_CONTENT_TYPE,
  CSV_DISPOSITION, E_PRO, EMP_CACHE_CONTROL,
  EMP_PAGE_SIZE, EXPORT_PROVS, EXPORT_Q_LEN_MAX, HDR_HUMAN, HDR_UA, HUMAN_YES, NAME_LEN_MAX, NOC5_RE, UA_LOG_MAX, PAGE_SIZE_MAX, PARAM, SORT_OPEN,
  SORT_SKILLED, SPONSORS_CACHE_CONTROL, VIEW,
  FETCHED_NONE, FILTER_UNSET, LANG_UNSET, NAME_UNSET, WD_LANG_ZH, ALIAS_KEY_SEP, ALIAS_LIMIT_PREFIX, ALIAS_MAX_LEN,
  ALIAS_PREFIX, NEWLINE, DESC_KEY_TAIL,
  EXPLORE_KEY_LEN_MAX, EXPLORE_KEYS_MAX, EXPLORE_TAKE_DEFAULT, EXPLORE_TAKE_MAX, P_EXPLORE_LIMIT,
  P_SITE_KIND, SEEN_TAKE_MAX, SITE_KIND_FIND, SITE_TAKE_DEFAULT, SITE_TAKE_MAX,
} from './constants'
import {
  applySponsorFilters, buildSponsorBoards, companyRow, loadSponsorEmployers, investigateCompany,
  loadCompanyBrief, loadCompanyBriefZh, loadEmployerPage, normalizePoolFilters, saveCompanyBriefZh, sponsorCsvOf,
  aliasCellOf, loadCompanyAlias, saveCompanyAlias, loadCompanyDesc, loadCompanyDescZh, saveCompanyDescZh,
  resetCompanyTrans, enqueueExplore, loadExplorePending, loadPoolAliases, saveExploreResults,
  loadExploreSeen, loadSiteStage, loadSiteTodos, openExploreSite, saveSiteDone,
} from './functions'
import { CACHE } from './variables'
import type { EmployersTransBody, InfoBody, SponsorFilters, EmployersAliasBody, EmployersRetransBody,
  ExploreDoneBody, ExploreResultJson, ExploreSeenBody, PoolAliasesBody, SiteDoneJson, SiteOpenBody,
} from './types'

/**
 * GET /api/employers:雇主板懒取(2026-08-16 立;2026-09-13 雇主板批二改读雇主池)。
 * #313 同款拆法:SSR 只带第一页 + total,换筛选/翻页/换排序由前端打本端点。
 * 筛选/分页口径全在 normalizePoolFilters(单一来源,不 fork);noc= 只在 SSR 门换算成组,本端点不认。
 *
 * @param req 请求(group/prov/entry/program/q/sort/page/pageSize)。
 * @returns 一页 json;查挂回空表(total 0)。
 */
export async function employersRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const f = normalizePoolFilters({
    get: function get(k: string) {
      return sp.get(k)
    },
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
    return Response.json({ rows: [], total: 0, page: f.page, pageSize: pageSize, provs: [], fetched: FETCHED_NONE })
  }
}

/**
 * POST /api/employers/explore:探索队列入队(2026-09-18 Frank「用户列出过哪些雇主,就自动从那个表里翻译,类似于处理消息」)。
 * 雇主板在中文 / 韩文界面下把「这一批列出来、还没进过队的雇主」的池主键报上来。公开端点:键只认池里真有的、
 * 一次最多 EXPLORE_KEYS_MAX 个,最坏情形是整池进队 —— 翻译走家里的本地模型,不花钱。写挂了不报错(enqueueExplore 自己留痕)。
 *
 * @param req 请求体 `{ keys: string[] }`。
 * @returns `{ ok, n }`。
 */
export async function employersExploreRoute(req: Request): Promise<Response> {
  let body: ExploreSeenBody = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, n: 0 }, { status: BAD_REQUEST })
  }
  const keys: string[] = []
  if (Array.isArray(body.keys)) {
    for (const k of body.keys) {
      if (typeof k === 'string' && k !== FILTER_UNSET && k.length <= EXPLORE_KEY_LEN_MAX && keys.includes(k) === false) {
        keys.push(k)
      }
      if (keys.length >= EXPLORE_KEYS_MAX) {
        break
      }
    }
  }
  await enqueueExplore({ db: await getDb(), keys })
  return Response.json({ ok: true, n: keys.length })
}

/**
 * POST /api/employers/aliases:一批雇主现在的译名(2026-09-19 Frank「我不想在刷新一下页面,才显示 中文灰字。我需要他自动显示」)。
 * 雇主板已经开着的那一页隔一会儿拿「还没灰字的那几行」的池主键来问,回来只补那一格。公开端点:键的洗法与入队同一套
 * (限长、去重、一次最多 EXPLORE_KEYS_MAX 个);只读一条带主键数组的查询,不缓存。
 *
 * @param req 请求体 `{ keys: string[] }`。
 * @returns `{ ok, rows }`。
 */
export async function employersAliasesRoute(req: Request): Promise<Response> {
  let body: PoolAliasesBody = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, rows: [] }, { status: BAD_REQUEST })
  }
  const keys: string[] = []
  if (Array.isArray(body.keys)) {
    for (const k of body.keys) {
      if (typeof k === 'string' && k !== FILTER_UNSET && k.length <= EXPLORE_KEY_LEN_MAX && keys.includes(k) === false) {
        keys.push(k)
      }
      if (keys.length >= EXPLORE_KEYS_MAX) {
        break
      }
    }
  }
  const rows = await loadPoolAliases({ db: await getDb(), keys })
  return Response.json({ ok: true, rows })
}

/**
 * GET /api/employers/explore/todo:后台工人取活(待办清单;带 x-seed-token 才给,与上传 / 灌库同一把钥匙)。
 *
 * @param req 请求(limit=条数)。
 * @returns `{ todos: [{ key, name }] }`。
 */
export async function employersExploreTodoRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  let limit = EXPLORE_TAKE_DEFAULT
  const raw = Number(new URL(req.url).searchParams.get(P_EXPLORE_LIMIT))
  if (Number.isFinite(raw) && raw > 0) {
    limit = Math.min(Math.floor(raw), EXPLORE_TAKE_MAX)
  }
  const todos = await loadExplorePending({ db: await getDb(), limit })
  return Response.json({ todos })
}

/**
 * POST /api/employers/explore/done:后台工人交活(带 x-seed-token;结果逐条写回队列表,板上的页缓存随之清掉)。
 *
 * @param req 请求体 `{ results: [{ key, status, aliasZh, aliasKo, note }] }`。
 * @returns `{ ok, n }`。
 */
export async function employersExploreDoneRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  let body: ExploreDoneBody = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, n: 0 }, { status: BAD_REQUEST })
  }
  let results: ExploreResultJson[] = []
  if (Array.isArray(body.results)) {
    results = body.results
  }
  const n = await saveExploreResults({ db: await getDb(), results })
  return Response.json({ ok: true, n })
}

/**
 * POST /api/employers/explore/open:公司页 / 公司弹框被真人点开 → 官网那条工种入队(2026-09-20 Frank「下一个 session 做
 *『按用户点开过的公司优先抓取和纠错』的队列」;设计稿 docs/design/点开优先抓取与纠错-20260920.md)。公开端点,**只认带真人标记的**
 * (HDR_HUMAN;无头爬虫顺站点地图进来的不入队,来由见 HDR_HUMAN 的注);键只认池里真有的。
 *
 * @param req 请求体 `{ name }`。
 * @returns `{ ok, stage }`;没带真人标记 / 池里没有这家 = stage 空串。
 */
export async function employersExploreOpenRoute(req: Request): Promise<Response> {
  let body: SiteOpenBody = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, stage: NAME_UNSET }, { status: BAD_REQUEST })
  }
  let name = NAME_UNSET
  if (typeof body.name === 'string') {
    name = body.name.trim()
  }
  if (name === NAME_UNSET || name.length > NAME_LEN_MAX) {
    return Response.json({ ok: false, stage: NAME_UNSET }, { status: BAD_REQUEST })
  }
  if (req.headers.get(HDR_HUMAN) !== HUMAN_YES) {
    return Response.json({ ok: true, stage: NAME_UNSET })
  }
  const got = await openExploreSite({ db: await getDb(), name })
  return Response.json({ ok: true, stage: got.stage, ahead: got.ahead })
}

/**
 * GET /api/employers/explore/seen:被用户看过的公司清单(带 x-seed-token;数据层 explore 域每轮取一次落盘,sites / company 两域的例行轮拿它排队)。
 *
 * @param req 请求。
 * @returns `{ seen: [{ slug, seenCount, lastSeen, openedAt }] }`。
 */
export async function employersExploreSeenRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  const seen = await loadExploreSeen({ db: await getDb(), limit: SEEN_TAKE_MAX })
  return Response.json({ seen })
}

/**
 * POST /api/employers/explore/site-done:家里的工人每走一步写回进度,带了官网 / 总部 / 简介的同时写公司表(带 x-seed-token)。
 *
 * @param req 请求体 = 线格式的一步(SiteDoneJson)。
 * @returns `{ ok }`。
 */
export async function employersExploreSiteDoneRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  let body: SiteDoneJson = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  const ok = await saveSiteDone({ db: await getDb(), done: body })
  return Response.json({ ok })
}

/**
 * GET /api/employers/explore/site-todo:家里的工人取活(带 x-seed-token;kind=find 取找官网的活,其余取抓官网的活)。
 *
 * @param req 请求(kind=工种,limit=条数)。
 * @returns `{ todos: [{ key, slug, name, website, province, stage }] }`。
 */
export async function employersExploreSiteTodoRoute(req: Request): Promise<Response> {
  if (process.env.SEED_TOKEN == null || process.env.SEED_TOKEN === '' || req.headers.get(HDR_SEED_TOKEN) !== process.env.SEED_TOKEN) {
    return new Response(TEXT_UNAUTHORIZED, { status: UNAUTHORIZED })
  }
  const sp = new URL(req.url).searchParams
  let limit = SITE_TAKE_DEFAULT
  const raw = Number(sp.get(P_EXPLORE_LIMIT))
  if (Number.isFinite(raw) && raw > 0) {
    limit = Math.min(Math.floor(raw), SITE_TAKE_MAX)
  }
  const todos = await loadSiteTodos({ db: await getDb(), find: sp.get(P_SITE_KIND) === SITE_KIND_FIND, limit })
  return Response.json({ todos })
}

/**
 * POST /api/employers/explore/stage:公司卡问进度(公开只读;办到哪一步 + 公司表现在的官网与总部,办完那一拍卡上直接补)。
 * 公司名走请求体不走地址栏(雇保姆 / 护工的私人雇主,名字就是人名)。
 *
 * @param req 请求体 `{ name }`。
 * @returns `{ stage, website, hq, hqSource }`;查无 = 四格全空串。
 */
export async function employersExploreStageRoute(req: Request): Promise<Response> {
  let body: SiteOpenBody = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  let name = NAME_UNSET
  if (typeof body.name === 'string') {
    name = body.name.trim()
  }
  if (name === NAME_UNSET || name.length > NAME_LEN_MAX) {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  const row = await loadSiteStage({ db: await getDb(), name })
  if (row == null) {
    return Response.json({ stage: NAME_UNSET, website: NAME_UNSET, hq: NAME_UNSET, hqSource: NAME_UNSET })
  }
  return Response.json(row)
}

/**
 * GET /api/employers/sponsors:把脉页(/start)橱窗四分表(lmia/named/aip/pilot,pilot 2026-09-06 加)全量。
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
      return Response.json({ lmia: empty, named: empty, aip: empty, pilot: empty })
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
  const rows = applySponsorFilters({ rows: await loadSponsorEmployers({ db: await getDb(), judge: employerVerdict }),
    filters: filters })
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
 * 2026-09-19:没带「这一页有过真人动作」标记(HDR_HUMAN)的只给库里已有的,不联网现查(来由见 HDR_HUMAN 的注);真现查留一行带浏览器标识的痕。
 *
 * @param req 请求(body 是 { name })。
 * @returns 公司信息 json;掉线/查无 204、名字非法 400、超额由 freeGate 裁决。
 */
export async function employersInfoRoute(req: Request): Promise<Response> {
  if (friendLlmReady() === false) {
    return new Response(null, { status: NO_CONTENT })
  }
  let name = NAME_UNSET
  let storedOnly = false
  try {
    const body = await req.json() as InfoBody
    if (typeof body.name === 'string') {
      name = body.name.trim()
    }
    storedOnly = body.storedOnly === true
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
  if (req.headers.get(HDR_HUMAN) !== HUMAN_YES || storedOnly) {
    return new Response(null, { status: NO_CONTENT })
  }
  let ua = req.headers.get(HDR_UA)
  if (ua == null) {
    ua = NAME_UNSET
  }
  log({ tag: EMP_LOG.tag, text: `${EMP_LOG.researchBy}${name}${EMP_LOG.researchBySep}${ua.slice(0, UA_LOG_MAX)}` })
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
 * 2026-09-21 Frank「都修」(Konverge:官网版换掉了 AI 简介,中文对照还是旧简介的):缓存那一格连译自的原文一起存,
 * 先取库里现在的简介再认缓存,原文对不上就当没缓存(取库里存的 / 重翻)。原先只认公司名,简介换了照样回旧译文,直到重启。
 *
 * 2026-09-16 Frank「可以,就这样做」(公司弹框不再等翻译):body 带 storedOnly 只查缓存与库,没存回 404 不翻。
 * 2026-09-17 Frank「清库 + 加检查」:译文过 translationOk 写入闸(不等于原文、真有目标语种文字)才回给前端、才缓存落库;
 * 过不了回 404,页面只是少一行对照。库里存量的坏译文另由 docs/sql/company-brief-bad-translation-cleanup.sql 清。
 *
 * @param req 请求(body 是 { name, lang, storedOnly? })。
 * @returns { ok, text, cached };未配置 503、参数非法 400、查无 404、超限 429、翻挂 502。
 */
export async function employersTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let name = NAME_UNSET
  let lang = LANG_UNSET
  let storedOnly = false
  try {
    const b = await req.json() as EmployersTransBody
    if (typeof b.name === 'string') {
      name = b.name.trim()
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
    storedOnly = b.storedOnly === true
  } catch {
    name = NAME_UNSET
  }
  if (name === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = name.toLowerCase() + TRANS_KEY_SEP + lang
  const db = await getDb()
  const brief = await loadCompanyBrief({ db: db, name: name })
  if (brief == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  const hit = CACHE.briefTransBy.get(ck)
  if (hit != null && hit.src === brief) {
    return Response.json({ ok: true, text: hit.text, cached: true })
  }
  if (lang === WD_LANG_ZH) {
    const stored = await loadCompanyBriefZh({ db: db, name: name })
    if (stored != null) {
      CACHE.briefTransBy.set(ck, { src: brief, text: stored })
      return Response.json({ ok: true, text: stored, cached: true })
    }
  }
  if (storedOnly) {
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
    if (translationOk({ src: brief, out: r.text, lang: lang }) === false) {
      return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
    }
    if (r.full) {
      CACHE.briefTransBy.set(ck, { src: brief, text: r.text })
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


/**
 * 懒翻公司名(2026-09-14 Frank「公司名也做一个懒加载翻译」「这些相似雇主的中文名都加上懒加载翻译」):
 * 库里有别名直接给;没有就让翻译器把名字当一行译,译名落回 companies.alias_zh / alias_ko(只填空格),
 * 下次谁开都不再烧。译名超长(模型在解释)不落库、不返回。
 *
 * @param req 请求体 { name, lang }。
 * @returns { ok, alias, cached }。
 */
export async function employersAliasRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let name = NAME_UNSET
  let lang = LANG_UNSET
  try {
    const b = await req.json() as EmployersAliasBody
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
  const ck = name.toLowerCase() + ALIAS_KEY_SEP + lang
  const hit = CACHE.aliasBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, alias: hit, cached: true })
  }
  const db = await getDb()
  const stored = await loadCompanyAlias({ db: db, name: name })
  if (stored == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  const have = aliasCellOf({ fact: stored, lang: lang })
  if (have !== '') {
    CACHE.aliasBy.set(ck, have)
    return Response.json({ ok: true, alias: have, cached: true })
  }
  if (checkLimit([[ALIAS_LIMIT_PREFIX + ipOf(req), CO_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const r = await translatePlainLines({ text: ALIAS_PREFIX + name, lang: lang,
      signal: AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS) })
    const alias = r.text.split(NEWLINE)[0]
    if (alias == null || alias.trim().length > ALIAS_MAX_LEN || translationOk({ src: name, out: alias,
      lang: lang }) === false) {
      return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
    }
    const clean = alias.trim()
    CACHE.aliasBy.set(ck, clean)
    await saveCompanyAlias({ db: db, name: name, lang: lang, alias: clean })
    return Response.json({ ok: true, alias: clean, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}

/**
 * 官网简介懒翻(2026-09-14 Frank「这个也没加翻译」):companies.description 当纯文本译一遍,进程内缓存(键带 desc 尾巴,
 * 与同名 AI 简介分开)。
 * 2026-09-21 同 AI 简介那条(Frank「都修」):缓存那一格连原文一起存,官网简介换了就当没缓存。
 *
 * @param req 请求体 { name, lang }。
 * @returns { ok, text, cached }。
 */
export async function employersDescRoute(req: Request): Promise<Response> {
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
  const ck = name.toLowerCase() + TRANS_KEY_SEP + lang + DESC_KEY_TAIL
  const db = await getDb()
  const text = await loadCompanyDesc({ db: db, name: name })
  if (text == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  const hit = CACHE.briefTransBy.get(ck)
  if (hit != null && hit.src === text) {
    return Response.json({ ok: true, text: hit.text, cached: true })
  }
  const stored = await loadCompanyDescZh({ db: db, name: name })
  if (stored != null && lang === WD_LANG_ZH) {
    CACHE.briefTransBy.set(ck, { src: text, text: stored })
    return Response.json({ ok: true, text: stored, cached: true })
  }
  if (checkLimit([[CO_LIMIT_PREFIX + ipOf(req), CO_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const r = await translatePlainLines({ text: text, lang: lang,
      signal: AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS) })
    if (r.full === false || translationOk({ src: text, out: r.text, lang: lang }) === false) {
      return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
    }
    CACHE.briefTransBy.set(ck, { src: text, text: r.text })
    if (lang === WD_LANG_ZH) {
      await saveCompanyDescZh({ db: db, name: name, text: r.text })
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
 * 管理员「重译」(2026-09-14 Frank「加」):非管理员 403;清这家公司的译文与版本,前端整页刷新后开框即重翻。
 *
 * @param req 请求体 { name }。
 * @returns { ok }。
 */
export async function employersRetranslateRoute(req: Request): Promise<Response> {
  const user = await getUser(req.headers)
  if (isAdmin(user) === false) {
    return new Response(null, { status: FORBIDDEN })
  }
  let name = NAME_UNSET
  try {
    const b = await req.json() as EmployersRetransBody
    if (typeof b.name === 'string') {
      name = b.name.trim()
    }
  } catch {
    name = NAME_UNSET
  }
  if (name === '') {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  await resetCompanyTrans({ db: await getDb(), name: name })
  return Response.json({ ok: true })
}
