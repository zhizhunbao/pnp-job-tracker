/**
 * 站内投递(代投)域的 HTTP 芯:PUT /api/apply/draft(存署名、信与选用的简历,信同时记成「我的模板」)、
 * GET /api/apply/cover(求职信 PDF,本人预览)、GET /api/apply/file(「我的求职」一行的简历 / 求职信附件)、
 * POST /api/apply/letter(按 JD 写求职信)、GET /api/apply/start(投递区的起始态)、POST /api/apply/send(代发:简历 + 求职信 PDF 两个附件,
 * 回复地址 = 用户注册邮箱)、POST /api/apply/inbound(Resend 回调:退信 / 投诉记进退信名单;URL 按设计稿冻结,
 * 下一批中转回信同一个口)。都只给本人;雇主邮箱永不出响应。pdf-lib 只在本文件 import,注给 functions(审查 #9)。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */
import { headers } from 'next/headers'
import * as PdfLib from 'pdf-lib'
import { getDb } from '../db/server'
import {
  BAD_GATEWAY, BAD_REQUEST, CONFLICT, GONE, HDR_CACHE_CONTROL, HDR_CONTENT_DISPOSITION, HDR_CONTENT_TYPE, NOT_FOUND,
  PAYMENT_REQUIRED, TOO_LARGE, TOO_MANY, UNAUTHORIZED, UNAVAILABLE, UNPROCESSABLE,
} from '../http'
import { jobDescription, loadApplyUrlById } from '../jobs/server'
import { completeText } from '../llm'
import { APPLY_LOG, log } from '../log'
import { postMail, WHY_DISABLED } from '../mail'
import { LETTER_TRIAL_MAX, TRIAL_LETTER } from '../quota'
import {
  checkLimit, getUserOrNull, ipOf, isTrialOpen, loadTrial, markTrial, trialAfterOf, trialLeftOf,
} from '../quota/server'
import { extractText } from '../resume'
import {
  B64, CACHE_PRIVATE, COVER_LIMIT_DAILY, COVER_LIMIT_PREFIX, COVER_MAX, DISPOSITION_INLINE, DISPOSITION_TAIL,
  DRAFT_LIMIT_DAILY, DRAFT_LIMIT_PREFIX, E_AUTH, E_BODY, E_BOUNCED, E_BUSY, E_CHARS, E_CLOSED, E_DRAFT, E_JOB, E_LIMIT,
  E_LONG, E_MAIL, E_MAIL_OFF, E_NAME, E_TRIAL, E_NO_EMAIL, E_RESUME, E_SAME_EMAIL, E_SENT, E_SIG, HDR_NOSNIFF, HDR_SVIX_ID,
  HDR_SVIX_SIG, HDR_SVIX_TS, MIME_PDF, MS_PER_S, NOSNIFF, P_JOB, SEND_IP_DAILY, SEND_IP_PREFIX, SEND_LIMIT_DAILY,
  SEND_LIMIT_PREFIX, SITE_DAY_MAX, ST_DRAFT, ST_SENDING, TEXT_NONE, USER_DAY_MAX, WEBHOOK_SECRET,
  COVER_DEFAULT, KIND_COVER, LETTER_LIMIT_DAILY, LETTER_LIMIT_PREFIX, LETTER_MIN_LEN, LETTER_PROVIDER_ENV,
  LETTER_TEMPERATURE, LETTER_TOKENS_MAX, P_ID, P_KIND,
} from './constants'
import {
  bounceKindOf, claimApply, coverFileOf, coverFillOf, coverPdfOf, idemKeyOf, isBouncedEmail,
  isSameEmailRecent, isSenderName, isSvixValid, loadApplyBlob, loadApplyJob, loadApplyPrefs, loadApplyRow, loadApplyStart,
  loadSiteDayCount, loadUserDayCount, mailHtmlOf, mailSubjectOf, mailTextOf, markApplyBounced, markApplySent,
  pdfBadCharsOf, recipientOf, resumeFileOf, saveApplyDraft, saveApplyPrefs, senderFromOf, toDraftBody, toSendJobId, unclaimApply, webhookEmailIdOf,
  letterCleanOf, letterMessagesOf, letterProviderOf, loadApplyFile, toLetterBody,
} from './functions'
import type { DraftBodyJson, LetterBodyJson, SendBodyJson, WebhookJson } from './types'

