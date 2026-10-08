/**
 * 站内投递(代投)域的行为:求职信按模板填空与换回占位(按位置,不做全文替换)、WinAnsi 字符判定、
 * 投递信的标题 / 正文 / 发件人 / 附件名、幂等键、求职信 PDF 排版(pdf-lib 由 routes 注入)、退信回调验签,与取数写库。
 * 本文件经 index 门进浏览器包(投递页与服务端调同一个 `pdfBadCharsOf` / `coverFillOf`):不 import node 内置模块,
 * 摘要与验签走全局 Web Crypto;池由调用方注进来(方案 A)。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */
import { count, firstOf, numOrNull, queryRows, SQL, text } from '../db'
import type { Db } from '../db'
import {
  APPLY_FROM_ADDR, B64, BOUNCE_PERMANENT, COMBINING_RE, COVER_DEFAULT, COVER_FILE_FALLBACK, COVER_FILE_HEAD, CRLF_RE,
  DOT, EV_BOUNCED, EV_COMPLAINED, EV_SUPPRESSED, EXT_DOCX, EXT_PDF, FILE_SAFE_RE, FILE_SLUG_MAX, FONT_SIZE, FROM_GT,
  FROM_LT, FROM_UNSAFE_RE, FROM_VIA, HASH_SEP, HEX, HMAC_NAME, HTML_BR, HTML_ESC, HTML_ESC_RE, IDEM_HASH_LEN,
  IDEM_HEAD, IDEM_SEP, JOB_CLOSED, KEY_RAW, KEY_USAGE_VERIFY, KIND_BOUNCED, KIND_SUPPRESSED, LEADING, LOC_SEP,
  MAIL_ATTACH, MAIL_BODY_DOT, MAIL_BODY_HEAD, MAIL_BODY_IN, MAIL_BODY_QUOTE, MAIL_FOOT, MAIL_HELLO,
  MAIL_REGARDS, MARGIN, MIME_DOCX, NAME_RE, NEWLINE, NFKD, NON_ASCII_RE, PAGE_H, PAGE_W, PH_NAME, PH_TITLE,
  PLACEHOLDERS, RESUME_FILE_FALLBACK, RESUME_FILE_TAIL, SAME_EMAIL_DAYS, SHA_256, SPACE, SPAN_COMPANY, SPAN_NAME,
  SPAN_TITLE, SUBJECT_TPL, SVIX_SECRET_HEAD, SVIX_TOLERANCE_S, SVIX_V1, TAB_RE, TEST_BOUNCE_MARK, TEST_BOUNCE_TO,
  TEST_SUFFIX, TEST_TO, TEXT_NONE, UNDERSCORE, WINANSI_EXTRA,
  BLANK_LINE, BLANKS_RE, CLOSING_GAP_RE, CLOSING_TIGHT, COVER_MAX, LETTER_JD_MAX, LETTER_PROVIDERS, LETTER_RESUME_MAX, MD_MARK_RE, ROLE_SYSTEM,
  ROLE_USER, ST_DRAFT, THINK_RE,
} from './constants'
import { LETTER_LABELS, LETTER_SYSTEM } from './prompts'
import type {
  ApplyBlob, ApplyBlobDbRow, ApplyBlobIn, ApplyBlobOut, ApplyBounceIn, ApplyBounceOut, ApplyClaimIn, ApplyClaimOut,
  ApplyCountOut, ApplyDoneOut, ApplyDraftSaveIn, ApplyEmailIn, ApplyIdIn, ApplyJobDbRow, ApplyJobFact, ApplyJobIn,
  ApplyJobOut, ApplyJobRow, ApplyPrefs, ApplyPrefsDbRow, ApplyPrefsOut, ApplyPrefsSaveIn, ApplyResume, ApplyResumeDbRow,
  ApplyResumesOut, ApplyRowDbRow, ApplyRowFact, ApplyRowOut, ApplySentIn, ApplyStartIn, ApplyStartOut, ApplyUserIn, ApplyUserJobIn,
  ApplyWriteOut, BounceDbRow, BounceKind, CountDbRow, CoverFillIn, CoverLinesIn, CoverPdfIn, CoverPdfOut,
  CountList, DraftBodyJson, HardBreakIn, HitDbRow, IdDbRow,
  IdemKeyIn, IdemKeyOut, MailPartsIn, MaybeDraftBody, MaybeId, MaybePlaceholderHit, MeasureFn, MeasureMakeIn,
  NextPlaceholderIn, PdfFont, RecipientIn, ResumeFileIn, ResumePickIn, SameEmailIn, SendBodyJson, SpanValueIn,
  SvixIn, SvixOut, TextList, TimeCell, WebhookJson, WordLinesIn,
  ApplyFileDbRow, ApplyFileFact, ApplyFileIn, ApplyFileOut, LetterBodyJson, LetterMessages, LetterPromptIn,
  LetterProvider, MaybeLetterBody,
} from './types'

