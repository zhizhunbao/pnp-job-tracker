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
import {
  BAD_GATEWAY, BAD_REQUEST, HDR_CACHE_CONTROL, HDR_CONTENT_TYPE, MIME_TEXT, NO_CONTENT, NOT_FOUND, TOO_MANY,
  UNAVAILABLE, FORBIDDEN,
} from '../http'
import {
  E_BAD_REQUEST, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, friendLlmReady, TRANS_KEY_SEP, TRANS_LANGS,
  TRANSLATE_ROUTE_TIMEOUT_MS, translatePlainLines, translateReady, translationOk,
} from '../llm'
import { checkLimit, getUser, ipOf, isPro, isAdmin,
} from '../quota/server'
import {
  AH_DAILY_DEFAULT, AH_LIMIT_PREFIX, APPLY_CACHE_MAX, APPLY_FAIL_MAX, APPLY_NEG_TTL_MS, CITY_PARAM_LEN_MAX,
  COMPANY_SLUG_RE,
  DIMS_CACHE_CONTROL, E_NOC_REQUIRED, JB_POSTING_RE, JDTR_IP_DAILY, JDTR_LIMIT_PREFIX, JD_DAILY_DEFAULT,
  JD_LIMIT_PREFIX, JOBS_FILTER_KEYS, JOBS_PAGE_SIZE, MAIL_NONE, NOC5_RE, PAGE_N_MAX, PARAM_NONE,
  POOL_KEY_RE,
  PROV2_RE, P_CITY, P_CODE, P_DIR, P_ID, P_DIRECT, P_DISTRICT, P_NOC, P_PAGE, P_PROV, P_SORT, P_URL, P_VIEW, RADIX_DEC,
  SORT_NONE, STAMP_NONE, TRUE_ONE, TRUE_WORD, URL_CUT_RE, VIEW_MATCH, NL, TITLE_IP_DAILY, TITLE_LIMIT_PREFIX,
  TITLE_MAX_LEN,
} from './constants'
import {
  emptySimilar, loadApplyEmail, loadStoredApplyEmail, loadCompanyByJobId, loadCompanyByPoolKey, loadCompanyBySlug, loadJobsPage, loadMatchPage,
  loadOccCompetition,
  loadSimilarEmployers, generateJdFormatted, hasProfile, jdAllEmptyOf, jobDescription, jobMetaOut, loadBigDims, loadCityCard,
  loadJdFormatted, loadJdState, loadJobById, loadJobMeta, loadMatchDims, loadProvinceCard, loadRelatedJobs, normalizeProfile,
  translateTitles, emptyTexts, toJobId, toTitleReq, withTitleCtx, stripTitleCtx, loadJdTrans, jdTransCellOf, loadTitleTrans,
  saveTitleTrans, resetJdTrans, translateJdFormatted, translateTitleInContext, emptyTitle, isAmbiguousTitle,
} from './functions'
import { CACHE } from './variables'
import type {
  CompanyBody, JdTransBody, JdUrlBody, JobMeta, MaybeJobId, JobMetaIn, JobsFilters, MatchDims, MaybeStr, ProfileJson,
  JdTitleBody, JdRetransBody,
} from './types'

/**
 * /jobs/[id] 的 SEO 头 —— Next 的 generateMetadata,页面门只做一行转发(门里不许有函数体)。
 * 名字照「routes 名 ↔ URL 机械映射」来:`/jobs/[id]` 的元数据芯。2026-08-29 定形批:
 * 门里只许 A 形(generateMetadata 函数声明 + 一行转发),Next 的 params Promise 线形状
 * 拆参回门,本函数收本域一参形(db 由门注入,与其余 routes 同律)。
 * 2026-08-28 换装批自 app/(frontend)/jobs/[id]/page.tsx 迁入:它要连库,而页面域的组件桶是
 * 浏览器可打包的那一半,放不下 —— routes 是本域唯一允许 `getDb` 的抽屉,而它也确实是
 * 这条路由的服务端契约之一(Next 在同一次请求里调它)。
 *
 * @param input Next 传进来的路由段。
 * @returns metadata 对象。
 */
