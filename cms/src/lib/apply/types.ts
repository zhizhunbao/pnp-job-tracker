/**
 * 站内投递(代投)域的形状:库行 → 洗净的事实 → 投递页的起始态;草稿与发送的请求体;求职信占位;PDF 库与退信回调的本地形状。
 *
 * @author Frank
 * @time 2026-10-07 01:30:00
 */
import type { Db } from '../db'

// =========================================================================
// 1. 求职信占位与字符
// =========================================================================

/**
 * 字清单(坏字、排好的行)。
 */
export type TextList = string[]

/**
 * 可能没有的 id(职位 / 简历)。
 */
export type MaybeId = number | null

/**
 * `coverFillOf` 的入参。
 */
export type CoverFillIn = {
  /**
   * 带占位的模板。
   */
  template: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 英文署名。
   */
  name: string
}

/**
 * `spanValueOf` 的入参。
 */
export type SpanValueIn = {
  /**
   * 种类。
   */
  kind: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 英文署名。
   */
  name: string
}

/**
 * 模板里下一处占位(`nextPlaceholderOf` 的结果)。
 */
export type PlaceholderHit = {
  /**
   * 在模板里的起点。
   */
  at: number

  /**
   * 占位原文(如 `{{title}}`)。
   */
  ph: string

  /**
   * 种类。
   */
  kind: string
}

/**
 * 可能没有的下一处占位。
 */
export type MaybePlaceholderHit = PlaceholderHit | null

/**
 * `nextPlaceholderOf` 的入参。
 */
export type NextPlaceholderIn = {
  /**
   * 模板。
   */
  template: string

  /**
   * 从哪个位置往后找。
   */
  from: number
}

// =========================================================================
// 2. 投递信与附件
// =========================================================================

/**
 * 一封投递信的素材(标题、正文、附件名都从它出)。
 */
export type MailPartsIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 城市(没有 = 空串)。
   */
  city: string

  /**
   * 省码(没有 = 空串)。
   */
  province: string

  /**
   * 英文署名。
   */
  name: string
}

/**
 * `resumeFileOf` 的入参。
 */
export type ResumeFileIn = {
  /**
   * 英文署名。
   */
  name: string

  /**
   * 简历原件的 MIME。
   */
  mime: string
}

/**
 * `recipientOf` 的入参。
 */
export type RecipientIn = {
  /**
   * 用户的注册邮箱。
   */
  userEmail: string

  /**
   * 雇主投递邮箱。
   */
  employerEmail: string
}

/**
 * `idemKeyOf` 的入参。
 */
export type IdemKeyIn = {
  /**
   * 投递行 id。
   */
  appId: number

  /**
   * 这一封里会变的各段(收件人、标题、正文、信、简历 id 与上传时刻)。
   */
  parts: string[]
}

/**
 * `idemKeyOf` 的返回(Web Crypto 的摘要是异步的)。
 */
export type IdemKeyOut = Promise<string>

// =========================================================================
// 3. 求职信 PDF(pdf-lib 由 routes 注入;审查 #9,本域 functions 不 import 它)
// =========================================================================

/**
 * pdf-lib 的字体(只用到的那两个方法)。外部库定死的签名。
 */
export type PdfFont = {
  /**
   * 一段字在某字号下的宽(pt)。外部规定两参。
   */
  widthOfTextAtSize(text: string, size: number): number
}

/**
 * pdf-lib `drawText` 的选项(只用到的格;外部库形状,各格在库里都是可选的,照抄成 `?:` 才对得上它的签名)。
 * 字体类型 F 是 pdf-lib 自己的 PDFFont(本文件不许 import,由调用处推断带进来 —— 参数逆变,本地起的半截形状对不上)。
 */
export type PdfDrawOpts<F extends PdfFont> = {
  /**
   * 左边距起点(pt)。
   */
  x?: number

  /**
   * 基线高度(pt,从页底量)。
   */
  y?: number

  /**
   * 字号。
   */
  size?: number

  /**
   * 字体。
   */
  font?: F
}

/**
 * pdf-lib 的一页(只用到 drawText)。
 */