/**
 * GET /api/apply/cover?job=:求职信 PDF(本人预览,在浏览器里直接打开)。有草稿渲草稿;
 * 没有草稿(再投捷径,审查 #1)按「我的模板」填本岗只读渲染,不建行。
 * 2026-10-07「我的模板」撤:没草稿回 404(信要先按 JD 写好、存进草稿)。
 *
 * @param req 请求(职位 id 在查询参数)。
 * @returns PDF 字节;未登录 401、超限 429、id 不合形 400、岗不存在 / 没草稿 404、有写不进 PDF 的字 422。
 */
export async function applyCoverRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  if (checkLimit([[COVER_LIMIT_PREFIX + String(user.id), COVER_LIMIT_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  const jobId = toSendJobId({ jobId: new URL(req.url).searchParams.get(P_JOB) })
  if (jobId == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const job = await loadApplyJob({ db, jobId })
  if (job == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  const row = await loadApplyRow({ db, userId: user.id, jobId })
  if (row == null) {
    return Response.json({ error: E_DRAFT }, { status: NOT_FOUND })
  }
  const cover = row.cover
  const chars = pdfBadCharsOf(cover)
  if (chars.length > 0) {
    return Response.json({ error: E_CHARS, chars }, { status: UNPROCESSABLE })
  }
  const bytes = await coverPdfOf({ pdf: PdfLib, text: cover })
  return new Response(new Uint8Array(bytes), {
    headers: {
      [HDR_CONTENT_TYPE]: MIME_PDF,
      [HDR_CONTENT_DISPOSITION]: DISPOSITION_INLINE + coverFileOf(job.company) + DISPOSITION_TAIL,
      [HDR_CACHE_CONTROL]: CACHE_PRIVATE,
      [HDR_NOSNIFF]: NOSNIFF,
    },
  })
}

/**
 * PUT /api/apply/draft:存英文署名、这一岗的信与选用的简历;信里填进去的职位名、公司名、署名按位置换回占位,
 * 同时记成「我的模板」(10-05 拍板 #1、#2)。投递页失焦 / 切步 / 离页都会存(审查 #8)。
 * 2026-10-07 改判(Frank「得根据 jd 写啊」):信由模型按 JD 每岗写一封,「我的模板」与换回占位撤,这里只存署名、信与简历。
 *
 * @param req 请求(body 是 { jobId, senderName, cover, resumeId })。
 * @returns { ok };未登录 401、超限 429、体不合形 400、署名不合规 422 name、有坏字 422 chars、太长 413、
 *   岗不存在 404、已经发出 409。
 */
export async function applyDraftRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  if (checkLimit([[DRAFT_LIMIT_PREFIX + String(user.id), DRAFT_LIMIT_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let raw: DraftBodyJson = {}
  try {
    raw = await req.json() as DraftBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const body = toDraftBody(raw)
  if (body == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  if (isSenderName(body.senderName) === false) {
    return Response.json({ error: E_NAME }, { status: UNPROCESSABLE })
  }
  const chars = pdfBadCharsOf(body.cover)
  if (chars.length > 0) {
    return Response.json({ error: E_CHARS, chars }, { status: UNPROCESSABLE })
  }
  if (body.cover.length > COVER_MAX) {
    return Response.json({ error: E_LONG }, { status: TOO_LARGE })
  }
  const db = await getDb()
  const job = await loadApplyJob({ db, jobId: body.jobId })
  if (job == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  await saveApplyPrefs({ db, userId: user.id, senderName: body.senderName, template: null })
  const saved = await saveApplyDraft({ db, userId: user.id, job, cover: body.cover, resumeId: body.resumeId })
  if (saved === false) {
    return Response.json({ error: E_SENT }, { status: CONFLICT })
  }
  return Response.json({ ok: true })
}

/**
 * GET /api/apply/start?job=:投递一节的起始态(2026-10-07 Frank「投递不应该跳到我的投递页面吗」→ 投递整个放进「我的」:
 * 原先由 /apply/<id> 的页面门 SSR 取,页面撤了改由「我的」页的投递一节来取)。本岗(不带雇主邮箱)、简历清单、署名、模板、状态。
 *
 * @param req 请求(职位 id 在查询参数)。
 * @returns 起始态;未登录 401、id 不合形 400、岗不存在 404。
 */
export async function applyStartRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const jobId = toSendJobId({ jobId: new URL(req.url).searchParams.get(P_JOB) })
  if (jobId == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const trial = await loadTrial({ db, userId: user.id, feature: TRIAL_LETTER, refId: jobId })
  const start = await loadApplyStart({
    db, userId: user.id, jobId, trialLeft: trialLeftOf({ user, trial, max: LETTER_TRIAL_MAX }), trialHere: trial.here,
  })
  if (start == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  return Response.json(start, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}

/**
 * GET /api/apply/file?id=<投递行>&kind=resume|cover:「我的求职」一行的附件(2026-10-07 Frank「我的简历 我的 cover letter
 * 是不是要跟着已投职位走」):简历给发出那一刻的原件快照,求职信按那一封全文现渲 PDF。只给本人、只给发出去了的。
 *
 * @param req 请求(投递行 id 与附件种类在查询参数)。
 * @returns 文件字节;未登录 401、id 不合形 400、不是本人的 / 还没发 / 没有快照 404。
 */
export async function applyFileRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const sp = new URL(req.url).searchParams
  const id = toSendJobId({ jobId: sp.get(P_ID) })
  if (id == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const file = await loadApplyFile({ db: await getDb(), userId: user.id, id })
  if (file == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  let bytes: Uint8Array = new Uint8Array(0)
  let mime = MIME_PDF
  let name = file.coverFile
  if (sp.get(P_KIND) === KIND_COVER) {
    bytes = await coverPdfOf({ pdf: PdfLib, text: file.cover })
  } else {
    if (file.resumeB64 === TEXT_NONE) {
      return Response.json({ error: E_RESUME }, { status: NOT_FOUND })
    }
    bytes = Buffer.from(file.resumeB64, B64)
    mime = file.resumeMime
    name = file.resumeFile
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      [HDR_CONTENT_TYPE]: mime,
      [HDR_CONTENT_DISPOSITION]: DISPOSITION_INLINE + name + DISPOSITION_TAIL,
      [HDR_CACHE_CONTROL]: CACHE_PRIVATE,
      [HDR_NOSNIFF]: NOSNIFF,
    },
  })
}

/**
 * POST /api/apply/inbound:Resend 回调(svix 签名)。永久退信与投诉 / 被抑制:那一封标退信、雇主邮箱进退信名单
 * (发送前拦,审查 #3);临时退信与别的事件只留痕。对不上投递行(提醒信的退信)回 200 不重试。
 *
 * @param req 请求(原始体用来验签)。
 * @returns { received };没配密钥 503、签名或时间戳不对 400。
 */
export async function applyInboundRoute(req: Request): Promise<Response> {
  if (WEBHOOK_SECRET === TEXT_NONE) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.noSecret })
    return Response.json({ error: E_MAIL_OFF }, { status: UNAVAILABLE })
  }
  const body = await req.text()
  const ok = await isSvixValid({
    secret: WEBHOOK_SECRET, id: String(req.headers.get(HDR_SVIX_ID)), ts: String(req.headers.get(HDR_SVIX_TS)),
    sigs: String(req.headers.get(HDR_SVIX_SIG)), body, nowS: Math.floor(Date.now() / MS_PER_S),
  })
  if (ok === false) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.badSig })
    return Response.json({ error: E_SIG }, { status: BAD_REQUEST })
  }
  let event: WebhookJson = {}
  try {
    event = JSON.parse(body) as WebhookJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const kind = bounceKindOf(event)
  const resendId = webhookEmailIdOf(event)
  if (kind === TEXT_NONE || resendId === TEXT_NONE) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.ignored + String(event.type) })
    return Response.json({ received: true })
  }
  const email = await markApplyBounced({ db: await getDb(), resendId, kind })
  if (email === TEXT_NONE) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.ignored + String(event.type) })
  } else {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.bounced + kind })
  }
  return Response.json({ received: true })
}