export async function jobsIdMetaRoute(input: JobMetaIn): Promise<JobMeta> {
  const row = await loadJobMeta({ db: input.db, id: Number(input.id) })
  return jobMetaOut({ row: row, id: input.id })
}

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
      return Response.json({ rows: [], total: 0, page: page, pageSize: JOBS_PAGE_SIZE, updatedAt: STAMP_NONE,
        matchHigh: 0, matchMid: 0 })
    }
    const m = await loadMatchPage({ db: db, pro: pro, profile: profile, matchDims: matchDims, page: page,
      pageSize: JOBS_PAGE_SIZE, sort: { key: sortKey, dir: sortDir } })
    return Response.json({ rows: m.jobs, total: m.total, page: page, pageSize: JOBS_PAGE_SIZE,
      updatedAt: m.updatedAt, matchHigh: m.matchHigh, matchMid: m.matchMid })
  }
  const out = await loadJobsPage({
    db: db, pro: pro, profile: profile, profileOk: profileOk, matchDims: matchDims, filters: filters,
    sort: { key: sortKey, dir: sortDir }, page: page, pageSize: JOBS_PAGE_SIZE,
  })
  return Response.json({ rows: out.jobs, total: out.total, page: page, pageSize: JOBS_PAGE_SIZE,
    updatedAt: out.updatedAt })
}

/**
 * GET /api/jobs/text?url=:真实抓取的职位描述文本(DB jobs.description,mart 按 applyUrl 灌)。
 * #201(#96 整改):JD 摘录 = 通用商品,退出统一付费额度池;只留一道宽松的按 IP 日限
 * (懒抓 miss 会触发外站请求,属信任边界),超了素 429 不做升级引流。
 *
 * @param req 请求(?url=投递链接&id=岗位号;2026-09-20 起带岗位号的按岗位号找行,链接只用来去原站懒抓)。
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
  const id = toJobId(new URL(req.url).searchParams.get(P_ID))
  const body = await jobDescription({ db: await getDb(), applyUrl: url, id: id })
  return new Response(body, { headers: { [HDR_CONTENT_TYPE]: MIME_TEXT } })
}

/**
 * POST /api/jobs/company {jobId}:公司弹框数据同源端点(E8-11 B1)—— 与 /companies/[slug]
 * 页面同一份 CompanyDetail(+相似雇主)。全事实层免费不走额度闸(Frank 拍板「一个来源」)。
 * 按 jobs.company_id 解析,不走公司名匹配(同名公司不串)。相似雇主查挂回空表不 500。
 *
 * 2026-09-18:body 也认 { slug }(雇主板点雇主名开同一个公司弹框,板上没有岗位号):与 `/companies/[slug]` 页面同一个
 * 取数函数;没有岗位就没有「中分类」这条相似线索,相似雇主只按省与行业找。
 * 2026-09-19 Frank「招聘是 0 的公司也可以点击」:{ slug } 这一格也认雇主池键(`n:` 开头 = 这家没有公司页),
 * 档案由池里那一行拼(loadCompanyByPoolKey)。
 * 2026-09-21 Frank「应该是比如这个雇主是医院 相似的应该是其他医院」:相似雇主改按公司分类找,三个入口一律拿这一家的池键当锚
 * (有公司页 = slug),不再看点进来的是哪一岗 —— 上面「按中分类 / 按省与行业」那段是历史。
 *
 * @param req 请求(body 是 { jobId } 或 { slug })。
 * @returns { company, similar };id 非数 400、查无 404。
 */