export type PdfPage<F extends PdfFont> = {
  /**
   * 写一行字。外部规定两参。
   */
  drawText(text: string, options: PdfDrawOpts<F>): void
}

/**
 * pdf-lib 的文档(只用到的三个方法)。
 */
export type PdfDoc<F extends PdfFont> = {
  /**
   * 嵌标准字体。
   */
  embedFont(name: string): Promise<F>

  /**
   * 加一页(宽高 pt)。
   */
  addPage(size: [number, number]): PdfPage<F>

  /**
   * 存成字节。
   */
  save(): Promise<Uint8Array>
}

/**
 * pdf-lib `PDFDocument.create` 的选项(只用到的格)。
 */
export type PdfCreateOpts = {
  /**
   * 不写生成 / 修改时刻(同一封重渲逐字节相同,幂等键才不撞 409)。
   */
  updateMetadata: boolean
}

/**
 * 注进来的 pdf-lib(`import * as PdfLib from 'pdf-lib'` 原样传进来)。
 */
export type PdfLib<F extends PdfFont> = {
  /**
   * 文档类(只用 create)。
   */
  PDFDocument: {
    /**
     * 新建空文档。
     */
    create(options: PdfCreateOpts): Promise<PdfDoc<F>>
  }

  /**
   * 标准字体名表(只用 Helvetica)。
   */
  StandardFonts: {
    /**
     * Helvetica(WinAnsi 编码)。
     */
    Helvetica: string
  }
}

/**
 * 量一段字宽的函数(排版与字体解耦,纯函数测得了)。
 */
export type MeasureFn = (text: string) => number

/**
 * `coverLinesOf` 的入参。
 */
export type CoverLinesIn = {
  /**
   * 信的全文(已归一换行)。
   */
  text: string

  /**
   * 量字宽。
   */
  measure: MeasureFn

  /**
   * 版心宽(pt)。
   */
  maxWidth: number
}

/**
 * `wordLinesOf` 的入参(一段按词排成若干行)。
 */
export type WordLinesIn = {
  /**
   * 一段(不含换行)。
   */
  para: string

  /**
   * 量字宽。
   */
  measure: MeasureFn

  /**
   * 版心宽(pt)。
   */
  maxWidth: number
}

/**
 * `hardBreakOf` 的入参(一个词比版心还宽,按字硬断)。
 */
export type HardBreakIn = {
  /**
   * 那个词。
   */
  word: string

  /**
   * 量字宽。
   */
  measure: MeasureFn

  /**
   * 版心宽(pt)。
   */
  maxWidth: number
}

/**
 * `makeMeasure` 的入参。
 */
export type MeasureMakeIn = {
  /**
   * 字体。
   */
  font: PdfFont

  /**
   * 字号。
   */
  size: number
}

/**
 * `coverPdfOf` 的入参。
 */
export type CoverPdfIn<F extends PdfFont> = {
  /**
   * 注进来的 pdf-lib。
   */
  pdf: PdfLib<F>

  /**
   * 信的全文。
   */
  text: string
}

/**
 * `coverPdfOf` 的返回。
 */
export type CoverPdfOut = Promise<Uint8Array>

// =========================================================================
// 4. 库行与取数
// =========================================================================

/**
 * 时刻格(pg 的 timestamptz 交回 Date;测试桩可能给串)。
 */
export type TimeCell = Date | string | null

/**
 * 用户 id(payload 给的是 number 或 string,原样带进 SQL 参数)。
 */
export type UserId = string | number

/**
 * APPLY_JOB 的库行。
 */
export type ApplyJobDbRow = {
  /**
   * 职位 id。
   */
  id: number | string | null

  /**
   * 职位名(英文原名)。
   */
  title: string | null

  /**
   * 公司名(公司表)。
   */
  company_name: string | null

  /**
   * 城市英文名。
   */
  city: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 职位状态(open / closed / campus)。
   */
  job_status: string | null

  /**
   * 投递邮箱(没有是 NULL)。
   */
  apply_email: string | null
}

/**
 * 本岗(洗净;雇主邮箱只在服务端用,不下发)。
 */
