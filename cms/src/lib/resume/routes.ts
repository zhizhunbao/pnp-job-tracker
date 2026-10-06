/**
 * 简历域的 HTTP 芯(第十一抽屉):/api/resume(上传解析 → 抽取 → NOC 候选)、
 * /api/resume/extract(只抽纯文本零 LLM)、/api/resume/match(简历对照 JD,G3)。
 * 隐私红线(全域):原件不落盘不入库(内存 Buffer 解析完即弃),简历默认不落库
 * (只有 body.save===true 才写 profile.resumeText),日志只记长度不记内容。
 * 跨边界断言:formData 的 `get(FIELD_FILE)`、`await req.json() as MatchBody`、
 * `parseLlmJson(raw) as ExtractData`、`user.profile as MatchUsesProfile` ——
 * 都是先按声明形状收下,逐格判后才用。
 * 2026-10-05 改判(Frank「先做我的简历吧」,设计稿 docs/design/我的模块v2-20261005.md「定稿」):
 * 「我的简历」由用户主动上传的原件**入库**(user_resumes,一人一份,可随时删),只给本人看、
 * 只用于本人发起的投递;上面「原件不落盘不入库」从此只管 /api/resume、extract、match 三条解析路。
 * 新增 /api/resume/file(GET 取原件、PUT 上传或替换、DELETE 删)与 /api/resume/file/meta(元信息)。
 * 2026-10-06 一人多份(最多 5 份、一份默认;Frank「这个可以上传多份简历吧」):file 四个方法都按 `?id=` 指明哪一份
 * (PUT 不带 id = 新加,PATCH = 设默认),元信息口换成清单口 /api/resume/files。
 *
 * @author Frank
 * @time 2026-08-23 10:30:00
 */
import { headers } from 'next/headers'
import { getDb } from '../db/server'
import { isLlmError } from '../error'
import {
  BAD_GATEWAY, BAD_REQUEST, CONFLICT, GATEWAY_TIMEOUT, HDR_CACHE_CONTROL, HDR_CONTENT_DISPOSITION, HDR_CONTENT_TYPE, NOT_FOUND,
  TOO_LARGE, TOO_MANY, UNAUTHORIZED, UNPROCESSABLE,
} from '../http'
import { jobDescription, loadApplyUrlById } from '../jobs/server'
import { completeText } from '../llm'
import type { ResultMeta } from '../llm'
import { log, RESUME_LOG } from '../log'
import { patchProfile } from '../profile/server'
import type { ProfilePatch } from '../profile/server'
import { FREE_DAILY_TRIES } from '../quota'
import { checkLimit, freeGate, getUser, getUserOrNull, ipOf, isPro } from '../quota/server'
import {
  BLANKS2, BLANKS3_RE, BODY_TEXT_NONE, CLB_MAX, CLB_MIN, CODE_TIMEOUT, CODE_TOO_LONG, CR_DROP, CR_RE, DAILY_FREE, DATE_LEN, DETAIL_CAP, ERR_LOG_CAP, EXTRACT_CHARS_MAX, EXTRACT_OUT_MAX, EXTRACT_TEXT_MIN, EXTRACT_TOKENS_MAX, E_AUTH, E_BUSY, E_LIMIT, E_LLM, E_LOGIN, E_NOFILE, E_NO_JD, E_PARSE, E_SCAN, E_SIZE, E_TOO_LONG, E_TOO_SHORT, FIELD_FILE, JD_DB_NONE, JD_LEN_MIN, LANG_FALLBACK_EN, LLM_TEXT_NONE, LOG_DASH, MATCH_PROVIDER, MATCH_TEMPERATURE, MATCH_TOKENS_FREE, MATCH_TOKENS_PRO, META_VIA_LEGACY, MIN_RESUME, ONE_SPACE, RESUME_MAX_BYTES, RESUME_SAVE_CAP, REWRITE_CAP, ROLE_SYSTEM, ROLE_USER, SPACES_RE, TEST_MAIL_SUFFIX, TITLES_N_MAX, TITLE_Q_LEN_MAX, TITLE_Q_LEN_MIN, USES_CELL_NONE, USES_SEP, WS_ALL_RE,
  B64, CACHE_PRIVATE, E_FULL, E_NO_ID, E_NOT_FOUND, E_TYPE, RESUME_FILES_MAX, HDR_NOSNIFF, MAGIC_ENC, MAGIC_LEN, NOSNIFF, P_DOWNLOAD, RF_IP_DAILY,
  RF_IP_PREFIX, RF_USER_DAILY, RF_USER_PREFIX,
} from './constants'
import {
  deleteResumeFile, dispositionOf, extractText, fileMimeOf, fileNameOf, gateMatch, ieltsToClb, loadResumeBlob,
  loadResumeCount, loadResumeList, matchPrompt, nocCandidatesOf, normalizeRows, parseLlmJson, resumeIdOf, saveResumeFile,
  setDefaultResume,
} from './functions'
import { EXTRACT_SYSTEM } from './prompts'
import type { ExtractData, MatchBody, MatchUsesProfile, MaybeNum } from './types'