/**
 * POST /api/apply/letter:按这一岗的 JD 与所选简历写一封求职信(2026-10-07 Frank「得根据 jd 写啊」→「可以先用 qwen
 * 真有人付钱再说」「然后随时切换」):模型通道由环境变量 APPLY_LETTER_PROVIDER 定(默认朋友的 qwen)。
 * 只许用简历里的事实(见 prompts 的 LETTER_SYSTEM);简历抽不出字、没有 JD、模型挂了或写得太短,一律退回站上默认模板填本岗(ai = false)。
 * 不存库 —— 写好的信由投递页接着存草稿。
 *
 * @param req 请求(body 是 { jobId, resumeId, senderName })。
 * @returns { text, ai };未登录 401、超限 429、体不合形 400、署名不合规 422、岗不存在 404、简历不是本人的 409。
 */
export async function applyLetterRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  if (checkLimit([[LETTER_LIMIT_PREFIX + String(user.id), LETTER_LIMIT_DAILY]]) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let raw: LetterBodyJson = {}
  try {
    raw = await req.json() as LetterBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const body = toLetterBody(raw)
  if (body == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  if (isSenderName(body.senderName) === false) {
    return Response.json({ error: E_NAME }, { status: UNPROCESSABLE })
  }
  const db = await getDb()
  const job = await loadApplyJob({ db, jobId: body.jobId })
  if (job == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  const fallback = coverFillOf({ template: COVER_DEFAULT, title: job.title, company: job.company, name: body.senderName })
  const trial = await loadTrial({ db, userId: user.id, feature: TRIAL_LETTER, refId: job.id })
  const gate = { user, trial, max: LETTER_TRIAL_MAX }
  if (isTrialOpen(gate) === false) {
    return Response.json({ error: E_TRIAL, text: fallback, left: 0 }, { status: PAYMENT_REQUIRED })
  }
  const blob = await loadApplyBlob({ db, userId: user.id, resumeId: body.resumeId })
  if (blob == null) {
    return Response.json({ error: E_RESUME }, { status: CONFLICT })
  }
  const resume = await extractText({ name: blob.fileName, buf: Buffer.from(blob.b64, B64) })
  const applyUrl = await loadApplyUrlById({ db, jobId: job.id })
  let jd = TEXT_NONE
  if (applyUrl != null) {
    jd = (await jobDescription({ db, applyUrl, id: job.id })).trim()
  }
  if (resume.text == null || jd === TEXT_NONE) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.letterSkipped + user.id + APPLY_LOG.appFrag + job.id })
    return Response.json({ text: fallback, ai: false, left: trialLeftOf(gate) })
  }
  let out = TEXT_NONE
  try {
    out = letterCleanOf(await completeText({
      messages: letterMessagesOf({
        title: job.title, company: job.company, city: job.city, province: job.province, jd, resume: resume.text,
        name: body.senderName,
      }),
      maxTokens: LETTER_TOKENS_MAX, provider: letterProviderOf(LETTER_PROVIDER_ENV), temperature: LETTER_TEMPERATURE,
    }))
  } catch (e) {
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.letterFailed + user.id + APPLY_LOG.whyFrag + String(e) })
  }
  if (out.length < LETTER_MIN_LEN) {
    return Response.json({ text: fallback, ai: false, left: trialLeftOf(gate) })
  }
  await markTrial({ db, userId: user.id, feature: TRIAL_LETTER, refId: job.id })
  return Response.json({ text: out, ai: true, left: trialLeftOf({ user, trial: trialAfterOf(trial), max: LETTER_TRIAL_MAX }) })
}