// =========================================================================
// 1. 求职信占位与字符
// =========================================================================

/**
 * 按模板填一封信,记下每处填进去的位置(存草稿时按位置换回占位 —— 10-05 拍板 #1)。
 * 2026-10-07 改判(Frank「得根据 jd 写啊」):信改由模型按 JD 写、每岗一封,「我的模板」与按位置换回占位撤;
 * 这里只剩写不成时的兜底 —— 按站上默认模板填本岗,不再记位置。
 *
 * @param x 模板与本岗的职位名、公司名、英文署名。
 * @returns 信的全文。
 */
export function coverFillOf(x: CoverFillIn): string {
  let out = TEXT_NONE
  let from = 0
  let hit = nextPlaceholderOf({ template: x.template, from })
  while (hit != null) {
    out += x.template.slice(from, hit.at)
    out += spanValueOf({ kind: hit.kind, title: x.title, company: x.company, name: x.name })
    from = hit.at + hit.ph.length
    hit = nextPlaceholderOf({ template: x.template, from })
  }
  return out + x.template.slice(from)
}

/**
 * 模板里从某处往后最近的一处占位(三种里取最靠前的)。
 *
 * @param x 模板与起点。
 * @returns 那一处;没有了给 null。
 */
function nextPlaceholderOf(x: NextPlaceholderIn): MaybePlaceholderHit {
  let best: MaybePlaceholderHit = null
  for (const p of PLACEHOLDERS) {
    const at = x.template.indexOf(p.ph, x.from)
    if (at >= 0 && (best == null || at < best.at)) {
      best = { at, ph: p.ph, kind: p.kind }
    }
  }
  return best
}

/**
 * 某种占位该填的值。
 *
 * @param x 种类与三个值。
 * @returns 值;不认识的种类给空串。
 */
function spanValueOf(x: SpanValueIn): string {
  if (x.kind === SPAN_TITLE) {
    return x.title
  }
  if (x.kind === SPAN_COMPANY) {
    return x.company
  }
  if (x.kind === SPAN_NAME) {
    return x.name
  }
  return TEXT_NONE
}

/**
 * 信的归一:换行统一成 \n,制表符换成空格(WinAnsi 写不进制表符)。
 *
 * @param raw 文本框交来的原文。
 * @returns 归一后的信。
 */
export function coverNormOf(raw: string): string {
  return raw.replace(CRLF_RE, NEWLINE).replace(TAB_RE, SPACE)
}

/**
 * 写不进求职信 PDF 的字(Helvetica 的 WinAnsi 编码:可打印 ASCII、Latin-1 补充段与 cp1252 的 27 个字;换行另算)。
 * 投递页与服务端调同一个(设计稿 P2;单测拿 pdf-lib 真编码器对过整个 BMP)。
 *
 * @param s 一段字(信或署名)。
 * @returns 去重后的坏字(按出现先后);没有给空数组。
 */
export function pdfBadCharsOf(s: string): TextList {
  const bad: string[] = []
  for (const ch of s) {
    if (isWinAnsi(ch) === false && ch !== NEWLINE && bad.includes(ch) === false) {
      bad.push(ch)
    }
  }
  return bad
}

/**
 * 一个字 WinAnsi 写不写得进。
 *
 * @param ch 一个字(按码点取)。
 * @returns 写得进 true。
 */
function isWinAnsi(ch: string): boolean {
  const c = ch.codePointAt(0)
  if (c == null) {
    return false
  }
  // eslint-disable-next-line local/no-magic-number -- WinAnsi 码段边界(0x20–0x7E 可打印 ASCII、0xA0–0xFF Latin-1 补充),就是编码表本身
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.includes(ch)
}

/**
 * 英文署名合不合规(10-05 拍板 Q2:只许 WinAnsi 能写的西文字母、空格与 .'-,2~60 字)。
 *
 * @param name 去过头尾空格的署名。
 * @returns 合规 true。
 */
export function isSenderName(name: string): boolean {
  return NAME_RE.test(name)
}

// =========================================================================
// 2. 投递信与附件
// =========================================================================

/**
 * 投递信标题。
 *
 * @param x 本岗与署名。
 * @returns 标题。
 */
export function mailSubjectOf(x: MailPartsIn): string {
  return SUBJECT_TPL.replace(PH_TITLE, x.title).replace(PH_NAME, x.name)
}

/**
 * 投递信正文(纯文本;2026-10-07 自 components/jobs 的 mailto 正文搬来,改成附简历与求职信、英文署名落款)。
 *
 * @param x 本岗与署名。
 * @returns 正文(含来源说明)。
 */