/**
 * POST /api/resume:简历上传解析(E11-07)—— PDF/DOCX → 文本 → LLM 抽取(职名/语言)→
 * NOC 候选(在库职位标题 trgm)。抽取结果 = 预填建议,入库走用户确认后的 PATCH。
 * 免费口径:登录可用,#124 起走统一免费池(与 jobtext/advisor 同池同数)。
 * clb 口径:简历明写的 4..10 直接认;否则 IELTS 四项换算;都没有就 null,绝不猜。
 *
 * @param req 请求(multipart,file 字段)。
 * @returns { nocCandidates, clb, freeLeft };未登录 401、超池 429、超大 413、解析不了 422。
 */
// eslint-disable-next-line local/function-length -- 鉴权→限额→取文件→抽文本→LLM→候选一条流水,每步都握着上一步的产物与 freeLeft
export async function resumeRoute(req: Request): Promise<Response> {
  const user = await getUser(req.headers)
  if (user == null) {
    return Response.json({ error: E_LOGIN }, { status: UNAUTHORIZED })
  }
  const g = freeGate({ user: user, headers: req.headers })
  if (g.deny != null) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let freeLeft = FREE_DAILY_TRIES
  if (g.left != null) {
    freeLeft = g.left
  }
  let file: File | null = null
  try {
    const got = (await req.formData()).get(FIELD_FILE)
    if (got instanceof File) {
      file = got
    }
  } catch {
    file = null
  }
  if (file == null) {
    return Response.json({ error: E_NOFILE }, { status: BAD_REQUEST })
  }
  if (file.size > RESUME_MAX_BYTES) {
    return Response.json({ error: E_SIZE }, { status: TOO_LARGE })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const extracted = await extractText({ name: file.name, buf: buf })
  let text: string | null = null
  if (extracted.text != null) {
    text = extracted.text.replace(WS_ALL_RE, ONE_SPACE).trim()
  }
  if (text == null) {
    return Response.json({ error: E_PARSE, freeLeft }, { status: UNPROCESSABLE })
  }
  if (text.length < EXTRACT_TEXT_MIN) {
    return Response.json({ error: E_SCAN, freeLeft }, { status: UNPROCESSABLE })
  }
  let raw = LLM_TEXT_NONE
  try {
    raw = await completeText({
      messages: [
        { role: ROLE_SYSTEM, content: EXTRACT_SYSTEM },
        { role: ROLE_USER, content: text.slice(0, EXTRACT_CHARS_MAX) },
      ],
      maxTokens: EXTRACT_TOKENS_MAX,
    })
  } catch (e) {
    if (e instanceof Error && isLlmError(e)) {
      return Response.json({ error: E_LLM, freeLeft }, { status: BAD_GATEWAY })
    }
    throw e
  }
  const data = parseLlmJson(raw) as ExtractData | null
  if (data == null || Array.isArray(data.titles) === false || data.titles == null) {
    return Response.json({ error: E_LLM, freeLeft }, { status: BAD_GATEWAY })
  }
  const titles: string[] = []
  for (const t of data.titles.slice(0, TITLES_N_MAX)) {
    if (t == null || typeof t.title_en !== 'string') {
      continue
    }
    const q = t.title_en.slice(0, TITLE_Q_LEN_MAX)
    if (q.length >= TITLE_Q_LEN_MIN) {
      titles.push(q)
    }
  }
  const nocCandidates = await nocCandidatesOf({ db: await getDb(), titles: titles })
  let clb: MaybeNum = null
  if (typeof data.clb === 'number' && data.clb >= CLB_MIN && data.clb <= CLB_MAX) {
    clb = Math.round(data.clb)
  } else {
    clb = ieltsToClb(data.ielts)
  }
  return Response.json({ nocCandidates, clb, freeLeft })
}

/**
 * POST /api/resume/extract:简历文件抽纯文本(G3)。只做解析不碰 LLM(零成本不占免费池;
 * 登录墙照旧防白嫖解析器)。文本回填前端粘贴框 —— 用户看得见、能删改。
 * 保留换行(回填 textarea 要可读),只压回车与行内连空格。
 *
 * @param req 请求(multipart,file 字段)。
 * @returns { text };未登录 401、没文件 400、超大 413、解析不了/扫描件 422。
 */
export async function resumeExtractRoute(req: Request): Promise<Response> {
  const user = await getUser(req.headers)
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let file: File | null = null
  try {
    const got = (await req.formData()).get(FIELD_FILE)
    if (got instanceof File) {
      file = got
    }
  } catch {
    file = null
  }
  if (file == null) {
    return Response.json({ error: E_NOFILE }, { status: BAD_REQUEST })
  }
  if (file.size > RESUME_MAX_BYTES) {
    return Response.json({ error: E_SIZE }, { status: TOO_LARGE })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const extracted = await extractText({ name: file.name, buf: buf })
  let text: string | null = null
  if (extracted.text != null) {
    text = extracted.text.replace(CR_RE, CR_DROP).replace(SPACES_RE, ONE_SPACE).replace(BLANKS3_RE, BLANKS2).trim()
  }
  if (text == null) {
    if (user.email.endsWith(TEST_MAIL_SUFFIX)) {
      return Response.json({ error: E_PARSE, detail: extracted.err.slice(0, DETAIL_CAP) }, { status: UNPROCESSABLE })
    }
    return Response.json({ error: E_PARSE }, { status: UNPROCESSABLE })
  }
  if (text.length < EXTRACT_TEXT_MIN) {
    return Response.json({ error: E_SCAN }, { status: UNPROCESSABLE })
  }
  log({ tag: RESUME_LOG.tag, text: RESUME_LOG.extractOk + user.id + RESUME_LOG.fileB + file.size + RESUME_LOG.bSuffix + RESUME_LOG.textCh + text.length + RESUME_LOG.chSuffix })
  return Response.json({ text: text.slice(0, EXTRACT_OUT_MAX) })
}

/**
 * DELETE /api/resume/file?id=:删本人某一份(没有也回成功);删的是默认那份,最新的一份补成默认。
 * 一份都不剩时,简历对照存档的文字(profile.resumeText)一起删 —— 文字存档原住账户页「简历存档」,
 * 2026-10-05 那块界面随「我的简历」改版退役;隐私条款承诺「可随时删除」,删除口从此只有「我的简历」。
 *
 * @param req 请求(id 在查询参数)。
 * @returns { ok };未登录 401、没带 id 400。
 */
export async function resumeFileDeleteRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const id = resumeIdOf(req.url)
  if (id == null) {
    return Response.json({ error: E_NO_ID }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  await deleteResumeFile({ db, userId: user.id, id })
  if (await loadResumeCount({ db, userId: user.id }) === 0) {
    await patchProfile({ userId: user.id, patch: { resumeText: null, resumeSavedAt: null } })
  }
  log({ tag: RESUME_LOG.tag, text: RESUME_LOG.fileDeleted + user.id })
  return Response.json({ ok: true })
}

/**
 * GET /api/resume/file?id=:本人某一份的原件(预览弹框与下载)。带 `dl` 按下载给,不带在浏览器里直接打开。
 * 只给本人、哪一层都不许缓存,加防嗅探头(审查 #17)。
 *
 * @param req 请求(id 在查询参数)。
 * @returns 原件字节;未登录 401、没带 id 400、没有或不是本人的 404。
 */
export async function resumeFileGetRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const id = resumeIdOf(req.url)
  if (id == null) {
    return Response.json({ error: E_NO_ID }, { status: BAD_REQUEST })
  }
  const blob = await loadResumeBlob({ db: await getDb(), userId: user.id, id })
  if (blob == null) {
    return Response.json({ error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  const download = new URL(req.url).searchParams.has(P_DOWNLOAD)
  return new Response(blob.bytes, {
    headers: {
      [HDR_CONTENT_TYPE]: blob.mime,
      [HDR_CONTENT_DISPOSITION]: dispositionOf({ fileName: blob.fileName, download }),
      [HDR_CACHE_CONTROL]: CACHE_PRIVATE,
      [HDR_NOSNIFF]: NOSNIFF,
    },
  })
}

/**
 * PATCH /api/resume/file?id=:把本人某一份设为默认(其余取消)。
 *
 * @param req 请求(id 在查询参数)。
 * @returns { ok };未登录 401、没带 id 400、不是本人的 404。
 */
export async function resumeFilePatchRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const id = resumeIdOf(req.url)
  if (id == null) {
    return Response.json({ error: E_NO_ID }, { status: BAD_REQUEST })
  }
  if (await setDefaultResume({ db: await getDb(), userId: user.id, id }) === false) {
    return Response.json({ error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  return Response.json({ ok: true })
}

/**
 * PUT /api/resume/file[?id=]:不带 id 新加一份(到 5 份回 409),带 id 原地替换那一份。
 * 类型按文件头判,不信扩展名;扫描件也收(审查 #17:不挡投递),所以这里不抽文字。
 * 限流两道:每人每天、每 IP 每天(防脚本反复覆盖刷库)。
 *
 * @param req 请求(multipart,file 字段;替换时 id 在查询参数)。
 * @returns { meta };未登录 401、超限 429、没文件 400、不是 PDF / .docx 400、超大 413、满 5 份 409、替换的不是本人的 404。
 */
export async function resumeFilePutRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  if (checkLimit([[RF_USER_PREFIX + String(user.id), RF_USER_DAILY], [RF_IP_PREFIX + ipOf(req), RF_IP_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let file: File | null = null
  try {
    const got = (await req.formData()).get(FIELD_FILE)
    if (got instanceof File) {
      file = got
    }
  } catch {
    file = null
  }
  if (file == null || file.size === 0) {
    return Response.json({ error: E_NOFILE }, { status: BAD_REQUEST })
  }
  if (file.size > RESUME_MAX_BYTES) {
    return Response.json({ error: E_SIZE }, { status: TOO_LARGE })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const mime = fileMimeOf({ name: file.name, head: buf.subarray(0, MAGIC_LEN).toString(MAGIC_ENC) })
  if (mime == null) {
    log({ tag: RESUME_LOG.tag, text: RESUME_LOG.fileRejected + user.id + RESUME_LOG.fileB + buf.byteLength + RESUME_LOG.bSuffix })
    return Response.json({ error: E_TYPE }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const replaceId = resumeIdOf(req.url)
  if (replaceId == null && await loadResumeCount({ db, userId: user.id }) >= RESUME_FILES_MAX) {
    return Response.json({ error: E_FULL }, { status: CONFLICT })
  }
  const meta = await saveResumeFile({
    db, userId: user.id, replaceId, b64: buf.toString(B64), fileName: fileNameOf({ name: file.name, mime }), mime,
    sizeBytes: buf.byteLength,
  })
  if (meta == null) {
    return Response.json({ error: E_NOT_FOUND }, { status: NOT_FOUND })
  }
  log({ tag: RESUME_LOG.tag, text: RESUME_LOG.fileSaved + user.id + RESUME_LOG.mimeFrag + mime + RESUME_LOG.fileB + buf.byteLength + RESUME_LOG.bSuffix })
  return Response.json({ meta })
}

/**
 * GET /api/resume/files:本人的简历清单(「我的简历」卡片:id、是否默认、文件名、类型、大小、上传时刻;默认那份在最前)。
 *
 * @param _req 请求。
 * @returns { items };未登录 401。
 */
export async function resumeFilesRoute(_req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const items = await loadResumeList({ db: await getDb(), userId: user.id })
  return Response.json({ items }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * POST /api/resume/match:简历对照 JD(G3)。铁律:① 简历默认不落库(内存里比完即弃),
 * 只有 body.save===true 才写 profile.resumeText;② 免费/付费闸在服务端(锁区正文不下发);
 * ③ 双闸控成本(#102 账单教训):登录墙 + 每账号每天 DAILY_FREE 次(计数落
 * profile.matchUses,成功后才计次 —— 模型抽风不该消耗额度)+ 两侧截断 + 免费不生成 rewrite。
 * jd 没带时按 jobId 走 jobDescription 统一入口兜一次(#139 同款;原实现把裸 apply_url 串
 * 传给了对象签名的 jobDescription —— 兜底链其实一直静默断着,本次接对)。
 * 错误码各说各话(2026-08-03):tooLong=删内容重试、busy=上游超时重试有用、llm=其余。
 *
 * @param req 请求(body 是 { jobId, jd, resume, lang, save })。
 * @returns 分层后的对照结果;未登录 401、太短/无 JD 400、超额 429、上游 502/504。
 */
// eslint-disable-next-line local/function-length -- 验形→jd 兜底→记账→LLM→解析→记账存档→分层一条流水,中间量(user/pro/used/meta)全程在手;拆开每段六七个参数穿一串
export async function resumeMatchRoute(req: Request): Promise<Response> {
  let body: MatchBody | null = null
  try {
    body = await req.json() as MatchBody
  } catch {
    body = null
  }
  let resume = BODY_TEXT_NONE
  let jd = BODY_TEXT_NONE
  let lang = LANG_FALLBACK_EN
  let save = false
  if (body != null) {
    if (typeof body.resume === 'string') {
      resume = body.resume.trim()
    }
    if (typeof body.jd === 'string') {
      jd = body.jd.trim()
    }
    if (typeof body.lang === 'string') {
      lang = body.lang
    }
    if (body.save === true) {
      save = true
    }
  }
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const pro = isPro(user)
  if (resume.length < MIN_RESUME) {
    return Response.json({ error: E_TOO_SHORT }, { status: BAD_REQUEST })
  }
  if (jd.length < JD_LEN_MIN && body != null && body.jobId != null) {
    let jdFromDb = JD_DB_NONE
    try {
      const db = await getDb()
      const applyUrl = await loadApplyUrlById({ db: db, jobId: Number(body.jobId) })
      if (applyUrl != null) {
        jdFromDb = (await jobDescription({ db: db, applyUrl: applyUrl, id: Number(body.jobId) })).trim()
      }
    } catch {
      jdFromDb = JD_DB_NONE
    }
    if (jdFromDb !== '') {
      jd = jdFromDb
    }
  }
  if (jd.length < JD_LEN_MIN) {
    return Response.json({ error: E_NO_JD }, { status: BAD_REQUEST })
  }
  const today = new Date().toISOString().slice(0, DATE_LEN)
  let usesCell = USES_CELL_NONE
  if (user.profile != null) {
    const prof = user.profile as MatchUsesProfile
    if (typeof prof.matchUses === 'string') {
      usesCell = prof.matchUses
    }
  }
  let used = 0
  const sep = usesCell.indexOf(USES_SEP)
  if (sep === DATE_LEN && usesCell.slice(0, DATE_LEN) === today) {
    const n = Number(usesCell.slice(sep + 1))
    if (Number.isFinite(n) && n > 0) {
      used = n
    }
  }
  if (pro === false && used >= DAILY_FREE) {
    return Response.json({ error: E_LIMIT, left: 0 }, { status: TOO_MANY })
  }
  const dbg = user.email.endsWith(TEST_MAIL_SUFFIX)
  let meta: ResultMeta = { cached: false, via: META_VIA_LEGACY, xCache: null }
  let maxTokens = MATCH_TOKENS_FREE
  if (pro) {
    maxTokens = MATCH_TOKENS_PRO
  }
  let text = LLM_TEXT_NONE
  try {
    text = await completeText({
      messages: matchPrompt({ jd: jd, resume: resume, lang: lang, pro: pro }),
      maxTokens: maxTokens, provider: MATCH_PROVIDER, temperature: MATCH_TEMPERATURE,
      onMeta: function onMeta(m: ResultMeta): void {
        meta = m
      },
    })
  } catch (e) {
    let msg = String(e)
    if (e instanceof Error) {
      msg = e.message
    }
    let code = LOG_DASH
    if (e instanceof Error && isLlmError(e) && e.code != null) {
      code = e.code
    }
    let mappedError = E_LLM
    let mappedStatus = BAD_GATEWAY
    if (code === CODE_TOO_LONG) {
      mappedError = E_TOO_LONG
      mappedStatus = BAD_REQUEST
    } else if (code === CODE_TIMEOUT) {
      mappedError = E_BUSY
      mappedStatus = GATEWAY_TIMEOUT
    }
    log({ tag: RESUME_LOG.tag, text: RESUME_LOG.matchLlmFail + user.id + RESUME_LOG.codeFrag + code + RESUME_LOG.arrow + mappedError + RESUME_LOG.jdCh + jd.length + RESUME_LOG.chSuffix + RESUME_LOG.resumeCh + resume.length + RESUME_LOG.chSuffix + RESUME_LOG.errSep + msg.slice(0, ERR_LOG_CAP) })
    if (dbg) {
      return Response.json({ error: mappedError, detail: msg.slice(0, DETAIL_CAP) }, { status: mappedStatus })
    }
    return Response.json({ error: mappedError }, { status: mappedStatus })
  }
  const parsed = parseLlmJson(text)
  const rows = normalizeRows(parsed)
  if (rows == null) {
    let xc = LOG_DASH
    if (meta.xCache != null) {
      xc = meta.xCache
    }
    log({ tag: RESUME_LOG.tag, text: RESUME_LOG.matchParseFail + user.id + RESUME_LOG.jdCh + jd.length + RESUME_LOG.chSuffix + RESUME_LOG.resumeCh + resume.length + RESUME_LOG.chSuffix + RESUME_LOG.viaFrag + meta.via + RESUME_LOG.xcacheFrag + xc + RESUME_LOG.rawFrag + text.slice(0, ERR_LOG_CAP) })
    if (dbg) {
      return Response.json({ error: E_PARSE, detail: text.slice(0, DETAIL_CAP) }, { status: BAD_GATEWAY })
    }
    return Response.json({ error: E_PARSE }, { status: BAD_GATEWAY })
  }
  let saved = false
  const patch: ProfilePatch = {}
  if (pro === false) {
    patch.matchUses = today + USES_SEP + (used + 1)
  }
  if (save) {
    patch.resumeText = resume.slice(0, RESUME_SAVE_CAP)
    patch.resumeSavedAt = new Date()
  }
  if (Object.keys(patch).length > 0) {
    try {
      await patchProfile({ userId: user.id, patch: patch })
      saved = save
    } catch (e) {
      let msg = String(e)
      if (e instanceof Error) {
        msg = e.message
      }
      let savedLen = 0
      if (save) {
        savedLen = resume.length
      }
      log({ tag: RESUME_LOG.tag, text: RESUME_LOG.profileWriteFail + user.id + RESUME_LOG.saveFrag + save + RESUME_LOG.resumeCh + savedLen + RESUME_LOG.chSuffix + RESUME_LOG.errSep + msg.slice(0, ERR_LOG_CAP) })
    }
  }
  const gated = gateMatch({ rows: rows, pro: pro })
  let rewrite: string | null = null
  if (pro && parsed != null && typeof parsed.rewrite === 'string') {
    rewrite = parsed.rewrite.trim().slice(0, REWRITE_CAP)
  }
  let left: number | null = null
  if (pro === false) {
    left = Math.max(0, DAILY_FREE - used - 1)
  }
  let xc = LOG_DASH
  if (meta.xCache != null) {
    xc = meta.xCache
  }
  log({ tag: RESUME_LOG.tag, text: RESUME_LOG.matchOk + user.id + RESUME_LOG.rowsFrag + rows.length + RESUME_LOG.proFrag + pro + RESUME_LOG.jdCh + jd.length + RESUME_LOG.chSuffix + RESUME_LOG.resumeCh + resume.length + RESUME_LOG.chSuffix + RESUME_LOG.viaFrag + meta.via + RESUME_LOG.xcacheFrag + xc + RESUME_LOG.savedFrag + saved })
  if (rewrite != null) {
    return Response.json({ visible: gated.visible, lockedN: gated.lockedN, hitN: gated.hitN, total: gated.total, rewrite: rewrite, left: left, saved: saved })
  }
  return Response.json({ visible: gated.visible, lockedN: gated.lockedN, hitN: gated.hitN, total: gated.total, left: left, saved: saved })
}
