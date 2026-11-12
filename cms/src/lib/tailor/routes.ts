/**
 * 按职位改写域的 HTTP 芯(2026-11-09):/api/tailor/step 跑一步、/api/tailor/state 取现状、/api/tailor/file 取将发出的 PDF。
 * 跨域能力(模型、PDF、投递行、试用账)都在这里注进 functions。
 *
 * @author Frank
 * @time 2026-11-09 18:00:00
 */
import { headers } from 'next/headers'
import * as PdfLib from 'pdf-lib'
import { COVER_MAX, coverPdfOf, letterCleanOf, letterSystemOf, pdfBadCharsOf } from '../apply'
import {
  isCreditOpen, loadApplyBlob, loadApplyJob, loadApplyPrefs, loadApplyResumes, loadApplyRow, loadCredit, markCredit,
} from '../apply/server'
import { cvBadCharsOf, cvLayoutOf, cvPdfOf, toCvDraft } from '../cv'
import { getDb } from '../db/server'
import {
  BAD_GATEWAY, BAD_REQUEST, CONFLICT, HDR_CACHE_CONTROL, HDR_CONTENT_TYPE, NOT_FOUND, PAYMENT_REQUIRED, TOO_MANY, UNAUTHORIZED, UNPROCESSABLE,
} from '../http'
import { isLlmError } from '../error'
import { jdPlainOf, jobDescriptionMarked, jobFormattedMarked, loadApplyUrlById } from '../jobs/server'
import { completeText, friendLlmReady } from '../llm'
import { APPLY_LOG, log } from '../log'
import { checkLimit, getUserOrNull } from '../quota/server'
import { extractText, parseLlmJson } from '../resume'
import {
  B64, CACHE_PRIVATE, E_AUTH, E_BASE, E_BODY, E_JOB, E_LIMIT, E_LLM, E_NONE, E_NO_JD, E_PRO, E_RESUME_BAD, E_SENT, KEY_SEP, KIND_COVER, MIME_PDF,
  KEY_EXTRA, P_JOB, P_KIND, STATUS_DRAFT, STATUS_QUEUED, PDF_NAME, FILL_DAILY, FILL_PREFIX, ROLE_SYSTEM, ROLE_USER, STEP_USER_DAILY, STEP_USER_PREFIX, TAILOR_MODEL, TAILOR_PROVIDER, THINKING_ROOM, TEXT_NONE,
  BOX_DIRECT, BOX_VIA_GATEWAY, FIX_DAILY, FIX_PREFIX, ONE_SPACE,
} from './constants'
import { loadExtra, loadTailorRow, pickJdOf, runStep, saveCover, saveExtra, saveResume, toStepBody } from './functions'
import type { CompleteIn, CoverBodyJson, CvPdfFact, FactMap, JsonCell, ResumeBodyJson, StepBodyJson, StepDeps } from './types'

/**
 * POST /api/tailor/step:跑一步(拆要求、写简历、写求职信、核对);回包的 next 告诉前端下一步。
 * 基础简历读不出文字按没有基础简历算。
 * 2026-11-10 补充经历写回基础简历:补充后重写的那一步先把全文存到基础简历行上,之后每一步、每个职位都把它当用户补充带上。
 * 2026-11-09 Frank 定额度:免费和会员都查额度账(lib/apply/credit),这一岗记过账的照跑不再扣,用完 402 并带额度档与恢复时刻;
 * 手动重新生成的每日次数记在库里(免费每份文件 1 次、会员 5 次,不耗额度)。
 *
 * @param req 请求(body 是 { jobId, step, facts, both, regen })。
 * @returns { next, review };未登录 401、超限 429、体不合形 400、岗不存在 404、没基础简历 409、额度用完 402、模型失败 502。
 */