export function mailTextOf(x: MailPartsIn): string {
  const loc = [x.city, x.province].filter(Boolean)
  let inLoc = TEXT_NONE
  if (loc.length > 0) {
    inLoc = MAIL_BODY_IN + loc.join(LOC_SEP)
  }
  const lines = [
    MAIL_HELLO, TEXT_NONE,
    MAIL_BODY_HEAD + x.title + MAIL_BODY_QUOTE + inLoc + MAIL_BODY_DOT + SPACE + MAIL_ATTACH, TEXT_NONE,
    MAIL_REGARDS, x.name,
  ]
  return lines.join(NEWLINE) + MAIL_FOOT
}

/**
 * 纯文本正文 → HTML(逐字转义,换行成 `<br>`)。
 *
 * @param s 纯文本正文。
 * @returns HTML 正文。
 */
export function mailHtmlOf(s: string): string {
  return s.replace(HTML_ESC_RE, htmlEscOf).split(NEWLINE).join(HTML_BR)
}

/**
 * 一个要转义的字 → 实体。
 *
 * @param ch 那个字。
 * @returns 实体(表里没有原样给回)。
 */
function htmlEscOf(ch: string): string {
  const e = HTML_ESC[ch]
  if (e == null) {
    return ch
  }
  return e
}

/**
 * 发件人「<英文名> via Offer2PR <apply@…>」:显示名转 ASCII,去掉引号、反斜杠、尖括号与换行(防头注入)。
 *
 * @param name 英文署名。
 * @returns 发件人。
 */
export function senderFromOf(name: string): string {
  const shown = asciiOf(name).replace(FROM_UNSAFE_RE, TEXT_NONE).trim()
  return shown + FROM_VIA + FROM_LT + APPLY_FROM_ADDR + FROM_GT
}

/**
 * 西文转 ASCII:NFKD 拆出重音再删,剩下的非 ASCII(含换行)一律去掉。
 *
 * @param s 原文。
 * @returns ASCII 串。
 */
export function asciiOf(s: string): string {
  return s.normalize(NFKD).replace(COMBINING_RE, TEXT_NONE).replace(NON_ASCII_RE, TEXT_NONE)
}

/**
 * 简历附件名 `<署名>_Resume.<pdf|docx>`(原文件名只在本人预览时用)。
 *
 * @param x 署名与原件 MIME。
 * @returns 附件名。
 */
export function resumeFileOf(x: ResumeFileIn): string {
  let ext = EXT_PDF
  if (x.mime === MIME_DOCX) {
    ext = EXT_DOCX
  }
  const head = fileSlugOf(x.name)
  if (head === TEXT_NONE) {
    return RESUME_FILE_FALLBACK + ext
  }
  return head + RESUME_FILE_TAIL + ext
}

/**
 * 文件名的西文段:转 ASCII、非字母数字折成下划线、去头尾下划线、最长 60 字。
 *
 * @param s 原文(公司名 / 署名)。
 * @returns 西文段;转完为空给空串(调用方换整名兜底)。
 */
export function fileSlugOf(s: string): string {
  const parts = asciiOf(s).replace(FILE_SAFE_RE, UNDERSCORE).split(UNDERSCORE).filter(Boolean)
  return parts.join(UNDERSCORE).slice(0, FILE_SLUG_MAX)
}

/**
 * 求职信附件名 `Cover_Letter_<公司>.pdf`。
 *
 * @param company 公司名。
 * @returns 附件名。
 */
export function coverFileOf(company: string): string {
  const slug = fileSlugOf(company)
  if (slug === TEXT_NONE) {
    return COVER_FILE_FALLBACK + EXT_PDF
  }
  return COVER_FILE_HEAD + slug + EXT_PDF
}

/**
 * 实际收件人:测试号(@test.local)一律改投 Resend 测试地址,本地部分含 bounce 的改投退信测试地址
 * (dev 直连生产库,测试不能真发到雇主那里)。
 *
 * @param x 用户注册邮箱与雇主邮箱。
 * @returns 收件地址。
 */
export function recipientOf(x: RecipientIn): string {
  const mail = x.userEmail.toLowerCase()
  if (mail.endsWith(TEST_SUFFIX) === false) {
    return x.employerEmail
  }
  if (mail.slice(0, mail.length - TEST_SUFFIX.length).includes(TEST_BOUNCE_MARK)) {
    return TEST_BOUNCE_TO
  }
  return TEST_TO
}

/**
 * 幂等键 `apply-<投递号>-<内容哈希前 16 位>`(审查 #2:改了信再发不撞 Resend 24 小时的同键异载 409)。
 *
 * @param x 投递行 id 与这一封会变的各段。
 * @returns 幂等键。
 */