export async function jobsCompanyRoute(req: Request): Promise<Response> {
  let body: CompanyBody | null = null
  try {
    body = await req.json() as CompanyBody
  } catch {
    body = null
  }
  if (body != null && typeof body.slug === 'string' && COMPANY_SLUG_RE.test(body.slug)) {
    const bySlug = await loadCompanyBySlug({ db: await getDb(), slug: body.slug })
    if (bySlug == null) {
      return new Response(null, { status: NOT_FOUND })
    }
    const alike = await loadSimilarEmployers({ db: await getDb(), key: bySlug.slug }).catch(emptySimilar)
    return Response.json({ company: bySlug, similar: alike })
  }
  if (body != null && typeof body.slug === 'string' && POOL_KEY_RE.test(body.slug)) {
    const byKey = await loadCompanyByPoolKey({ db: await getDb(), key: body.slug })
    if (byKey == null) {
      return new Response(null, { status: NOT_FOUND })
    }
    const near = await loadSimilarEmployers({ db: await getDb(), key: body.slug }).catch(emptySimilar)
    return Response.json({ company: byKey, similar: near })
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
  const similar = await loadSimilarEmployers({ db: db, key: company.slug }).catch(emptySimilar)
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
 * 2026-09-23 站内投递批 1:先读库里存好的(ETL howto 役 + mart 投递邮箱段写的 jobs.apply_email),没有再现抓。
 * 仍不要求登录(投递栏开页就来问,决定出邮箱钮还是外跳钮);批 2 改成服务端代发后,邮箱不再下发前端,这里再收紧。
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
  const stored = await loadStoredApplyEmail({ db: await getDb(), url: raw })
  if (stored !== MAIL_NONE) {
    return Response.json({ email: stored })
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
 * 2026-09-18 Frank 实拍「这个整理完变成这样了」：库里存的、或刚生成的整理版五节全空（原文只有公司套话，模型全答
 * (not stated)）→ 回 204 当「无正文」，页面照旧铺原帖正文；库里那份照存，不反复重调模型。
 *
 * 2026-09-16 Frank「点开的时候，如果有整理版，直接显示整理版，不要有跳跃」：body 带 storedOnly 只查库，
 * 没存回 404 不生成（前端先铺原帖再另起一次不带 storedOnly 的生成）。
 *
 * @param req 请求（body 是 { url, id, storedOnly? }；2026-09-20 起按岗位号找行，见 SQL.JD_TRANS_BY_ID）。
 * @returns 整理版纯文本；掉线 204、缺参 400、只查库没存 404。
 */
export async function jobsJdformatRoute(req: Request): Promise<Response> {
  if (friendLlmReady() === false) {
    return new Response(null, { status: NO_CONTENT })
  }
  let url = PARAM_NONE
  let id: MaybeJobId = null
  let storedOnly = false
  try {
    const b = await req.json() as JdUrlBody
    if (typeof b.url === 'string') {
      url = b.url.trim()
    }
    id = toJobId(b.id)
    storedOnly = b.storedOnly === true
  } catch {
    url = PARAM_NONE
  }
  if (url === '' || id == null) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const state = await loadJdState({ db: db, id: id })
  if (state == null) {
    return new Response(null, { status: NO_CONTENT })
  }
  if (state.formatted != null && jdAllEmptyOf(state.formatted)) {
    return new Response(null, { status: NO_CONTENT })
  }
  if (state.formatted != null) {
    return new Response(state.formatted, { headers: { [HDR_CONTENT_TYPE]: MIME_TEXT } })
  }
  if (storedOnly) {
    return new Response(null, { status: NOT_FOUND })
  }
  const description = await jobDescription({ db: db, applyUrl: url, id: id })
  if (description === '') {
    return new Response(null, { status: NO_CONTENT })
  }
  const fk = String(id)
  let task = CACHE.jdFormatInflight.get(fk)
  let mine = false
  if (task == null) {
    mine = true
    task = generateJdFormatted({ db: db, state: state, description: description })
    CACHE.jdFormatInflight.set(fk, task)
  }
  let out: MaybeStr = null
  try {
    out = await task
  } finally {
    if (mine) {
      CACHE.jdFormatInflight.delete(fk)
    }
  }
  if (out == null) {
    return new Response(null, { status: UNAVAILABLE })
  }
  if (jdAllEmptyOf(out)) {
    return new Response(null, { status: NO_CONTENT })
  }
  return new Response(out, { headers: { [HDR_CONTENT_TYPE]: MIME_TEXT } })
}

/**
 * POST /api/jobs/jd-translate {url, lang}:JD 五节整理版懒翻译(职位弹框「显示中文对照」)。
 * 只翻库内 jobs.jd_formatted(整理版就绪才可翻);标记可与正文同行(#180 教训),
 * 「- 」子弹前缀剥下保管只翻正文。进程缓存 url+lang(全量翻齐才进;部分翻齐下次点重试补齐)。
 * 2026-09-14 Frank「加进行中表」:同岗同语种在途翻译单飞(CACHE.jdTransInflight),后到者等同一个 Promise。
 *
 * 2026-09-16 Frank「点开之后，默认自动翻译」「先显示英文再加中文会跳」:body 带 storedOnly 只查缓存与库,没存回 404 不翻
 * (前端把存好的译文与整理版一起铺;没存的先铺英文再另起一次不带 storedOnly 的翻译)。
 *
 * @param req 请求(body 是 { id, lang, storedOnly? };2026-09-20 起按岗位号找行,见 SQL.JD_TRANS_BY_ID)。
 * @returns { ok, text, cached };状态码同 co-translate,只查库没存 404。
 * 2026-09-22 Frank「不翻译」(dev 没配翻译网关,库里已有的译文也被 translateReady 挡成 503):
 * 网关闸挪到读库之后 —— 存好的译文不需要网关,只有真要现翻才问网关在不在。
 */
export async function jobsJdTranslateRoute(req: Request): Promise<Response> {
  let id: MaybeJobId = null
  let lang = PARAM_NONE
  let storedOnly = false
  try {
    const b = await req.json() as JdTransBody
    id = toJobId(b.id)
    if (typeof b.lang === 'string') {
      lang = b.lang
    }
    storedOnly = b.storedOnly === true
  } catch {
    id = null
  }
  if (id == null || TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const ck = String(id) + TRANS_KEY_SEP + lang
  const hit = CACHE.jdTransBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, text: hit, cached: true })
  }
  const db = await getDb()
  const stored = await loadJdTrans({ db: db, id: id })
  if (stored != null) {
    const cell = jdTransCellOf({ fact: stored, lang: lang })
    if (cell !== PARAM_NONE) {
      CACHE.jdTransBy.set(ck, cell)
      return Response.json({ ok: true, text: cell, cached: true })
    }
  }
  if (storedOnly) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  const fmt = await loadJdFormatted({ db: db, id: id })
  if (fmt == null) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  if (checkLimit([[JDTR_LIMIT_PREFIX + ipOf(req), JDTR_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  let task = CACHE.jdTransInflight.get(ck)
  let mine = false
  if (task == null) {
    mine = true
    task = translateJdFormatted({ db: db, id: id, lang: lang, formatted: fmt, key: ck })
    CACHE.jdTransInflight.set(ck, task)
  }
  try {
    const text = await task
    return Response.json({ ok: true, text: text, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  } finally {
    if (mine) {
      CACHE.jdTransInflight.delete(ck)
    }
  }
}


/**
 * 职位名懒翻(2026-09-14 Frank「这个翻译呢」:没 NOC 的帖(校内 / 联邦公务员)标题下没有职业译名,开框把标题当一行译;
 * 进程内缓存,译名超长(模型在解释)不返回)。
 * 2026-09-23 带岗位号的歧义标题按岗没翻出来(没正文 / 模型没回)就回 404,不再退回按标题翻:那条路会把译名写进所有同名岗,
 * 盖掉别的岗按正文翻好的那个(Frank「统一成标题译名」「应该优先使用详情下的翻译 更准吧」);页面上这一格退回职业名,下次打开再试。
 *
 * @param req 请求体 { title, lang }。
 * @returns { ok, text, cached }。
 */
export async function jobsTitleRoute(req: Request): Promise<Response> {
  if (translateReady() === false) {
    return Response.json({ ok: false, error: E_NOT_CONFIGURED }, { status: UNAVAILABLE })
  }
  let body: JdTitleBody = {}
  try {
    body = await req.json() as JdTitleBody
  } catch {
    body = {}
  }
  const { title, lang, id, titles } = toTitleReq(body)
  if (TRANS_LANGS.includes(lang) === false) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  if (titles.length > 0) {
    const allow = checkLimit([[TITLE_LIMIT_PREFIX + ipOf(req), TITLE_IP_DAILY]])
    const batch = await translateTitles({ db: await getDb(), titles: titles, lang: lang,
      allowLlm: allow }).catch(emptyTexts)
    return Response.json({ ok: true, texts: batch })
  }
  if (title === PARAM_NONE) {
    return Response.json({ ok: false, error: E_BAD_REQUEST }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const inCtx = await translateTitleInContext({ db, title, lang, id }).catch(emptyTitle)
  if (inCtx !== PARAM_NONE) {
    return Response.json({ ok: true, text: inCtx, cached: false })
  }
  if (id != null && isAmbiguousTitle(title)) {
    return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  const ck = title.toLowerCase() + TRANS_KEY_SEP + lang
  const hit = CACHE.titleTransBy.get(ck)
  if (hit != null) {
    return Response.json({ ok: true, text: hit, cached: true })
  }
  const stored = await loadTitleTrans({ db: db, title: title })
  if (stored != null) {
    const cell = jdTransCellOf({ fact: stored, lang: lang })
    if (cell !== PARAM_NONE) {
      CACHE.titleTransBy.set(ck, cell)
      return Response.json({ ok: true, text: cell, cached: true })
    }
  }
  if (checkLimit([[TITLE_LIMIT_PREFIX + ipOf(req), TITLE_IP_DAILY]]) === false) {
    return Response.json({ ok: false, error: E_RATE_LIMITED }, { status: TOO_MANY })
  }
  try {
    const r = await translatePlainLines({ text: withTitleCtx(title), lang: lang,
      signal: AbortSignal.timeout(TRANSLATE_ROUTE_TIMEOUT_MS) })
    const first = r.text.split(NL)[0]
    if (first == null) {
      return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
    }
    const clean = stripTitleCtx(first)
    if (clean.length > TITLE_MAX_LEN || translationOk({ src: title, out: clean, lang: lang }) === false) {
      return Response.json({ ok: false, error: E_NOT_FOUND }, { status: NOT_FOUND })
    }
    CACHE.titleTransBy.set(ck, clean)
    await saveTitleTrans({ db: db, title: title, lang: lang, text: clean })
    return Response.json({ ok: true, text: clean, cached: false })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    return Response.json({ ok: false, error: msg }, { status: BAD_GATEWAY })
  }
}

/**
 * GET /api/jobs/related?id=:按岗位号取相关职位(2026-09-21 Frank「参考一下公司弹框」「下面还要加一个相似职位吗」):
 * 职位板的职位描述弹框照公司弹框的形,正文下面接公司信息卡与相关职位卡;弹框走客户端取数,手里只有岗位号。
 * 与 `/jobs/[id]` 页面同一个取数函数(loadRelatedJobs,四档口径与剔重复帖都在它里面);先按岗位号取本岗拿锚点格,不收客户端递的格。
 *
 * @param req 请求(?id=岗位号)。
 * @returns 相关职位两组 + 兜底级别;id 非数 400、查无 404。
 */
export async function jobsRelatedRoute(req: Request): Promise<Response> {
  const id = Number(new URL(req.url).searchParams.get(P_ID))
  if (Number.isInteger(id) === false || id <= 0) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const row = await loadJobById({
    db: db, id: id, pro: false, profile: normalizeProfile(null), profileOk: false,
    matchDims: { pnpOccupations: [], eeCategories: [] },
  })
  if (row == null) {
    return new Response(null, { status: NOT_FOUND })
  }
  const related = await loadRelatedJobs({
    db: db,
    job: {
      id: id, company: row.company, province: row.province, city: row.city, noc: row.noc,
      fine: row.fine, mid: row.mid, broad: row.broad,
    },
  })
  return Response.json(related)
}

/**
 * 管理员「重译」(2026-09-14 Frank「加」):非管理员 403;清这一岗的译文与版本,前端随后整页刷新,开框即重翻。
 *
 * @param req 请求体 { id, title }(2026-09-20 起按岗位号)。
 * @returns { ok }。
 */
export async function jobsRetranslateRoute(req: Request): Promise<Response> {
  const user = await getUser(req.headers)
  if (isAdmin(user) === false) {
    return new Response(null, { status: FORBIDDEN })
  }
  let id: MaybeJobId = null
  let title = PARAM_NONE
  try {
    const b = await req.json() as JdRetransBody
    if (b.id != null) {
      id = toJobId(b.id)
    }
    if (typeof b.title === 'string') {
      title = b.title.trim()
    }
  } catch {
    id = null
  }
  if (id == null) {
    return new Response(null, { status: BAD_REQUEST })
  }
  await resetJdTrans({ db: await getDb(), id: id, title: title })
  return Response.json({ ok: true })
}

/**
 * GET /api/jobs/row?id=:按岗位号取板上一行(2026-09-19 Frank「这种里面的链接都改成弹框显示」):
 * 公司页 / 公司弹框 / 下架岗相似职位里点职位要叠开职位描述弹框,弹框要整行;这些地方手里只有迷你行,点了才来取。
 * 与 `/jobs/[id]` 页面同一个取数函数、同一道分层(Pro 列剥离在 SELECT 映射层);不带档案(弹框只看 JD,不算匹配)。
 *
 * @param req 请求(?id=岗位号)。
 * @returns 一行;id 非数 400、查无 404。
 */
export async function jobsRowRoute(req: Request): Promise<Response> {
  const id = Number(new URL(req.url).searchParams.get(P_ID))
  if (Number.isInteger(id) === false || id <= 0) {
    return new Response(null, { status: BAD_REQUEST })
  }
  const user = await getUser(req.headers)
  const row = await loadJobById({
    db: await getDb(), id: id, pro: isPro(user), profile: normalizeProfile(null), profileOk: false,
    matchDims: { pnpOccupations: [], eeCategories: [] },
  })
  if (row == null) {
    return new Response(null, { status: NOT_FOUND })
  }
  return Response.json(row)
}
