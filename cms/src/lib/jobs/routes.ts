/**
 * 职位域的 HTTP 芯(第十一抽屉):/api/jobs(列表分页)、text(JD 摘录)、company(公司弹框)、
 * dims(大维度包)、city / province(地点弹框情报)、competition(职业竞争面)、
 * applyhow(投递邮箱懒查)。取数与组装全在 functions,这里只做参数验形、限额与缓存编排。
 * 两处跨边界断言:jobsRoute 的 `user.profile as ProfileJson`(quota 的档案格是递归 json,
 * normalizeProfile 只读扁平几格并自带兜底)与 `draft as JobsFilters`(白名单键逐个收进来的
 * Record,形状声明在 JobsFilters);jobsCompanyRoute 的 `await req.json() as CompanyBody`
 * 同款(网络来的 body 先按声明形状收下,逐格判后才用)。
 *
 * @author Frank
 * @time 2026-08-23 06:30:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { textResponseOf,
  BAD_GATEWAY, BAD_REQUEST, HDR_CACHE_CONTROL, HDR_CONTENT_TYPE, MIME_TEXT, NO_CONTENT, NOT_FOUND, TOO_MANY,
  UNAVAILABLE,
} from '../http'
import {
  E_BAD_REQUEST, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, friendLlmReady, TRANS_KEY_SEP, TRANS_LANGS,
  TRANSLATE_ROUTE_TIMEOUT_MS, translateReady, translateSectioned,
} from '../llm'
import { denyBodyOf, checkLimit, freeGate, getUser, ipOf, isPro } from '../quota/server'
import {
  AH_DAILY_DEFAULT, AH_LIMIT_PREFIX, APPLY_CACHE_MAX, APPLY_FAIL_MAX, APPLY_NEG_TTL_MS, CITY_PARAM_LEN_MAX, DIMS_CACHE_CONTROL, E_NOC_REQUIRED, JB_POSTING_RE, JDTR_IP_DAILY, JDTR_LIMIT_PREFIX, JD_DAILY_DEFAULT, JD_LIMIT_PREFIX, JD_TRANS_MARKS_RE, JOBS_FILTER_KEYS, JOBS_PAGE_SIZE, MAIL_NONE, NOC5_RE, PAGE_N_MAX, PARAM_NONE, PROV2_RE, P_CITY, P_CODE, P_DIR, P_DIRECT, P_DISTRICT, P_NOC, P_PAGE, P_PROV, P_SORT, P_URL, P_VIEW, RADIX_DEC, SORT_NONE, STAMP_NONE, TRUE_ONE, TRUE_WORD, URL_CUT_RE, VIEW_MATCH,
} from './constants'
import {
  emptySimilar, loadApplyEmail, loadCompanyByJobId, loadJobsPage, loadMatchPage, loadOccCompetition, loadSimilarEmployers, generateJdFormatted, hasProfile, jobDescription, loadBigDims, loadCityCard, loadJdFormatted, loadJdState, loadMatchDims, loadProvinceCard, normalizeProfile,
} from './functions'
import { CACHE } from './variables'
import type { CompanyBody, JdTransBody, JdUrlBody, JobsFilters, MatchDims, MaybeStr, ProfileJson } from './types'

/**
 * GET /api/jobs:职位列表服务端分页/筛选/搜索(E10-01 P2,取代旧「一次拉 20k blob 前端过滤」)。
 * 入参 = /jobs 前端筛选 state 原样(白名单 JOBS_FILTER_KEYS)+ page/sort/dir;
 * 分层语义同 SSR(Pro 列剥离、免费匹配前 N)。total=同 WHERE count,前端头条命中数/
 * 「还有 N」全用它,天然自洽。「我的匹配」视图(view=match)走 loadMatchPage,未建档回空。
 *
 * @param req 请求。
 * @returns { rows, total, page, pageSize, updatedAt }(匹配视图另带 matchHigh/matchMid)。
 */