export async function idemKeyOf(x: IdemKeyIn): IdemKeyOut {
  const digest = await crypto.subtle.digest(SHA_256, new TextEncoder().encode(x.parts.join(HASH_SEP)))
  const hex = Buffer.from(digest).toString(HEX).slice(0, IDEM_HASH_LEN)
  return IDEM_HEAD + String(x.appId) + IDEM_SEP + hex
}

// =========================================================================
// 3. 求职信 PDF
// =========================================================================

/**
 * 求职信渲染成 PDF(Letter 纸、一英寸边距、Helvetica 11 号;自动分页;不写日期与生成时刻 ——
 * 同一封重渲逐字节相同,幂等键才不撞)。字符先过 `pdfBadCharsOf`,坏字到这里会被 pdf-lib 抛错。
 *
 * @param x 注进来的 pdf-lib 与信。
 * @returns PDF 字节。
 */
export async function coverPdfOf<F extends PdfFont>(x: CoverPdfIn<F>): CoverPdfOut {
  const doc = await x.pdf.PDFDocument.create({ updateMetadata: false })
  const font = await doc.embedFont(x.pdf.StandardFonts.Helvetica)
  const lines = coverLinesOf({
    text: coverNormOf(x.text), measure: makeMeasure({ font, size: FONT_SIZE }), maxWidth: PAGE_W - MARGIN - MARGIN,
  })
  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN - FONT_SIZE
  for (const line of lines) {
    if (y < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN - FONT_SIZE
    }
    if (line !== TEXT_NONE) {
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font })
    }
    y -= LEADING
  }
  return doc.save()
}

/**
 * 造一个按某字体某字号量字宽的函数。
 *
 * @param x 字体与字号。
 * @returns 量字宽的函数。
 */
export function makeMeasure(x: MeasureMakeIn): MeasureFn {
  return function measure(s: string): number {
    return x.font.widthOfTextAtSize(s, x.size)
  }
}

/**
 * 把信排成行:按段落(换行)分,段内按词换行,一个词比版心还宽就按字硬断;空段落留空行。
 *
 * @param x 信、量字宽与版心宽。
 * @returns 各行。
 */
export function coverLinesOf(x: CoverLinesIn): TextList {
  let out: string[] = []
  for (const para of x.text.split(NEWLINE)) {
    out = out.concat(wordLinesOf({ para, measure: x.measure, maxWidth: x.maxWidth }))
  }
  return out
}

/**
 * 一段按词排成若干行(空段落 = 一个空行)。
 *
 * @param x 一段、量字宽与版心宽。
 * @returns 各行。
 */
function wordLinesOf(x: WordLinesIn): TextList {
  const out: string[] = []
  let cur = TEXT_NONE
  for (const word of x.para.split(SPACE)) {
    for (const piece of hardBreakOf({ word, measure: x.measure, maxWidth: x.maxWidth })) {
      let tryLine = piece
      if (cur !== TEXT_NONE) {
        tryLine = cur + SPACE + piece
      }
      if (cur === TEXT_NONE || x.measure(tryLine) <= x.maxWidth) {
        cur = tryLine
      } else {
        out.push(cur)
        cur = piece
      }
    }
  }
  out.push(cur)
  return out
}

/**
 * 一个词按字硬断成不超过版心宽的几截(放得下就原样一截)。
 *
 * @param x 词、量字宽与版心宽。
 * @returns 各截。
 */
function hardBreakOf(x: HardBreakIn): TextList {
  if (x.measure(x.word) <= x.maxWidth) {
    return [x.word]
  }
  const out: string[] = []
  let cur = TEXT_NONE
  for (const ch of x.word) {
    if (cur !== TEXT_NONE && x.measure(cur + ch) > x.maxWidth) {
      out.push(cur)
      cur = TEXT_NONE
    }
    cur += ch
  }
  out.push(cur)
  return out
}

// =========================================================================
// 4. 退信回调
// =========================================================================

/**
 * Svix 手动验签(Resend 回调):`id.ts.body` 做 HMAC-SHA256,与头里任一 `v1,<base64>` 相等即过;时间戳偏差超 300 秒拒。
 * 比对走 Web Crypto 的 verify(常数时间)。依据 https://docs.svix.com/receiving/verifying-payloads/how-manual 。
 *
 * @param x 密钥、三个头、原始请求体与当前时刻。
 * @returns 过了 true。
 */
