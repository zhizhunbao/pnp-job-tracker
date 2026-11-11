/**
 * 按职位改写域的形状(2026-11-09)。
 *
 * @author Frank
 * @time 2026-11-09 18:00:00
 */
import type { Db } from '../db'

/**
 * 用户 id。
 */
export type UserId = string | number

/**
 * 模型回的 JSON 一格。
 */
export type JsonCell = string | number | boolean | null | JsonCell[] | { [key: string]: JsonCell }

/**
 * 一条职位要求及它的覆盖情况。
 */
export type TailorReq = {
  /**
   * 编号(从 1 起,三屏的序号)。
   */
  id: number

  /**
   * 英文短名。
   */
  label: string

  /**
   * 职位描述里的原文。
   */
  jd: string

  /**
   * 基础简历或用户补充里有没有依据。
   */
  basis: boolean

  /**
   * 本岗简历里对应的原文;没写到 = 空串。
   */
  resume: string

  /**
   * 求职信里对应的原文;没写到 = 空串。
   */
  cover: string
}

/**
 * 一个职位的核对结果。
 */
export type TailorReview = {
  /**
   * 职位要求。
   */
  reqs: TailorReq[]

  /**
   * 求职信里没有依据的句子。
   */
  unsupported: string[]

  /**
   * 分数;还没核对 = null。
   */
  score: number | null

  /**
   * 简历已自动重试几次。
   */
  retryResume: number

  /**
   * 求职信已自动重试几次。
   */
  retryCover: number

  /**
   * 上一版简历作废的原因(新增或丢掉的数字;排版失败记一格 pdf)。
   */
  bad: string[]
}

/**
 * 一条投递行的库行。
 */
export type TailorDbRow = {
  /**
   * 行 id。
   */
  id: number | string | null

  /**
   * 状态。
   */
  status: string | null

  /**
   * 求职信。
   */
  cover_text: string | null

  /**
   * 本岗简历 PDF。
   */
  tailor_pdf_b64: string | null

  /**
   * 核对结果。
   */
  tailor_review: TailorReview | null

  /**
   * 用户补充。
   */
  tailor_facts: FactMap | null

  /**
   * 本岗简历的草稿。
   */
  tailor_cv: JsonCell

  /**
   * 本岗简历上的姓名。
   */
  cv_name: string | null
}

/**
 * 一条投递行(洗净)。
 */
export type TailorRow = {
  /**
   * 行 id。
   */
  id: number

  /**
   * 状态。
   */
  status: string

  /**
   * 求职信;没有 = 空串。
   */
  cover: string

  /**
   * 本岗简历 PDF;没有 = 空串。
   */
  pdfB64: string

  /**
   * 核对结果;还没有 = null。
   */
  review: TailorReview | null

  /**
   * 用户补充。
   */
  facts: FactMap

  /**
   * 本岗简历上的姓名;没有 = 空串。
   */
  cvName: string

  /**
   * 本岗简历的草稿;还没写 = null。
   */
  cv: JsonCell
}

/**
 * 要求 id → 用户补充的真实经历。
 */
export type FactMap = Record<string, string>

/**
 * 取投递行的入参。
 */