export async function jobsRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  const draft: Record<string, string | boolean> = {}
  for (const k of JOBS_FILTER_KEYS) {
    const v = sp.get(k)
    if (v != null && v !== '') {
      draft[k] = v
    }
  }
  const direct = sp.get(P_DIRECT)
  if (direct === TRUE_ONE || direct === TRUE_WORD) {
    draft[P_DIRECT] = true
  }
  const filters = draft as JobsFilters
  let page = 0
  const pageRaw = parseInt(String(sp.get(P_PAGE)), RADIX_DEC)
  if (Number.isFinite(pageRaw) && pageRaw > 0) {
    page = Math.min(PAGE_N_MAX, pageRaw)
  }
  let sortKey = SORT_NONE
  const sortParam = sp.get(P_SORT)
  if (sortParam != null) {
    sortKey = sortParam
  }
  let sortDir = SORT_NONE
  const dirParam = sp.get(P_DIR)
  if (dirParam != null) {
    sortDir = dirParam
  }
  const user = await getUser(await headers())
  const pro = isPro(user)
  let profileRaw: ProfileJson | null = null
  if (user != null) {
    profileRaw = user.profile as ProfileJson
  }
  const profile = normalizeProfile(profileRaw)
  const profileOk = hasProfile(profile)
  const db = await getDb()
  let matchDims: MatchDims = { pnpOccupations: [], eeCategories: [] }
  if (profileOk) {
    matchDims = await loadMatchDims(db)
  }
  if (sp.get(P_VIEW) === VIEW_MATCH) {
    if (profileOk === false) {
      return Response.json({ rows: [], total: 0, page: page, pageSize: JOBS_PAGE_SIZE, updatedAt: STAMP_NONE, matchHigh: 0, matchMid: 0 })
    }
    const m = await loadMatchPage({ db: db, pro: pro, profile: profile, matchDims: matchDims, page: page, pageSize: JOBS_PAGE_SIZE, sort: { key: sortKey, dir: sortDir } })
    return Response.json({ rows: m.jobs, total: m.total, page: page, pageSize: JOBS_PAGE_SIZE, updatedAt: m.updatedAt, matchHigh: m.matchHigh, matchMid: m.matchMid })
  }
  const out = await loadJobsPage({
    db: db, pro: pro, profile: profile, profileOk: profileOk, matchDims: matchDims, filters: filters,
    sort: { key: sortKey, dir: sortDir }, page: page, pageSize: JOBS_PAGE_SIZE,
  })
  return Response.json({ rows: out.jobs, total: out.total, page: page, pageSize: JOBS_PAGE_SIZE, updatedAt: out.updatedAt })
}

/**
 * GET /api/jobs/text?url=:真实抓取的职位描述文本(DB jobs.description,mart 按 applyUrl 灌)。
 * #201(#96 整改):JD 摘录 = 通用商品,退出统一付费额度池;只留一道宽松的按 IP 日限
 * (懒抓 miss 会触发外站请求,属信任边界),超了素 429 不做升级引流。
 *
 * @param req 请求(?url=投递链接)。
 * @returns 纯文本 JD;缺参 400、超限 429。
 */
export async function jobsTextRoute(req: Request): Promise<Response> {
  let jdDaily = JD_DAILY_DEFAULT
  const jdEnv = Number(process.env.JD_DAILY)
  if (Number.isFinite(jdEnv) && jdEnv > 0) {
    jdDaily = jdEnv
  }
  if (checkLimit([[JD_LIMIT_PREFIX + ipOf(req), jdDaily]]) === false) {
    return new Response(null, { status: TOO_MANY })
  }
  let url = PARAM_NONE
  const urlParam = new URL(req.url).searchParams.get(P_URL)
  if (urlParam != null) {
    url = urlParam.trim()
  }
  if (url === '') {
    return new Response(null, { status: BAD_REQUEST })
  }
  const body = await jobDescription({ db: await getDb(), applyUrl: url })
  return new Response(body, { headers: { [HDR_CONTENT_TYPE]: MIME_TEXT } })
}