/**
 * POST /api/apply/send:代发这一岗(设计稿 §3「applySendRoute 的顺序」):认人 → 取草稿、简历、雇主邮箱 →
 * 查额度与去重 →【批 C 挂点:免费额度用完回 402】→ 再判一次字符 → 认领(草稿 → sending)→ 渲染 PDF → 发信 →
 * 成功记 sent 与 Resend id,失败或没配密钥退回草稿并留痕。测试号收件方改投 Resend 测试地址。
 * 批 C 挂点在去重之后、判字符之前:isPro(user) === false 且已发数 ≥ FREE_APPLY_LIFETIME 时回 402 PAYMENT_REQUIRED。
 *
 * @param req 请求(body 是 { jobId })。
 * @returns { ok, id };错误码见设计稿接口表(401 / 400 / 404 / 409 / 410 / 422 / 429 / 502 / 503)。
 */
// eslint-disable-next-line local/function-length -- 设计稿定死的九步发送顺序,每步一个错误码,中间量(岗、草稿、署名、原件、认领 id)全程在手
export async function applySendRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const limits: [string, number][] = [
    [SEND_LIMIT_PREFIX + String(user.id), SEND_LIMIT_DAILY], [SEND_IP_PREFIX + ipOf(req), SEND_IP_DAILY],
  ]
  if (checkLimit(limits) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  let raw: SendBodyJson = {}
  try {
    raw = await req.json() as SendBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const jobId = toSendJobId(raw)
  if (jobId == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const job = await loadApplyJob({ db, jobId })
  if (job == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  if (job.closed) {
    return Response.json({ error: E_CLOSED }, { status: GONE })
  }
  if (job.email === TEXT_NONE) {
    return Response.json({ error: E_NO_EMAIL }, { status: GONE })
  }
  const row = await loadApplyRow({ db, userId: user.id, jobId })
  if (row == null) {
    return Response.json({ error: E_DRAFT }, { status: CONFLICT })
  }
  if (row.status !== ST_DRAFT && row.status !== ST_SENDING) {
    return Response.json({ error: E_SENT }, { status: CONFLICT })
  }
  const prefs = await loadApplyPrefs({ db, userId: user.id })
  if (isSenderName(prefs.senderName) === false) {
    return Response.json({ error: E_NAME }, { status: UNPROCESSABLE })
  }
  if (row.resumeId == null) {
    return Response.json({ error: E_RESUME }, { status: CONFLICT })
  }
  const blob = await loadApplyBlob({ db, userId: user.id, resumeId: row.resumeId })
  if (blob == null) {
    return Response.json({ error: E_RESUME }, { status: CONFLICT })
  }
  if (await loadUserDayCount({ db, userId: user.id }) >= USER_DAY_MAX) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  if (await loadSiteDayCount(db) >= SITE_DAY_MAX) {
    return Response.json({ error: E_BUSY }, { status: UNAVAILABLE })
  }
  if (await isBouncedEmail({ db, email: job.email })) {
    return Response.json({ error: E_BOUNCED }, { status: GONE })
  }
  if (await isSameEmailRecent({ db, userId: user.id, email: job.email, jobId })) {
    return Response.json({ error: E_SAME_EMAIL }, { status: CONFLICT })
  }
  const chars = pdfBadCharsOf(row.cover)
  if (chars.length > 0) {
    return Response.json({ error: E_CHARS, chars }, { status: UNPROCESSABLE })
  }
  const parts = { title: job.title, city: job.city, province: job.province, name: prefs.senderName }
  const subject = mailSubjectOf(parts)
  const bodyText = mailTextOf(parts)
  const to = recipientOf({ userEmail: user.email, employerEmail: job.email })
  const resumeFile = resumeFileOf({ name: prefs.senderName, mime: blob.mime })
  const coverFile = coverFileOf(job.company)
  const idemKey = await idemKeyOf({
    appId: row.id, parts: [to, subject, bodyText, row.cover, String(blob.id), blob.uploadedAt],
  })
  const appId = await claimApply({
    db, userId: user.id, jobId, employerEmail: job.email, replyTo: user.email, subject, bodyText, resumeFile,
    resumeUploadedAt: blob.uploadedAt, coverFile, idemKey, resumeB64: blob.b64, resumeMime: blob.mime,
  })
  if (appId == null) {
    return Response.json({ error: E_SENT }, { status: CONFLICT })
  }
  let coverB64 = TEXT_NONE
  try {
    coverB64 = Buffer.from(await coverPdfOf({ pdf: PdfLib, text: row.cover })).toString(B64)
  } catch (e) {
    await unclaimApply({ db, id: appId })
    const why = APPLY_LOG.appFrag + appId + APPLY_LOG.whyFrag + String(e)
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.failed + user.id + why })
    return Response.json({ error: E_CHARS, chars: [] }, { status: UNPROCESSABLE })
  }
  const sent = await postMail({
    to, subject, html: mailHtmlOf(bodyText), text: bodyText, from: senderFromOf(prefs.senderName), replyTo: user.email,
    attachments: [{ filename: resumeFile, content: blob.b64 }, { filename: coverFile, content: coverB64 }], idemKey,
  })
  if (sent.ok === false) {
    await unclaimApply({ db, id: appId })
    const why = APPLY_LOG.appFrag + appId + APPLY_LOG.whyFrag + sent.why
    log({ tag: APPLY_LOG.tag, text: APPLY_LOG.failed + user.id + why })
    if (sent.why === WHY_DISABLED) {
      return Response.json({ error: E_MAIL_OFF }, { status: UNAVAILABLE })
    }
    return Response.json({ error: E_MAIL }, { status: BAD_GATEWAY })
  }
  await markApplySent({ db, id: appId, resendId: sent.id })
  log({ tag: APPLY_LOG.tag, text: APPLY_LOG.sent + user.id + APPLY_LOG.appFrag + appId })
  return Response.json({ ok: true, id: appId })
}