export type ApplyJobFact = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名(没有 = 空串)。
   */
  company: string

  /**
   * 城市(没有 = 空串)。
   */
  city: string

  /**
   * 省码(没有 = 空串)。
   */
  province: string

  /**
   * 已下架。
   */
  closed: boolean

  /**
   * 雇主投递邮箱(没有 = 空串)。
   */
  email: string
}

/**
 * 可能没有的本岗。
 */
export type MaybeApplyJob = ApplyJobFact | null

/**
 * 本岗(下发给投递页的那一份:不带雇主邮箱,只说有没有)。
 */
export type ApplyJobRow = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名(没有 = 空串)。
   */
  company: string

  /**
   * 城市(没有 = 空串)。
   */
  city: string

  /**
   * 省码(没有 = 空串)。
   */
  province: string

  /**
   * 已下架。
   */
  closed: boolean

  /**
   * 库里有投递邮箱(没有就投不了)。
   */
  hasEmail: boolean
}

/**
 * APPLY_RESUMES 的库行。
 */
export type ApplyResumeDbRow = {
  /**
   * 简历 id。
   */
  id: number | string | null

  /**
   * 文件名。
   */
  file_name: string | null

  /**
   * MIME。
   */
  mime: string | null

  /**
   * 上传时刻。
   */
  uploaded_at: TimeCell

  /**
   * 是不是默认那份。
   */
  is_default: boolean | null
}

/**
 * 一份简历(投递第 1 步选用哪一份)。
 */
export type ApplyResume = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 文件名。
   */
  fileName: string

  /**
   * MIME。
   */
  mime: string

  /**
   * 上传时刻(ISO)。
   */
  uploadedAt: string

  /**
   * 是不是默认那份。
   */
  isDefault: boolean
}

/**
 * APPLY_RESUME_BLOB 的库行。
 */
export type ApplyBlobDbRow = {
  /**
   * 简历 id。
   */
  id: number | string | null

  /**
   * 原件 base64。
   */
  file_b64: string | null

  /**
   * 文件名。
   */
  file_name: string | null

  /**
   * MIME。
   */
  mime: string | null

  /**
   * 上传时刻。
   */
  uploaded_at: TimeCell
}

/**
 * 一份简历的原件(base64 原样,Resend 附件本就要 base64)。
 */
export type ApplyBlob = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 原件 base64。
   */
  b64: string

  /**
   * 文件名。
   */
  fileName: string

  /**
   * MIME。
   */
  mime: string

  /**
   * 上传时刻(ISO)。
   */
  uploadedAt: string
}

/**
 * 可能没有的原件。
 */
export type MaybeApplyBlob = ApplyBlob | null

/**
 * APPLY_PREFS_GET 的库行。
 */
export type ApplyPrefsDbRow = {
  /**
   * 英文署名。
   */
  sender_name: string | null

  /**
   * 求职信模板。
   */
  cover_template: string | null
}

/**
 * 投递偏好(洗净:没填署名 = 空串,没有模板 = 站上默认模板)。
 */
export type ApplyPrefs = {
  /**
   * 英文署名(没填 = 空串)。
   */
  senderName: string

  /**
   * 求职信模板。
   */
  template: string
}

/**
 * APPLY_ROW 的库行。
 */
export type ApplyRowDbRow = {
  /**
   * 投递行 id。
   */
  id: number | string | null

  /**
   * 状态。
   */
  status: string | null

  /**
   * 信。
   */
  cover_text: string | null

  /**
   * 选用的简历 id(删了是 NULL)。
   */
  resume_id: number | string | null

  /**
   * 发出时刻。
   */
  sent_at: TimeCell
}

/**
 * 本人这一岗的投递行(洗净)。
 */
export type ApplyRowFact = {
  /**
   * 投递行 id。
   */
  id: number

  /**
   * 状态(draft / sending / sent / replied / bounced)。
   */
  status: string

  /**
   * 信。
   */
  cover: string

  /**
   * 选用的简历 id(删了 = null)。
   */
  resumeId: number | null

  /**
   * 发出时刻(ISO;没发 = 空串)。
   */
  sentAt: string
}