// eslint-disable-next-line local/function-length -- 认人、限流、取岗、取简历、注入、按错误码回状态一条流水,中间量全程在手
export async function tailorStepRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: StepBodyJson = {}
  try {
    raw = await req.json() as StepBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const body = toStepBody(raw)
  if (body == null) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const limits: [string, number][] = [[STEP_USER_PREFIX + String(user.id), STEP_USER_DAILY]]
  if (body.fill) {
    limits.push([FILL_PREFIX + String(user.id) + KEY_SEP + String(body.jobId), FILL_DAILY])
  }
  if (body.fix > 0) {
    limits.push([FIX_PREFIX + String(user.id) + KEY_SEP + String(body.jobId) + KEY_SEP + String(body.fix), FIX_DAILY])
  }
  if (checkLimit(limits) === false) {
    return Response.json({ error: E_LIMIT }, { status: TOO_MANY })
  }
  const db = await getDb()
  const job = await loadApplyJob({ db, jobId: body.jobId })
  if (job == null) {
    return Response.json({ error: E_JOB }, { status: NOT_FOUND })
  }
  const credit = await loadCredit({ db, userId: user.id, jobId: job.id, proUntil: user.proUntil, nowMs: Date.now() })
  if (isCreditOpen(credit) === false) {
    return Response.json({ error: E_PRO, plan: credit.plan, resetAt: credit.resetAt }, { status: PAYMENT_REQUIRED })
  }
  const needMark = credit.here === false
  const resumes = await loadApplyResumes({ db, userId: user.id })
  const first = resumes[0]
  if (first == null) {
    return Response.json({ error: E_BASE }, { status: CONFLICT })
  }
  const blob = await loadApplyBlob({ db, userId: user.id, resumeId: first.id })
  let base = TEXT_NONE
  if (blob != null) {
    const got = await extractText({ name: blob.fileName, buf: Buffer.from(blob.b64, B64) })
    if (got.text != null) {
      base = got.text
    }
  }
  if (blob == null || base === TEXT_NONE) {
    return Response.json({ error: E_BASE }, { status: CONFLICT })
  }
  if (body.fill && body.extra !== TEXT_NONE) {
    await saveExtra({ db, userId: user.id, extra: body.extra })
  }
  const newFacts: FactMap = {}
  const extra = await loadExtra({ db, userId: user.id })
  if (extra !== TEXT_NONE) {
    newFacts[KEY_EXTRA] = extra
  }
  const applyUrl = await loadApplyUrlById({ db, jobId: job.id })
  let original = TEXT_NONE
  if (applyUrl != null) {
    original = (await jobDescriptionMarked({ db, applyUrl, id: job.id })).trim()
  }
  const formatted = await jobFormattedMarked({ db, id: job.id })
  const prior = await loadTailorRow({ db, userId: user.id, jobId: job.id })
  let priorReview = null
  if (prior != null) {
    priorReview = prior.review
  }
  const jd = jdPlainOf(pickJdOf({ formatted, original, review: priorReview })).trim()
  if (jd === TEXT_NONE) {
    return Response.json({ error: E_NO_JD }, { status: UNPROCESSABLE })
  }
  const prefs = await loadApplyPrefs({ db, userId: user.id })
  const deps: StepDeps = {
    complete: async function complete(x: CompleteIn): Promise<string> {
      return completeText({
        feature: x.feature, db, anthropicSchema: x.schema, maxTokens: x.maxTokens + THINKING_ROOM, provider: TAILOR_PROVIDER, anthropicModel: TAILOR_MODEL,
        messages: [{ role: ROLE_SYSTEM, content: x.system }, { role: ROLE_USER, content: x.user }],
      })
    },
    parse: function parse(s: string): JsonCell {
      return parseLlmJson(s) as JsonCell
    },
    cvPdf: async function cvPdf(cv: JsonCell): Promise<CvPdfFact> {
      if (cv == null || typeof cv !== 'object') {
        return { bytes: null, text: TEXT_NONE }
      }
      const layout = cvLayoutOf(toCvDraft(cv as object))
      if (layout.name === TEXT_NONE || cvBadCharsOf(layout).length > 0) {
        return { bytes: null, text: TEXT_NONE }
      }
      return { bytes: await cvPdfOf({ pdf: PdfLib, layout }), text: JSON.stringify(layout) }
    },
    pdfText: async function pdfText(b64: string): Promise<string> {
      const got = await extractText({ name: PDF_NAME, buf: Buffer.from(b64, B64) })
      if (got.text == null) {
        return TEXT_NONE
      }
      return got.text
    },
    coverSystem: function coverSystem(name: string): string {
      return letterSystemOf(name)
    },
    coverClean: letterCleanOf,
    box: async function box(x: CompleteIn): Promise<string> {
      let provider: typeof BOX_DIRECT | typeof BOX_VIA_GATEWAY = BOX_DIRECT
      if (friendLlmReady()) {
        provider = BOX_VIA_GATEWAY
      }
      try {
        return await completeText({
          feature: x.feature, db, maxTokens: x.maxTokens, provider,
          messages: [{ role: ROLE_SYSTEM, content: x.system }, { role: ROLE_USER, content: x.user }],
        })
      } catch (e) {
        log({ tag: APPLY_LOG.tag, text: APPLY_LOG.tailorFail + user.id + APPLY_LOG.whyFrag + x.feature + ONE_SPACE + String(e) })
        return TEXT_NONE
      }
    },
    badChars: pdfBadCharsOf,
    markTrial: async function markTrial(): Promise<void> {
      if (needMark) {
        await markCredit({ db, userId: user.id, jobId: job.id, plan: credit.plan })
      }
    },
  }
  try {
    const out = await runStep({
      db, userId: user.id, jobId: job.id, step: body.step, title: job.title, company: job.company, name: prefs.senderName, jd,
      resumeId: first.id, base, newFacts, both: body.both, regen: body.regen || body.fill, fix: body.fix, deps,
    })
    if (out.error === E_SENT) {
      return Response.json(out, { status: CONFLICT })
    }
    if (out.error === E_NONE) {
      return Response.json(out, { status: NOT_FOUND })
    }
    if (out.error === E_RESUME_BAD) {
      return Response.json(out, { status: UNPROCESSABLE })
    }
    if (out.error === E_LLM) {
      return Response.json(out, { status: BAD_GATEWAY })
    }
    return Response.json(out)
  } catch (e) {
    if (e instanceof Error && isLlmError(e)) {
      log({ tag: APPLY_LOG.tag, text: APPLY_LOG.tailorFail + user.id + APPLY_LOG.whyFrag + body.step })
      return Response.json({ error: E_LLM, next: TEXT_NONE, review: null }, { status: BAD_GATEWAY })
    }
    throw e
  }
}