/**
 * POST /api/jobs/company {jobId}:公司弹框数据同源端点(E8-11 B1)—— 与 /companies/[slug]
 * 页面同一份 CompanyDetail(+相似雇主)。全事实层免费不走额度闸(Frank 拍板「一个来源」)。
 * 按 jobs.company_id 解析,不走公司名匹配(同名公司不串)。相似雇主查挂回空表不 500。
 *
 * @param req 请求(body 是 { jobId })。
 * @returns { company, similar };id 非数 400、查无 404。
 */
export async function jobsCompanyRoute(req: Request): Promise<Response> {
  let body: CompanyBody | null = null
  try {
    body = await req.json() as CompanyBody
  } catch {
    body = null
  }
  let jobId = Number.NaN
  if (body != null) {
    jobId = Number(body.jobId)
  }
  if (Number.isFinite(jobId) === false) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const company = await loadCompanyByJobId({ db: db, jobId: jobId })
  if (company == null) {
    return new Response(null, { status: NOT_FOUND })
  }
  const similar = await loadSimilarEmployers({ db: db, province: company.province, industry: company.industry, excludeSlug: company.slug }).catch(emptySimilar)
  return Response.json({ company, similar })
}

/**
 * GET /api/jobs/dims:筛选下拉/顾问弹窗要用的大维度包(E10-01 P3)。
 * 1.4MB(压缩 302KB)包,ETL 小时级才动且与用户无关 —— 浏览器缓存 5 分钟 + SWR
 * (2026-07-28 实测:不缓存每次进职位板白付 1.2s TTFB)。
 *
 * @param _req 请求(不读参数)。
 * @returns { dims } 四张维度表。
 */
export async function jobsDimsRoute(_req: Request): Promise<Response> {
  const dims = await loadBigDims({ db: await getDb() })
  return Response.json({ dims }, { headers: { [HDR_CACHE_CONTROL]: DIMS_CACHE_CONTROL } })
}

/**
 * GET /api/jobs/city?city=Ottawa&prov=ON[&district=Kanata]:市/区情报(E8-12b 懒查询,
 * 弹框打开才拉)。取数与拼装在 loadCityCard;这里只验参。
 *
 * @param req 请求。
 * @returns { ok: true, ...市卡 };参数非法 400。
 */