export async function isSvixValid(x: SvixIn): SvixOut {
  const ts = Number(x.ts)
  if (x.secret === TEXT_NONE || x.id === TEXT_NONE || Number.isFinite(ts) === false) {
    return false
  }
  if (Math.abs(x.nowS - ts) > SVIX_TOLERANCE_S) {
    return false
  }
  let raw = x.secret
  if (raw.startsWith(SVIX_SECRET_HEAD)) {
    raw = raw.slice(SVIX_SECRET_HEAD.length)
  }
  const key = await crypto.subtle.importKey(
    KEY_RAW, new Uint8Array(Buffer.from(raw, B64)), { name: HMAC_NAME, hash: SHA_256 }, false, [KEY_USAGE_VERIFY],
  )
  const data = new TextEncoder().encode(x.id + DOT + x.ts + DOT + x.body)
  for (const part of x.sigs.split(SPACE)) {
    if (part.startsWith(SVIX_V1)) {
      const sig = new Uint8Array(Buffer.from(part.slice(SVIX_V1.length), B64))
      if (await crypto.subtle.verify(HMAC_NAME, key, sig, data)) {
        return true
      }
    }
  }
  return false
}

/**
 * 回调该记成什么:永久退信 → bounced;投诉 / 被抑制 → suppressed;其余(临时退信、别的事件)只留痕。
 *
 * @param x 回调体。
 * @returns 名单种类;空串 = 不记名单。
 */
export function bounceKindOf(x: WebhookJson): BounceKind {
  if (x.type === EV_COMPLAINED || x.type === EV_SUPPRESSED) {
    return KIND_SUPPRESSED
  }
  if (x.type === EV_BOUNCED && x.data != null && x.data.bounce != null && x.data.bounce.type === BOUNCE_PERMANENT) {
    return KIND_BOUNCED
  }
  return TEXT_NONE
}

/**
 * 回调里那一封的 Resend 邮件 id。
 *
 * @param x 回调体。
 * @returns 邮件 id;没有给空串。
 */
export function webhookEmailIdOf(x: WebhookJson): string {
  if (x.data == null || typeof x.data.email_id !== 'string') {
    return TEXT_NONE
  }
  return x.data.email_id
}

// =========================================================================
// 5. 请求体收窄
// =========================================================================

/**
 * 草稿请求体收窄:职位 id 正整数、署名与信是串、简历 id 正整数或缺席;不合形给 null(2026-10-07 填入位置撤)。
 *
 * @param raw 请求体原样。
 * @returns 收窄后的请求体或 null。
 */
export function toDraftBody(raw: DraftBodyJson): MaybeDraftBody {
  const jobId = toSendJobId({ jobId: raw.jobId })
  if (jobId == null || typeof raw.senderName !== 'string' || typeof raw.cover !== 'string') {
    return null
  }
  let resumeId: number | null = null
  const rid = Number(raw.resumeId)
  if (raw.resumeId != null && Number.isInteger(rid) && rid > 0) {
    resumeId = rid
  }
  return { jobId, senderName: raw.senderName.trim(), cover: coverNormOf(raw.cover), resumeId }
}

/**
 * 发送请求体(或查询参数)里的职位 id。
 *
 * @param raw 请求体原样。
 * @returns 职位 id;不合形给 null。
 */
export function toSendJobId(raw: SendBodyJson): MaybeId {
  const jobId = Number(raw.jobId)
  if (Number.isInteger(jobId) === false || jobId <= 0) {
    return null
  }
  return jobId
}

// =========================================================================
// 6. 库行与取数
// =========================================================================

/**
 * 投递页的起始态(页面门 SSR 调):本岗、简历清单、署名、模板、这一岗的状态与选用的简历。
 *
 * @param x 连接、用户 id 与职位 id。
 * @returns 起始态;岗不存在给 null。
 */
export async function loadApplyStart(x: ApplyStartIn): ApplyStartOut {
  const job = await loadApplyJob({ db: x.db, jobId: x.jobId })
  if (job == null) {
    return null
  }
  const resumes = await loadApplyResumes({ db: x.db, userId: x.userId })
  const prefs = await loadApplyPrefs({ db: x.db, userId: x.userId })
  const row = await loadApplyRow(x)
  let status = TEXT_NONE
  let saved: number | null = null
  let sentAt = TEXT_NONE
  let cover = TEXT_NONE
  if (row != null) {
    status = row.status
    saved = row.resumeId
    sentAt = row.sentAt
    if (row.status === ST_DRAFT) {
      cover = row.cover
    }
  }
  return {
    job: applyJobRowOf(job), resumes, senderName: prefs.senderName, template: prefs.template, status, cover,
    resumeId: resumePickOf({ saved, resumes }), sentAt, trialLeft: x.trialLeft, trialHere: x.trialHere,
  }
}

/**
 * 本岗(含雇主邮箱,只在服务端用)。
 *
 * @param x 连接与职位 id。
 * @returns 本岗;不存在给 null。
 */
export async function loadApplyJob(x: ApplyJobIn): ApplyJobOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.APPLY_JOB, params: [x.jobId], map: toApplyJob }))
}

/**
 * 本岗库行 → 事实。
 *
 * @param r 库行。
 * @returns 本岗。
 */