/**
 * GET /api/tailor/state?job=:这一岗的现状(核对结果、有没有简历和求职信)。
 * 2026-11-10:职位描述带着行首节头标记「## 」给出去,前端按它把小标题加粗。
 *
 * @param req 请求。
 * @returns { review, hasResume, hasCover, status, cover, jd, extra, cv };未登录 401、id 不合形 400。
 */
export async function tailorStateRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const jobId = Number(new URL(req.url).searchParams.get(P_JOB))
  if (Number.isInteger(jobId) === false || jobId <= 0) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const row = await loadTailorRow({ db, userId: user.id, jobId })
  const extra = await loadExtra({ db, userId: user.id })
  const applyUrl = await loadApplyUrlById({ db, jobId })
  let original = TEXT_NONE
  if (applyUrl != null) {
    original = (await jobDescriptionMarked({ db, applyUrl, id: jobId })).trim()
  }
  const formatted = await jobFormattedMarked({ db, id: jobId })
  let rowReview = null
  if (row != null) {
    rowReview = row.review
  }
  const jd = pickJdOf({ formatted, original, review: rowReview }).trim()
  const applyRow = await loadApplyRow({ db, userId: user.id, jobId })
  let mail = TEXT_NONE
  if (applyRow != null) {
    mail = applyRow.mailBody
  }
  if (row == null) {
    return Response.json({ review: null, hasResume: false, hasCover: false, status: TEXT_NONE, cover: TEXT_NONE, jd, extra, cv: null, mail }, { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
  }
  let cv: object | null = null
  if (row.cv != null && typeof row.cv === 'object') {
    cv = toCvDraft(row.cv as object)
  }
  return Response.json(
    { review: row.review, hasResume: row.pdfB64 !== TEXT_NONE, hasCover: row.cover !== TEXT_NONE, status: row.status, cover: row.cover, jd, extra, cv, mail },
    { headers: { [HDR_CACHE_CONTROL]: CACHE_PRIVATE } },
  )
}

/**
 * PUT /api/tailor/cover:存用户手改的求职信(之后前端再跑一次核对)。
 *
 * @param req 请求(body 是 { jobId, cover })。
 * @returns { ok };未登录 401、体不合形 400、有写不进 PDF 的字 422、还没生成 404。
 */
export async function tailorCoverRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: CoverBodyJson = {}
  try {
    raw = await req.json() as CoverBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const jobId = Number(raw.jobId)
  if (Number.isInteger(jobId) === false || jobId <= 0 || typeof raw.cover !== 'string' || raw.cover.length > COVER_MAX) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  if (pdfBadCharsOf(raw.cover).length > 0) {
    return Response.json({ error: E_BODY }, { status: UNPROCESSABLE })
  }
  const db = await getDb()
  const row = await loadTailorRow({ db, userId: user.id, jobId })
  if (row == null || row.review == null) {
    return Response.json({ error: E_NONE }, { status: NOT_FOUND })
  }
  await saveCover({ db, userId: user.id, jobId, cover: raw.cover, review: row.review })
  return Response.json({ ok: true })
}

/**
 * PUT /api/tailor/resume:存用户手改的本岗简历(2026-11-10 任务书第 33 条),重排将发出的 PDF(之后前端再跑一次核对)。
 * 只改简介、技能和每段工作的要点;雇主、职位和日期照本岗简历原样,改这些等于改时间线。
 *
 * @param req 请求(body 是 { jobId, summary, skills, work })。
 * @returns { ok };未登录 401、体不合形 400、有写不进 PDF 的字 422、还没生成 404、已发出 409。
 */
export async function tailorResumeRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  let raw: ResumeBodyJson = {}
  try {
    raw = await req.json() as ResumeBodyJson
  } catch {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const jobId = Number(raw.jobId)
  if (Number.isInteger(jobId) === false || jobId <= 0 || typeof raw.summary !== 'string' || typeof raw.skills !== 'string' || Array.isArray(raw.work) === false) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const row = await loadTailorRow({ db, userId: user.id, jobId })
  if (row == null || row.review == null || row.cv == null || typeof row.cv !== 'object') {
    return Response.json({ error: E_NONE }, { status: NOT_FOUND })
  }
  if (row.status !== STATUS_DRAFT && row.status !== STATUS_QUEUED) {
    return Response.json({ error: E_SENT }, { status: CONFLICT })
  }
  const draft = toCvDraft(row.cv as object)
  draft.summary = raw.summary
  draft.skills = raw.skills
  for (const [i, w] of draft.work.entries()) {
    const desc = raw.work[i]
    if (typeof desc === 'string') {
      w.desc = desc
    }
  }
  const cv = toCvDraft(draft)
  const layout = cvLayoutOf(cv)
  if (layout.name === TEXT_NONE || cvBadCharsOf(layout).length > 0) {
    return Response.json({ error: E_BODY }, { status: UNPROCESSABLE })
  }
  const bytes = await cvPdfOf({ pdf: PdfLib, layout })
  await saveResume({ db, userId: user.id, jobId, cv, pdfB64: Buffer.from(bytes).toString(B64), review: row.review })
  return Response.json({ ok: true })
}

/**
 * GET /api/tailor/file?job=&kind=resume|cover:将发出的 PDF(预览用的就是发信用的那份字节)。
 *
 * @param req 请求。
 * @returns PDF;未登录 401、id 不合形 400、还没生成 404、求职信有坏字 422。
 */
export async function tailorFileRoute(req: Request): Promise<Response> {
  const user = await getUserOrNull(await headers())
  if (user == null) {
    return Response.json({ error: E_AUTH }, { status: UNAUTHORIZED })
  }
  const sp = new URL(req.url).searchParams
  const jobId = Number(sp.get(P_JOB))
  if (Number.isInteger(jobId) === false || jobId <= 0) {
    return Response.json({ error: E_BODY }, { status: BAD_REQUEST })
  }
  const db = await getDb()
  const row = await loadTailorRow({ db, userId: user.id, jobId })
  if (row == null) {
    return Response.json({ error: E_NONE }, { status: NOT_FOUND })
  }
  let bytes: Uint8Array = new Uint8Array(0)
  if (sp.get(P_KIND) === KIND_COVER) {
    if (row.cover === TEXT_NONE) {
      return Response.json({ error: E_NONE }, { status: NOT_FOUND })
    }
    if (pdfBadCharsOf(row.cover).length > 0) {
      return Response.json({ error: E_BODY }, { status: UNPROCESSABLE })
    }
    bytes = await coverPdfOf({ pdf: PdfLib, text: row.cover })
  } else {
    if (row.pdfB64 === TEXT_NONE) {
      return Response.json({ error: E_NONE }, { status: NOT_FOUND })
    }
    bytes = Buffer.from(row.pdfB64, B64)
  }
  return new Response(new Uint8Array(bytes), { headers: { [HDR_CONTENT_TYPE]: MIME_PDF, [HDR_CACHE_CONTROL]: CACHE_PRIVATE } })
}