export async function jobsCityRoute(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams
  let city = PARAM_NONE
  const cityParam = sp.get(P_CITY)
  if (cityParam != null) {
    city = cityParam.trim()
  }
  let prov = PARAM_NONE
  const provParam = sp.get(P_PROV)
  if (provParam != null) {
    prov = provParam.toUpperCase()
  }
  let district = PARAM_NONE
  const districtParam = sp.get(P_DISTRICT)
  if (districtParam != null) {
    district = districtParam.trim()
  }
  if (city === '' || city.length > CITY_PARAM_LEN_MAX || PROV2_RE.test(prov) === false) {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  const card = await loadCityCard({ db: await getDb(), city: city, prov: prov, district: district })
  return Response.json({
    ok: true,
    openJobs: card.openJobs, new7d: card.new7d, medSalary: card.medSalary,
    topBroads: card.topBroads, dli: card.dli, aipEmployers: card.aipEmployers, district: card.district,
  })
}

/**
 * GET /api/jobs/province?code=ON:地点弹框省情报(E8-12 懒查询)。
 * info=provinces.info(IRCC 体量数,mart 挂列);difficulty=stats 表 broad='all' 行
 * (E12-07,与 /stats DifficultyCard 同源)。零 AI 零额度。
 *
 * @param req 请求(?code=两位省码)。
 * @returns { ok, info, difficulty };码非法 400、查无 404。
 */
export async function jobsProvinceRoute(req: Request): Promise<Response> {
  let code = PARAM_NONE
  const codeParam = new URL(req.url).searchParams.get(P_CODE)
  if (codeParam != null) {
    code = codeParam.toUpperCase()
  }
  if (PROV2_RE.test(code) === false) {
    return Response.json({ ok: false }, { status: BAD_REQUEST })
  }
  const card = await loadProvinceCard({ db: await getDb(), code: code })
  if (card == null) {
    return Response.json({ ok: false }, { status: NOT_FOUND })
  }
  return Response.json({ ok: true, info: card.info, difficulty: card.difficulty })
}

/**
 * GET /api/jobs/competition?noc=63200:该职业在各省的竞争面。
 * 🔴 职业级的「几人抢一个」算不出来,本站不编 —— 给的是三个能代表紧俏度的实数
 * (在招/近 30 天新增、平均在招天数、该省名额竞争),不合成一个分数。
 * 取数与组装在 loadOccCompetition(与 profile-pathways 的服务端排序同一份,口径不许分叉)。
 *
 * @param req 请求(?noc=五位码)。
 * @returns { noc, rows };noc 非法 400。
 */
export async function jobsCompetitionRoute(req: Request): Promise<Response> {
  let noc = PARAM_NONE
  const nocParam = new URL(req.url).searchParams.get(P_NOC)
  if (nocParam != null) {
    noc = nocParam.trim()
  }
  if (NOC5_RE.test(noc) === false) {
    return Response.json({ error: E_NOC_REQUIRED }, { status: BAD_REQUEST })
  }
  const rows = await loadOccCompetition({ db: await getDb(), nocs: [noc] })
  return Response.json({ noc, rows })
}

/**
 * GET /api/jobs/applyhow?url=:投递邮箱懒查(E9-04 B11)。Job Bank 把投递邮箱藏在
 * 「Show how to apply」的 JSF 局部提交后面 —— 打开投递栏时现抓(loadApplyEmail),
 * 进程内正/负两级缓存,零批量预抓(lazy-first)。只认 jobbank.gc.ca 职位页(白名单防
 * SSRF);其他来源(ATS 原站)邮箱走前端对 jobtext 的正则,不进这里。
 *
 * @param req 请求(?url=职位页链接)。
 * @returns { email }(空串 = 无/失败);超限 429。
 */
export async function jobsApplyhowRoute(req: Request): Promise<Response> {
  let ahDaily = AH_DAILY_DEFAULT
  const ahEnv = Number(process.env.APPLYHOW_DAILY)
  if (Number.isFinite(ahEnv) && ahEnv > 0) {
    ahDaily = ahEnv
  }
  if (checkLimit([[AH_LIMIT_PREFIX + ipOf(req), ahDaily]]) === false) {
    return Response.json({ email: MAIL_NONE }, { status: TOO_MANY })
  }
  let raw = PARAM_NONE
  const urlParam = new URL(req.url).searchParams.get(P_URL)
  if (urlParam != null) {
    raw = urlParam.trim()
  }
  if (JB_POSTING_RE.test(raw) === false) {
    return Response.json({ email: MAIL_NONE })
  }
  const keyHead = raw.split(URL_CUT_RE)[0]
  let key = PARAM_NONE
  if (keyHead != null) {
    key = keyHead
  }
  const hit = CACHE.applyMail.get(key)
  if (hit != null) {
    return Response.json({ email: hit })
  }
  const neg = CACHE.applyFail.get(key)
  if (neg != null && Date.now() - neg < APPLY_NEG_TTL_MS) {
    return Response.json({ email: MAIL_NONE })
  }
  const email = await loadApplyEmail(key)
  if (email == null) {
    CACHE.applyFail.set(key, Date.now())
    if (CACHE.applyFail.size > APPLY_FAIL_MAX) {
      CACHE.applyFail.clear()
    }
    return Response.json({ email: MAIL_NONE })
  }
  CACHE.applyMail.set(key, email)
  if (CACHE.applyMail.size > APPLY_CACHE_MAX) {
    CACHE.applyMail.clear()
  }
  return Response.json({ email })
}

/**
 * POST /api/jobs/jdformat {url}:JD 五节整理版懒生成（J2）。命中 jobs.jd_formatted 直接回；
 * 缺则走 jobDescription 统一入口拿原文（#139：含懒抓单飞，与并发的 jobtext 共用一次
 * 抓取不重复打原站）→ generateJdFormatted（生成+校验+存列）。同岗并发去重
 * （CACHE.jdFormatInflight，后到者等同一个 Promise）。生成入统一免费池
 * （缓存命中不计费）；失败态拆三种（402/429=额度、503=生成失败可重试、
 * 204=无正文），不再五因一果（#114）。
 *
 * @param req 请求（body 是 { url }）。
 * @returns 整理版纯文本；掉线 204、缺参 400。
 */
export async function jobsJdformatRoute(req: Request): Promise<Response> {
  if (friendLlmReady() === false) {
    return new Response(null, { status: NO_CONTENT })
  }
  let url = PARAM_NONE
  try {
    const b = await req.json() as JdUrlBody
    if (typeof b.url === 'string') {
      url = b.url.trim()
    }
  } catch {
    url = PARAM_NONE
  }
  if (url === '') {
    return new Response(null, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const state = await loadJdState({ db: db, url: url })
  if (state == null) {
    return new Response(null, { status: NO_CONTENT })
  }
  if (state.formatted != null) {
    return new Response(state.formatted, { headers: { [HDR_CONTENT_TYPE]: MIME_TEXT } })
  }
  const description = await jobDescription({ db: db, applyUrl: url })
  if (description === '') {
    return new Response(null, { status: NO_CONTENT })
  }
  const g = freeGate({ user: await getUser(req.headers), headers: req.headers })
  const deny = denyBodyOf(g)
  if (deny != null) {
    return textResponseOf(deny)
  }
  let task = CACHE.jdFormatInflight.get(url)
  let mine = false
  if (task == null) {
    mine = true
    task = generateJdFormatted({ db: db, state: state, description: description })
    CACHE.jdFormatInflight.set(url, task)
  }
  let out: MaybeStr = null
  try {
    out = await task
  } finally {
    if (mine) {
      CACHE.jdFormatInflight.delete(url)
    }
  }
  if (out == null) {
    return new Response(null, { status: UNAVAILABLE })
  }
  const h: Record<string, string> = { [HDR_CONTENT_TYPE]: MIME_TEXT }
  for (const [k, v] of Object.entries(g.headers)) {
    h[k] = v
  }
  return new Response(out, { headers: h })
}

/**
 * POST /api/jobs/jd-translate {url, lang}:JD 五节整理版懒翻译(职位弹框「显示中文对照」)。
 * 只翻库内 jobs.jd_formatted(整理版就绪才可翻);标记可与正文同行(#180 教训),
 * 「- 」子弹前缀剥下保管只翻正文。进程缓存 url+lang(全量翻齐才进;部分翻齐下次点重试补齐)。
 *
 * @param req 请求(body 是 { url, lang })。
 * @returns { ok, text, cached };状态码同 co-translate。
 */
export async function jobsJdTranslateRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let url = PARAM_NONE
  let lang = PARAM_NONE
  try {
    const b = await req.json() as JdTransBody
    if (typeof b.url === 'string') {
      url = b.url.trim()
    }
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
  } catch {
    url = PARAM_NONE
  }
  if (url === '' || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = url + TRANS_KEY_SEP + lang
  const hit = CACHE.jdTransBy.get(ck)
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
      marks: JD_TRANS_MARKS_RE, bullets: true,
    })
    if (r.full) {
      CACHE.jdTransBy.set(ck, r.text)
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