export function toApplyJob(r: ApplyJobDbRow): ApplyJobFact {
  return {
    id: count(r.id), title: text(r.title), company: text(r.company_name), city: text(r.city),
    province: text(r.province), closed: r.job_status === JOB_CLOSED, email: text(r.apply_email).trim(),
  }
}

/**
 * 本岗 → 下发给投递页的那一份(雇主邮箱不出服务端)。
 *
 * @param j 本岗。
 * @returns 下发的本岗。
 */
export function applyJobRowOf(j: ApplyJobFact): ApplyJobRow {
  return {
    id: j.id, title: j.title, company: j.company, city: j.city, province: j.province, closed: j.closed,
    hasEmail: j.email !== TEXT_NONE,
  }
}

/**
 * 本人的简历清单(默认那份在最前)。
 *
 * @param x 连接与用户 id。
 * @returns 清单。
 */
export async function loadApplyResumes(x: ApplyUserIn): ApplyResumesOut {
  return queryRows({ db: x.db, sql: SQL.APPLY_RESUMES, params: [x.userId], map: toApplyResume })
}

/**
 * 简历库行 → 一份简历。
 *
 * @param r 库行。
 * @returns 一份简历。
 */
export function toApplyResume(r: ApplyResumeDbRow): ApplyResume {
  return {
    id: count(r.id), fileName: text(r.file_name), mime: text(r.mime), uploadedAt: isoOf(r.uploaded_at),
    isDefault: r.is_default === true,
  }
}

/**
 * 时刻格 → ISO 串(空折空串)。
 *
 * @param x 库回的时刻格。
 * @returns ISO 串。
 */
function isoOf(x: TimeCell): string {
  if (x == null) {
    return TEXT_NONE
  }
  if (x instanceof Date) {
    return x.toISOString()
  }
  return x
}

/**
 * 本人的投递偏好(没有给空署名 + 站上默认模板)。
 *
 * @param x 连接与用户 id。
 * @returns 偏好。
 */
export async function loadApplyPrefs(x: ApplyUserIn): ApplyPrefsOut {
  const row = firstOf(await queryRows({ db: x.db, sql: SQL.APPLY_PREFS_GET, params: [x.userId], map: toApplyPrefs }))
  if (row == null) {
    return { senderName: TEXT_NONE, template: COVER_DEFAULT }
  }
  return row
}

/**
 * 偏好库行 → 偏好(没模板给站上默认)。
 *
 * @param r 库行。
 * @returns 偏好。
 */
export function toApplyPrefs(r: ApplyPrefsDbRow): ApplyPrefs {
  let template = text(r.cover_template)
  if (template === TEXT_NONE) {
    template = COVER_DEFAULT
  }
  return { senderName: text(r.sender_name), template }
}

/**
 * 本人这一岗的投递行。
 *
 * @param x 连接、用户 id 与职位 id。
 * @returns 投递行;没有给 null。
 */
export async function loadApplyRow(x: ApplyUserJobIn): ApplyRowOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.APPLY_ROW, params: [x.userId, x.jobId], map: toApplyRow }))
}

/**
 * 投递行库行 → 投递行。
 *
 * @param r 库行。
 * @returns 投递行。
 */
export function toApplyRow(r: ApplyRowDbRow): ApplyRowFact {
  return {
    id: count(r.id), status: text(r.status), cover: text(r.cover_text), resumeId: numOrNull(r.resume_id),
    sentAt: isoOf(r.sent_at),
  }
}

/**
 * 选用哪一份简历:草稿里记的那份还在就用它,否则默认那份(清单默认在最前),一份都没有给 null。
 *
 * @param x 草稿里记的与本人的清单。
 * @returns 简历 id 或 null。
 */
export function resumePickOf(x: ResumePickIn): MaybeId {
  for (const r of x.resumes) {
    if (r.id === x.saved) {
      return r.id
    }
  }
  const first = firstOf(x.resumes)
  if (first == null) {
    return null
  }
  return first.id
}

/**
 * 本人某一份简历的原件。
 *
 * @param x 连接、用户 id 与简历 id。
 * @returns 原件;没有或不是本人的给 null。
 */
export async function loadApplyBlob(x: ApplyBlobIn): ApplyBlobOut {
  return firstOf(await queryRows({
    db: x.db, sql: SQL.APPLY_RESUME_BLOB, params: [x.userId, x.resumeId], map: toApplyBlob,
  }))
}

/**
 * 原件库行 → 原件。
 *
 * @param r 库行。
 * @returns 原件。
 */
export function toApplyBlob(r: ApplyBlobDbRow): ApplyBlob {
  return {
    id: count(r.id), b64: text(r.file_b64), fileName: text(r.file_name), mime: text(r.mime),
    uploadedAt: isoOf(r.uploaded_at),
  }
}