/**
 * 可能没有的投递行。
 */
export type MaybeApplyRow = ApplyRowFact | null

/**
 * 只有 id 一格的库行(认领回行)。
 */
export type IdDbRow = {
  /**
   * id。
   */
  id: number | string | null
}

/**
 * 计数库行。
 */
export type CountDbRow = {
  /**
   * 个数。
   */
  n: number | string | null
}

/**
 * 计数查询的结果行(只一行;没行是空数组)。
 */
export type CountList = number[]

/**
 * 退信对账回行(那一封的雇主邮箱)。
 */
export type BounceDbRow = {
  /**
   * 雇主邮箱。
   */
  employer_email: string | null
}

/**
 * 「有没有」查询的库行(SELECT 1)。
 */
export type HitDbRow = {
  /**
   * 常数 1。
   */
  hit: number | null
}

/**
 * 按人取数的入参。
 */
export type ApplyUserIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId
}

/**
 * 按人按岗取数的入参。
 */
export type ApplyUserJobIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number
}

/**
 * 取起始态的入参:按人按岗取数,加上路由层算好的试用余量(lib/quota 的账,上层注进来)。
 */
export type ApplyStartIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * AI 写信还剩几个职位的试用(Pro = null)。
   */
  trialLeft: number | null

  /**
   * 本岗用过 AI 写信没有。
   */
  trialHere: boolean
}

/**
 * 取本岗的入参。
 */
export type ApplyJobIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 职位 id。
   */
  jobId: number
}

/**
 * 取一份简历原件的入参。
 */
export type ApplyBlobIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 简历 id。
   */
  resumeId: number
}

/**
 * 写投递偏好的入参(null = 那一格保留原值)。
 */
export type ApplyPrefsSaveIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 英文署名。
   */
  senderName: string | null

  /**
   * 求职信模板。
   */
  template: string | null
}

/**
 * 存草稿的入参。
 */
export type ApplyDraftSaveIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 本岗。
   */
  job: ApplyJobFact

  /**
   * 信。
   */
  cover: string

  /**
   * 选用的简历 id(还没选 = null)。
   */
  resumeId: number | null
}

/**
 * 认领发送的入参(同时落下这一封的快照)。
 */
export type ApplyClaimIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 雇主邮箱(改投测试地址之前的原件)。
   */
  employerEmail: string

  /**
   * 回复地址(用户注册邮箱)。
   */
  replyTo: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文原文。
   */
  bodyText: string

  /**
   * 简历附件名。
   */
  resumeFile: string

  /**
   * 简历上传时刻(ISO)。
   */
  resumeUploadedAt: string

  /**
   * 求职信附件名。
   */
  coverFile: string

  /**
   * 幂等键。
   */
  idemKey: string

  /**
   * 简历原件 base64(随投递记录快照,2026-10-07)。
   */
  resumeB64: string

  /**
   * 简历 MIME。
   */
  resumeMime: string
}

/**
 * 记发出的入参。
 */
export type ApplySentIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 投递行 id。
   */
  id: number

  /**
   * Resend 邮件 id。
   */
  resendId: string
}

/**
 * 按投递行 id 改状态的入参。
 */
export type ApplyIdIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 投递行 id。
   */
  id: number
}

/**
 * 同一雇主邮箱去重的入参。
 */
export type SameEmailIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 雇主邮箱。
   */
  email: string

  /**
   * 本岗 id(本岗自己不算)。
   */
  jobId: number
}

/**
 * 按邮箱查的入参。
 */
export type ApplyEmailIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 邮箱。
   */
  email: string
}

/**
 * 退信记账的入参。
 */
export type ApplyBounceIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 那一封的 Resend 邮件 id。
   */
  resendId: string

  /**
   * 退信名单种类(bounced / suppressed)。
   */
  kind: string
}

/**
 * 退信记账的返回(记进名单的那个雇主邮箱;对不上投递行 = 空串)。
 */
export type ApplyBounceOut = Promise<string>

/**
 * 投递页的起始态(页面门 SSR 取好递给投递页)。
 */