export type TailorKeyIn = {
  /**
   * 连接。
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
 * 取投递行的返回。
 */
export type TailorRowOut = Promise<TailorRow | null>

/**
 * 写操作的返回。
 */
export type TailorWriteOut = Promise<void>

/**
 * 建行并存拆好的要求的入参。
 */
export type SavePlanIn = TailorKeyIn & {
  /**
   * 职位名快照。
   */
  title: string

  /**
   * 公司名快照。
   */
  company: string

  /**
   * 基础简历 id。
   */
  resumeId: number

  /**
   * 核对结果。
   */
  review: TailorReview

  /**
   * 用户补充。
   */
  facts: FactMap
}

/**
 * 存本岗简历的入参。
 */
export type SaveResumeIn = TailorKeyIn & {
  /**
   * 结构化草稿。
   */
  cv: JsonCell

  /**
   * PDF 的 base64。
   */
  pdfB64: string

  /**
   * 核对结果。
   */
  review: TailorReview
}

/**
 * 存求职信的入参。
 */
export type SaveCoverIn = TailorKeyIn & {
  /**
   * 求职信。
   */
  cover: string

  /**
   * 核对结果。
   */
  review: TailorReview
}

/**
 * 存核对结果的入参。
 */
export type SaveReviewIn = TailorKeyIn & {
  /**
   * 核对结果。
   */
  review: TailorReview
}

/**
 * 从模型回包取要求的入参。
 */
export type ReqsOfIn = {
  /**
   * 模型回的 JSON。
   */
  parsed: JsonCell

  /**
   * 职位描述。
   */
  jd: string
}

/**
 * 逐字核对的入参。
 */
export type AuditOfIn = {
  /**
   * 现有结果。
   */
  review: TailorReview

  /**
   * 模型回的 JSON。
   */
  parsed: JsonCell

  /**
   * 本岗简历的文字(从要发出的 PDF 里读的)。
   */
  resumeText: string

  /**
   * 求职信文字。
   */
  coverText: string
}

/**
 * 新增事实核对的入参。
 */
export type NewNumbersIn = {
  /**
   * 改写后的文字。
   */
  text: string

  /**
   * 基础简历与用户补充的文字。
   */
  base: string
}

/**
 * 一串文字。
 */
export type TextList = string[]

/**
 * 一段 JSON Schema(交给模型的结构化输出定义;本域只拼不读,不展开它的格)。
 */
export type SchemaNode = object

/**
 * 拼用户消息的入参。
 */
export type UserMsgIn = {
  /**
   * 职位要求。
   */
  reqs: TailorReq[]

  /**
   * 这次必须补上的要求。
   */
  missing: TailorReq[]

  /**
   * 基础简历文字。
   */
  base: string

  /**
   * 用户补充。
   */
  facts: FactMap

  /**
   * 职位描述。
   */
  jd: string
}

/**
 * 拼核对消息的入参。
 */
export type AuditMsgIn = UserMsgIn & {
  /**
   * 本岗简历文字。
   */
  resumeText: string

  /**
   * 求职信文字。
   */
  coverText: string
}

/**
 * 调模型的入参。
 */
export type CompleteIn = {
  /**
   * 功能名。
   */
  feature: string

  /**
   * 系统提示。
   */
  system: string

  /**
   * 用户消息。
   */
  user: string

  /**
   * 输出上限。
   */
  maxTokens: number

  /**
   * 要求按这个结构返回;纯文字(求职信)= null。
   */
  schema: object | null
}

/**
 * 排简历 PDF 的结果。
 */
export type CvPdfFact = {
  /**
   * PDF 字节;排不成 = null。
   */
  bytes: Uint8Array | null

  /**
   * 排版用的文字(核对新增事实用)。
   */
  text: string
}

/**
 * 路由注入的跨域能力。
 */
export type StepDeps = {
  /**
   * 调模型,回原文。
   */
  complete: (x: CompleteIn) => Promise<string>

  /**
   * 模型原文 → JSON;坏了给 null。
   */
  parse: (raw: string) => JsonCell

  /**
   * 草稿 → 简历 PDF。
   */
  cvPdf: (cv: JsonCell) => Promise<CvPdfFact>

  /**
   * 从 PDF 读文字;读不出 = 空串。
   */
  pdfText: (b64: string) => Promise<string>

  /**
   * 写求职信的系统提示(含署名)。
   */
  coverSystem: (name: string) => string

  /**
   * 洗模型写回的求职信。
   */
  coverClean: (raw: string) => string

  /**
   * 第一次核对成功时记试用账。
   */
  markTrial: () => Promise<void>
}

/**
 * 跑一步的入参。
 */
export type StepRunIn = TailorKeyIn & {
  /**
   * 哪一步。
   */
  step: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 署名。
   */
  name: string

  /**
   * 职位描述。
   */
  jd: string

  /**
   * 基础简历 id。
   */
  resumeId: number

  /**
   * 基础简历文字。
   */
  base: string

  /**
   * 这次带来的用户补充。
   */
  newFacts: FactMap

  /**
   * 写完简历后也重写求职信。
   */
  both: boolean

  /**
   * 手动重新生成(清掉这一份的重试计数)。
   */
  regen: boolean

  /**
   * 跨域能力。
   */
  deps: StepDeps
}

/**
 * 跑一步的结果。
 */
export type StepFact = {
  /**
   * 错误码;成功 = 空串。
   */
  error: string

  /**
   * 下一步;结束 = 空串。
   */
  next: string

  /**
   * 核对结果。
   */
  review: TailorReview | null
}

/**
 * 跑一步的返回。
 */
export type StepOut = Promise<StepFact>

/**
 * 步骤请求体。
 */
export type StepBodyJson = {
  /**
   * 用户补了真实经历后的重写。
   */
  fill?: boolean

  /**
   * 职位 id。
   */
  jobId?: number | string

  /**
   * 哪一步。
   */
  step?: string

  /**
   * 补充经历全文(只在补充后重写的第一步带)。
   */
  extra?: string

  /**
   * 写完简历后也重写求职信。
   */
  both?: boolean

  /**
   * 手动重新生成。
   */
  regen?: boolean
}

/**
 * 洗净的步骤请求体。
 */
export type StepBody = {
  /**
   * 用户补了真实经历后的重写。
   */
  fill: boolean

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 哪一步。
   */
  step: string

  /**
   * 补充经历全文;没带 = 空串。
   */
  extra: string

  /**
   * 写完简历后也重写求职信。
   */
  both: boolean

  /**
   * 手动重新生成。
   */
  regen: boolean
}

/**
 * 洗不出请求体 = null。
 */
export type MaybeStepBody = StepBody | null

/**
 * 分数。
 */
export type MaybeScore = number | null

/**
 * 下一步。
 */
export type NextStep = string

/**
 * 是否。
 */
export type TailorBool = boolean

/**
 * 归一后的文字。
 */
export type NormText = string

/**
 * 求职信修改的请求体。
 */
export type CoverBodyJson = {
  /**
   * 职位 id。
   */
  jobId?: number | string

  /**
   * 求职信。
   */
  cover?: string
}

/**
 * 存手改简历的请求体(只收能改的三处:简介、技能、每段工作的要点;雇主、职位和日期不收)。
 */
export type ResumeBodyJson = {
  /**
   * 职位 id。
   */
  jobId?: number | string

  /**
   * 简介。
   */
  summary?: string

  /**
   * 技能。
   */
  skills?: string

  /**
   * 每段工作的要点,顺序同本岗简历。
   */
  work?: string[]
}

/**
 * 一串职位要求。
 */
export type TailorReqs = TailorReq[]

/**
 * 重试计数的哪一格。
 */
export type RetryField = 'retryResume' | 'retryCover'

/**
 * 取模型回包一格的入参。
 */
export type CellOfIn = {
  /**
   * 对象。
   */
  obj: JsonCell

  /**
   * 键。
   */
  key: string
}

/**
 * 一句引文去留的入参。
 */
export type QuotedOfIn = {
  /**
   * 引文。
   */
  quote: string

  /**
   * 原文(已归一)。
   */
  text: string

  /**
   * 有没有依据。
   */
  basis: boolean
}

/**
 * 取无依据句子的入参。
 */
export type UnsupportedOfIn = {
  /**
   * 模型回的 JSON。
   */
  parsed: JsonCell

  /**
   * 求职信(已归一)。
   */
  cover: string
}

/**
 * 算分的入参。
 */
export type ScoreOfIn = {
  /**
   * 要求。
   */
  reqs: TailorReq[]

  /**
   * 无依据的句子。
   */
  unsupported: string[]
}

/**
 * 失败回包的入参。
 */
export type FailOfIn = {
  /**
   * 错误码。
   */
  error: string

  /**
   * 现有结果。
   */
  review: TailorReview | null
}

/**
 * 拆要求这一步的入参。
 */
export type RunPlanIn = {
  /**
   * 一步的全部入参。
   */
  x: StepRunIn

  /**
   * 现有行;没有 = null。
   */
  row: TailorRow | null
}

/**
 * 合并用户补充的入参。
 */
export type MergedFactsIn = {
  /**
   * 现有行;没有 = null。
   */
  row: TailorRow | null

  /**
   * 新补充。
   */
  added: FactMap
}

/**
 * 写简历、写求职信、核对这三步的入参。
 */
export type RunDocIn = {
  /**
   * 一步的全部入参。
   */
  x: StepRunIn

  /**
   * 现有行。
   */
  row: TailorRow

  /**
   * 现有结果。
   */
  review: TailorReview
}

/**
 * 记一次重试的入参。
 */
export type BumpOfIn = {
  /**
   * 这一次算不算重试(第一次生成不算)。
   */
  counted: boolean

  /**
   * 现有结果。
   */
  review: TailorReview

  /**
   * 哪一格。
   */
  field: RetryField

  /**
   * 要不要清零。
   */
  reset: boolean
}

/**
 * 重试计数新值的入参。
 */
export type RetryValueIn = {
  /**
   * 这一次算不算重试。
   */
  counted: boolean

  /**
   * 现值。
   */
  now: number

  /**
   * 要不要清零。
   */
  reset: boolean
}

/**
 * 求职信署名的入参。
 */
export type SignerOfIn = {
  /**
   * 档案里的署名。
   */
  name: string

  /**
   * 投递行。
   */
  row: TailorRow
}

/**
 * 简历作废原因的入参。
 */
export type ResumeBadIn = {
  /**
   * 排出 PDF 了吗。
   */
  hasPdf: boolean

  /**
   * 改写文字。
   */
  text: string

  /**
   * 基础简历与用户补充。
   */
  base: string

  /**
   * 基础简历。
   */
  resumeBase: string
}

/**
 * 年限说法的替换函数(String.replace 定死的签名)。
 */
export type DurationDropFn = (m: string, n: string) => string

/**
 * 存用户补充的入参。
 */
export type SaveFactsIn = TailorKeyIn & {
  /**
   * 用户补充。
   */
  facts: FactMap
}

/**
 * 补充经历的库行。
 */
export type ExtraDbRow = {
  /**
   * 补充经历全文。
   */
  extra_text: string | null
}

/**
 * 取补充经历的入参。
 */
export type ExtraIn = {
  /**
   * 连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId
}

/**
 * 取补充经历的返回。
 */
export type ExtraOut = Promise<string>

/**
 * 存补充经历的入参。
 */
export type SaveExtraIn = ExtraIn & {
  /**
   * 补充经历全文。
   */
  extra: string
}

/**
 * keepNewFacts 的入参。
 */
export type KeepFactsIn = {
  /**
   * 这一步的入参。
   */
  x: StepRunIn

  /**
   * 现有行。
   */
  row: TailorRow
}

/**
 * `pickJdOf` 的入参。
 */
export type PickJdIn = {
  /**
   * 整理版(带节头标记);没有是空串。
   */
  formatted: string

  /**
   * 原帖正文(带节头标记);没有是空串。
   */
  original: string

  /**
   * 这一岗已有的核对结果;还没改写过是 null。
   */
  review: TailorReview | null
}