/**
 * 写投递偏好(null 的格保留原值)。
 *
 * @param x 连接、用户 id、署名与模板。
 * @returns 无。
 */
export async function saveApplyPrefs(x: ApplyPrefsSaveIn): ApplyWriteOut {
  await x.db.query(SQL.APPLY_PREFS_PUT, [x.userId, x.senderName, x.template])
}

/**
 * 存草稿(没有就建;还是草稿才改;已经发出的不动)。
 *
 * @param x 连接、用户 id、本岗、信与简历 id。
 * @returns 写进去了 true;已发出 / 正在发 false。
 */
export async function saveApplyDraft(x: ApplyDraftSaveIn): ApplyDoneOut {
  const rows = await queryRows({
    db: x.db, sql: SQL.APPLY_DRAFT_PUT,
    params: [x.userId, x.job.id, x.job.title, x.job.company, x.cover, x.resumeId], map: toId,
  })
  return rows.length > 0
}

/**
 * id 库行 → id。
 *
 * @param r 库行。
 * @returns id。
 */
export function toId(r: IdDbRow): number {
  return count(r.id)
}

/**
 * 认领发送(草稿 → sending,同时落快照;连点 / 并发只有一个认领得到)。
 *
 * @param x 连接、用户 id、职位 id 与这一封的快照。
 * @returns 投递行 id;认领不到给 null。
 */
export async function claimApply(x: ApplyClaimIn): ApplyClaimOut {
  return firstOf(await queryRows({
    db: x.db, sql: SQL.APPLY_CLAIM,
    params: [
      x.userId, x.jobId, x.employerEmail, x.replyTo, x.subject, x.bodyText, x.resumeFile, x.resumeUploadedAt,
      x.coverFile, x.idemKey, x.resumeB64, x.resumeMime,
    ],
    map: toId,
  }))
}

/**
 * 记发出(状态 sent、Resend id、发出时刻)。
 *
 * @param x 连接、投递行 id 与 Resend id。
 * @returns 无。
 */
export async function markApplySent(x: ApplySentIn): ApplyWriteOut {
  await x.db.query(SQL.APPLY_SENT, [x.id, x.resendId])
}

/**
 * 没发出去:退回草稿(可以再点发送)。
 *
 * @param x 连接与投递行 id。
 * @returns 无。
 */
export async function unclaimApply(x: ApplyIdIn): ApplyWriteOut {
  await x.db.query(SQL.APPLY_UNCLAIM, [x.id])
}

/**
 * 本人近 24 小时发出几封。
 *
 * @param x 连接与用户 id。
 * @returns 封数。
 */
export async function loadUserDayCount(x: ApplyUserIn): ApplyCountOut {
  return firstOrZero(await queryRows({ db: x.db, sql: SQL.APPLY_USER_DAY, params: [x.userId], map: toCount }))
}

/**
 * 计数库行 → 个数。
 *
 * @param r 库行。
 * @returns 个数。
 */
export function toCount(r: CountDbRow): number {
  return count(r.n)
}

/**
 * 计数查询的结果(没行给 0)。
 *
 * @param rows 计数行。
 * @returns 个数。
 */