export type ApplyStart = {
  /**
   * 本岗。
   */
  job: ApplyJobRow

  /**
   * 本人的简历清单(默认那份在最前)。
   */
  resumes: ApplyResume[]

  /**
   * 英文署名(没填 = 空串)。
   */
  senderName: string

  /**
   * 求职信模板(没改过 = 站上默认)。
   */
  template: string

  /**
   * 这一岗的投递状态(空串 = 还没开始;draft / sending / sent / replied / bounced)。
   */
  status: string

  /**
   * 草稿里这一岗的信(2026-10-07 按 JD 写,每岗一封;没草稿 = 空串)。
   */
  cover: string

  /**
   * 选用哪一份简历(草稿里记的;没记就是默认那份;一份都没有 = null)。
   */
  resumeId: number | null

  /**
   * 发出时刻(ISO;没发 = 空串)。
   */
  sentAt: string

  /**
   * AI 按 JD 写信还剩几个职位的试用(Pro 不限 = null;2026-10-07 批 C)。
   */
  trialLeft: number | null

  /**
   * 本岗用过 AI 写信没有(用过的再写不扣)。
   */
  trialHere: boolean
}

/**
 * 可能没有的起始态(岗不存在)。
 */
export type MaybeApplyStart = ApplyStart | null

/**
 * `resumePickOf` 的入参。
 */
export type ResumePickIn = {
  /**
   * 草稿里记的那份(没有 = null)。
   */
  saved: number | null

  /**
   * 本人的简历清单。
   */
  resumes: ApplyResume[]
}

/**
 * 取本岗的返回。
 */
export type ApplyJobOut = Promise<MaybeApplyJob>

/**
 * 取简历清单的返回。
 */
export type ApplyResumesOut = Promise<ApplyResume[]>

/**
 * 取原件的返回。
 */
export type ApplyBlobOut = Promise<MaybeApplyBlob>

/**
 * 取投递偏好的返回。
 */
export type ApplyPrefsOut = Promise<ApplyPrefs>

/**
 * 取投递行的返回。
 */
export type ApplyRowOut = Promise<MaybeApplyRow>

/**
 * 只写库的返回。
 */
export type ApplyWriteOut = Promise<void>

/**
 * 写了没有(草稿:还是草稿才写得进)的返回。
 */
export type ApplyDoneOut = Promise<boolean>

/**
 * 认领的返回(投递行 id;认领不到 = null)。
 */
export type ApplyClaimOut = Promise<number | null>

/**
 * 计数的返回。
 */
export type ApplyCountOut = Promise<number>

/**
 * 取起始态的返回。
 */
export type ApplyStartOut = Promise<MaybeApplyStart>

// =========================================================================
// 5. 请求体与退信回调(信任边界:先按可能缺席的形状收下,逐格收窄)
// =========================================================================

/**
 * 草稿请求体原样(线格式,每格都可能缺席或类型不对)。
 */
export type DraftBodyJson = {
  /**
   * 职位 id。
   */
  jobId?: number | string | boolean | null

  /**
   * 英文署名。
   */
  senderName?: string | number | boolean | null

  /**
   * 信。
   */
  cover?: string | number | boolean | null


  /**
   * 选用的简历 id。
   */
  resumeId?: number | string | boolean | null
}

/**
 * 草稿请求体(收窄后)。
 */
export type DraftBody = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 英文署名(去头尾空格)。
   */
  senderName: string

  /**
   * 信(换行已归一)。
   */
  cover: string


  /**
   * 选用的简历 id(还没选 = null)。
   */
  resumeId: number | null
}

/**
 * 可能不合格的草稿请求体。
 */
export type MaybeDraftBody = DraftBody | null

/**
 * 发送请求体原样(线格式)。
 */
export type SendBodyJson = {
  /**
   * 职位 id。
   */
  jobId?: number | string | boolean | null
}

/**
 * Resend 回调体原样(只读用到的格)。
 */
export type WebhookJson = {
  /**
   * 事件名。
   */
  type?: string

  /**
   * 事件数据。
   */
  data?: WebhookDataJson
}

/**
 * Resend 回调的 data 段。
 */
export type WebhookDataJson = {
  /**
   * 那一封的 Resend 邮件 id。
   */
  email_id?: string

  /**
   * 退信详情(只有 email.bounced 带)。
   */
  bounce?: WebhookBounceJson
}

/**
 * 退信详情。
 */
export type WebhookBounceJson = {
  /**
   * 退信种类(Permanent / Transient / Undetermined)。
   */
  type?: string
}

/**
 * 回调该记成什么(`bounceKindOf` 的结果:空串 = 只留痕不记名单)。
 */
export type BounceKind = string

/**
 * `isSvixValid` 的入参(Svix 手动验签:id.ts.body 做 HMAC-SHA256,与头里任一 v1 签名相等即过)。
 */
export type SvixIn = {
  /**
   * 回调密钥(whsec_ 开头)。
   */
  secret: string

  /**
   * svix-id 头。
   */
  id: string

  /**
   * svix-timestamp 头(秒)。
   */
  ts: string

  /**
   * svix-signature 头(空格隔开的若干 v1,<base64>)。
   */
  sigs: string

  /**
   * 原始请求体。
   */
  body: string

  /**
   * 当前时刻(秒;注进来,测试好拨钟)。
   */
  nowS: number
}

/**
 * 验签的返回。
 */
export type SvixOut = Promise<boolean>

// =========================================================================
// 6. 按 JD 写求职信与「我的求职」附件(2026-10-07)
// =========================================================================

/**
 * 写信请求体原样(线格式)。
 */
export type LetterBodyJson = {
  /**
   * 职位 id。
   */
  jobId?: number | string | boolean | null

  /**
   * 选用的简历 id。
   */
  resumeId?: number | string | boolean | null

  /**
   * 英文署名。
   */
  senderName?: string | number | boolean | null
}

/**
 * 写信请求体(收窄后)。
 */
export type LetterBody = {
  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 选用的简历 id。
   */
  resumeId: number

  /**
   * 英文署名(去头尾空格)。
   */
  senderName: string
}

/**
 * 可能不合格的写信请求体。
 */
export type MaybeLetterBody = LetterBody | null

/**
 * `letterMessagesOf` 的入参。
 */
export type LetterPromptIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * JD 全文。
   */
  jd: string

  /**
   * 简历纯文本。
   */
  resume: string

  /**
   * 英文署名。
   */
  name: string
}

/**
 * 给模型的一条消息(与 lib/llm 的 ChatMessage 同形,本域自声明)。
 */
export type LetterMessage = {
  /**
   * 角色。
   */
  role: 'system' | 'user'

  /**
   * 内容。
   */
  content: string
}

/**
 * 给模型的整轮消息。
 */
export type LetterMessages = LetterMessage[]

/**
 * 写信用的模型通道(与 lib/llm 的 Provider 同形)。
 */
export type LetterProvider = 'friend' | 'anthropic' | 'ollama'

/**
 * APPLY_FILE 的库行。
 */
export type ApplyFileDbRow = {
  /**
   * 简历原件快照(base64)。
   */
  resume_b64: string | null

  /**
   * 简历 MIME。
   */
  resume_mime: string | null

  /**
   * 简历附件名。
   */
  resume_file: string | null

  /**
   * 那封求职信全文。
   */
  cover_text: string | null

  /**
   * 求职信附件名。
   */
  cover_file: string | null
}

/**
 * 「我的求职」一行的两个附件(洗净;没快照 = 空串)。
 */
export type ApplyFileFact = {
  /**
   * 简历原件快照(base64)。
   */
  resumeB64: string

  /**
   * 简历 MIME。
   */
  resumeMime: string

  /**
   * 简历附件名。
   */
  resumeFile: string

  /**
   * 那封求职信全文。
   */
  cover: string

  /**
   * 求职信附件名。
   */
  coverFile: string
}

/**
 * 可能没有的附件(不是本人的 / 还没发)。
 */
export type MaybeApplyFile = ApplyFileFact | null

/**
 * 取附件的入参。
 */
export type ApplyFileIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 投递行 id。
   */
  id: number
}

/**
 * 取附件的返回。
 */
export type ApplyFileOut = Promise<MaybeApplyFile>