function firstOrZero(rows: CountList): number {
  const n = firstOf(rows)
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 全站近 24 小时发出几封。
 *
 * @param db 能查的连接(调用方注入)。
 * @returns 封数。
 */
export async function loadSiteDayCount(db: Db): ApplyCountOut {
  return firstOrZero(await queryRows({ db, sql: SQL.APPLY_SITE_DAY, params: [], map: toCount }))
}

/**
 * 同一用户近 N 天给同一个雇主邮箱投过别的岗没有(审查 #4)。
 *
 * @param x 连接、用户 id、雇主邮箱与本岗 id。
 * @returns 投过 true。
 */
export async function isSameEmailRecent(x: SameEmailIn): ApplyDoneOut {
  const rows = await queryRows({
    db: x.db, sql: SQL.APPLY_SAME_EMAIL, params: [x.userId, x.email, x.jobId, SAME_EMAIL_DAYS], map: toHit,
  })
  return rows.length > 0
}

/**
 * 「有没有」库行 → 有。
 *
 * @param r 库行。
 * @returns 有 true。
 */
export function toHit(r: HitDbRow): boolean {
  return r.hit != null
}

/**
 * 雇主邮箱在不在退信名单里。
 *
 * @param x 连接与邮箱。
 * @returns 在 true。
 */
export async function isBouncedEmail(x: ApplyEmailIn): ApplyDoneOut {
  const rows = await queryRows({ db: x.db, sql: SQL.APPLY_BOUNCED_HIT, params: [x.email], map: toHit })
  return rows.length > 0
}

/**
 * 退信记账:按 Resend id 把那一封标成退信,雇主邮箱记进退信名单。
 *
 * @param x 连接、Resend id 与名单种类。
 * @returns 记进名单的邮箱;对不上投递行给空串(什么都没记)。
 */
export async function markApplyBounced(x: ApplyBounceIn): ApplyBounceOut {
  const rows = await queryRows({ db: x.db, sql: SQL.APPLY_BOUNCE_MARK, params: [x.resendId], map: toBounceEmail })
  const email = firstOf(rows)
  if (email == null || email === TEXT_NONE) {
    return TEXT_NONE
  }
  await x.db.query(SQL.APPLY_BOUNCE_LIST, [email, x.kind])
  return email
}

/**
 * 退信对账回行 → 雇主邮箱。
 *
 * @param r 库行。
 * @returns 邮箱(没有 = 空串)。
 */
export function toBounceEmail(r: BounceDbRow): string {
  return text(r.employer_email)
}

// =========================================================================
// 7. 按 JD 写求职信与「我的求职」附件(2026-10-07)
// =========================================================================

/**
 * 写信请求体收窄:职位 id、简历 id 正整数,署名是串;不合形给 null。
 *
 * @param raw 请求体原样。
 * @returns 收窄后的请求体或 null。
 */
export function toLetterBody(raw: LetterBodyJson): MaybeLetterBody {
  const jobId = toSendJobId({ jobId: raw.jobId })
  const resumeId = toSendJobId({ jobId: raw.resumeId })
  if (jobId == null || resumeId == null || typeof raw.senderName !== 'string') {
    return null
  }
  return { jobId, resumeId, senderName: raw.senderName.trim() }
}

/**
 * 写信用哪个模型通道:环境变量认得就用它,认不得按 friend(2026-10-07「随时切换」)。
 *
 * @param env 环境变量原值。
 * @returns 模型通道。
 */
export function letterProviderOf(env: string): LetterProvider {
  for (const p of LETTER_PROVIDERS) {
    if (p === env) {
      return p
    }
  }
  return LETTER_PROVIDERS[0]
}

/**
 * 写信的整轮消息:系统提示(署名换进去)+ 用户消息(职位、公司、地点、署名、JD、简历;JD 与简历各截到上限)。
 *
 * @param x 本岗、JD、简历纯文本与署名。
 * @returns 整轮消息。
 */
export function letterMessagesOf(x: LetterPromptIn): LetterMessages {
  const loc = [x.city, x.province].filter(Boolean).join(LOC_SEP)
  const user = [
    LETTER_LABELS.title + x.title, LETTER_LABELS.company + x.company, LETTER_LABELS.location + loc,
    LETTER_LABELS.name + x.name, TEXT_NONE, LETTER_LABELS.jd + x.jd.slice(0, LETTER_JD_MAX), TEXT_NONE,
    LETTER_LABELS.resume + x.resume.slice(0, LETTER_RESUME_MAX),
  ].join(NEWLINE)
  return [
    { role: ROLE_SYSTEM, content: LETTER_SYSTEM.replace(PH_NAME, x.name) },
    { role: ROLE_USER, content: user },
  ]
}

/**
 * 模型写回来的信洗一遍:去 think 段与 markdown 记号、换行归一、写不进 PDF 的字去掉、多余空行压成一个、
 * 落款词与署名之间的空行收掉、截到上限。
 *
 * @param raw 模型原文。
 * @returns 洗好的信。
 */
export function letterCleanOf(raw: string): string {
  let s = coverNormOf(raw.replace(THINK_RE, TEXT_NONE)).replace(MD_MARK_RE, TEXT_NONE)
  for (const ch of pdfBadCharsOf(s)) {
    s = s.split(ch).join(TEXT_NONE)
  }
  return s.replace(BLANKS_RE, BLANK_LINE).replace(CLOSING_GAP_RE, CLOSING_TIGHT).trim().slice(0, COVER_MAX)
}

/**
 * 「我的求职」一行的两个附件。
 *
 * @param x 连接、用户 id 与投递行 id。
 * @returns 附件;不是本人的 / 还没发给 null。
 */
export async function loadApplyFile(x: ApplyFileIn): ApplyFileOut {
  return firstOf(await queryRows({ db: x.db, sql: SQL.APPLY_FILE, params: [x.userId, x.id], map: toApplyFile }))
}

/**
 * 附件库行 → 附件。
 *
 * @param r 库行。
 * @returns 附件。
 */
export function toApplyFile(r: ApplyFileDbRow): ApplyFileFact {
  return {
    resumeB64: text(r.resume_b64), resumeMime: text(r.resume_mime), resumeFile: text(r.resume_file),
    cover: text(r.cover_text), coverFile: text(r.cover_file),
  }
}

