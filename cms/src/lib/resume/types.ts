/**
 * 简历域的形状 —— **本域自己声明,不从别的域取**。
 * MatchMessage 与 llm 域的 ChatMessage 结构同形(role 是它的子集),靠结构类型对上,不 import。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

import type { Db } from '../db'

/**
 * 上传文件的字节(Node 的 Buffer;库类型起本地名,签名里不出现外部类型)。
 */
export type FileBuf = Buffer

/**
 * 捕到的错误的本地名。
 */
export type CaughtError = Error

/**
 * `extractText` 的入参。
 */
export type ExtractIn = {
  /**
   * 上传时的文件名(取扩展名判 pdf/docx)。
   */
  name: string

  /**
   * 文件字节(内存解析,不落盘不入库)。
   */
  buf: FileBuf
}

/**
 * 取字结果。
 */
export type Extracted = {
  /**
   * 抽出的纯文本;解析不了是 null(调用方给用户报回退)。
   */
  text: string | null

  /**
   * 失败原因(留痕用;成功是空串)。
   */
  err: string
}

/**
 * `extractText` 的返回。
 */
export type ExtractOut = Promise<Extracted>

/**
 * 发给模型的一条消息(与 llm 域 ChatMessage 结构同形)。
 */
export type MatchMessage = {
  /**
   * 角色(本域只发这两种)。
   */
  role: 'system' | 'user'

  /**
   * 消息正文。
   */
  content: string
}

/**
 * 消息的复数。
 */
export type MatchMessages = MatchMessage[]

/**
 * 对照结果一行(模型产出,已逐行校验)。
 */
export type MatchRow = {
  /**
   * JD 里的一条要求(≤80 字符)。
   */
  req: string

  /**
   * 简历是否覆盖。
   */
  hit: boolean

  /**
   * 证据或缺口说明(≤120 字符)。
   */
  note: string
}

/**
 * 对照行的复数。
 */
export type MatchRows = MatchRow[]

/**
 * 对照行或没有(全脏/太少 = null,调用方报「对照失败」)。
 */
export type MaybeMatchRows = MatchRows | null

/**
 * `gateMatch` 的入参。
 */
export type GateMatchIn = {
  /**
   * 校验过的对照行。
   */
  rows: MatchRows

  /**
   * 付费态。
   */
  pro: boolean
}

/**
 * 免费闸的裁决(锁区正文根本不下发,同 gateReport 惯例)。
 */
export type Gated = {
  /**
   * 可见行(缺的排前)。
   */
  visible: MatchRows

  /**
   * 真实剩余行数(前端打几行码就看它)。
   */
  lockedN: number

  /**
   * 命中数。
   */
  hitN: number

  /**
   * 总行数。
   */
  total: number
}

/**
 * `matchPrompt` 的入参。
 */
export type MatchPromptIn = {
  /**
   * JD 文本(超 CLAMP 截断)。
   */
  jd: string

  /**
   * 简历文本(超 CLAMP 截断)。
   */
  resume: string

  /**
   * 界面语言码(决定 req/note 的输出语言)。
   */
  lang: string

  /**
   * 付费态(pro 才让模型写 rewrite —— 免费层根本用不到,不为看不见的东西花输出 token,#102 教训)。
   */
  pro: boolean
}

/**
 * JSON 一格(模型输出解析后的形态)。
 */
export type JsonCell = string | number | boolean | null | JsonObj | JsonCell[]

/**
 * JSON 对象格。
 */
export type JsonObj = { [k: string]: JsonCell }

/**
 * 模型输出收口的结果:一个 JSON 对象;收不出来是 null。
 */
export type ParsedJson = JsonObj | null

/**
 * 可缺位的数（CLB 换算结果的本域名字）。
 */
export type MaybeNum = number | null

/**
 * 抽取输出里的一个职名格（模型给的，逐格验后才用）。
 */
export type ExtractTitleCell = {
  /**
   * 英文职名；不是字符串就丢。
   */
  title_en: JsonCell

  /**
   * 该职业年限；本轮不消费（预填建议另有入口）。
   */
  years: JsonCell
}

/**
 * IELTS 四项分（模型给的，四项都是数才换算）。
 */
export type IeltsCells = {
  /**
   * 听力。
   */
  listening: JsonCell

  /**
   * 阅读。
   */
  reading: JsonCell

  /**
   * 写作。
   */
  writing: JsonCell

  /**
   * 口语。
   */
  speaking: JsonCell
}

/**
 * 简历抽取的模型输出形状（parseLlmJson 结果的跨边界断言目标，逐格验后才用）。
 */
export type ExtractData = {
  /**
   * 职名列表；不是数组 = 模型输出坏了（502）。
   */
  titles: ExtractTitleCell[] | null

  /**
   * IELTS 四项；简历没写是 null。
   */
  ielts: IeltsCells | null

  /**
   * 直写的 CLB；简历没写是 null。
   */
  clb: JsonCell
}

/**
 * NOC 候选一条（职名 trgm 命中）。
 */
export type NocCandidate = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 官方英文职业名（第二步回表补；查不到空串）。
   */
  title: string
}

/**
 * `nocCandidatesOf` 的入参。
 */
export type NocCandidatesIn = {
  /**
   * 能查的连接（池由调用方注进来）。
   */
  db: Db

  /**
   * 验过形的英文职名（最多 TITLES_N_MAX 个）。
   */
  titles: string[]
}

/**
 * `nocCandidatesOf` 的返回。
 */
export type NocCandidatesOut = Promise<NocCandidate[]>

/**
 * trgm 命中行（只消费 noc 一格；sim/n 只参与排序）。
 */
export type NocSimDbRow = {
  /**
   * 五位职业码；库里可空。
   */
  noc: string | null

  /**
   * 相似度(float4 回来是数字;只有从简历填档案读它)。
   */
  sim: number | string | null
}

/**
 * NOC 官方名回表行。
 */
export type NocTitleRow = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 英文职业名。
   */
  title: string
}

/**
 * POST /api/resume/match 的请求体形状（跨边界断言目标，逐格判后才用）。
 */
export type MatchBody = {
  /**
   * 岗位 id（jd 没带时服务端按它兜一次）。
   */
  jobId: number | string | null

  /**
   * JD 文本（前端传；服务端只截断不信任）。
   */
  jd: string | null

  /**
   * 简历文本（内存里比完即弃，默认不落库）。
   */
  resume: string | null

  /**
   * 输出语种。
   */
  lang: string | null

  /**
   * 存进档案（只在用户显式勾选 true 时发生 —— 默认不存是红线，别用真值判断）。
   */
  save: boolean | null
}

/**
 * matchUses 账本所在的档案格（users.profile 的跨边界断言目标，只读这一格）。
 */
export type MatchUsesProfile = {
  /**
   * "YYYY-MM-DD:N"（跨日自动清零）；没用过是 null。
   */
  matchUses: string | null
}

/**
 * NOC 官方名回表的原始行（多出的三语列不声明不消费）。
 */
export type NocTitleDbRow = {
  /**
   * 五位职业码；库里可空。
   */
  noc: string | null

  /**
   * 英文职业名；库里可空。
   */
  title: string | null
}

/**
 * 可缺位的 IELTS 四项（简历没写是 null）。
 */
export type MaybeIelts = IeltsCells | null

/**
 * 简历原件元信息的库行(user_resumes 不带原件那几格;pg 原样交回,先按可空收)。
 */
export type ResumeFileDbRow = {
  /**
   * 简历 id(serial)。
   */
  id: number | string | null

  /**
   * 是不是默认那份。
   */
  is_default: boolean | null

  /**
   * 上传时的原文件名。
   */
  file_name: string | null

  /**
   * MIME(PDF 或 .docx)。
   */
  mime: string | null

  /**
   * 字节数(int4,pg 给 number;按库行惯例连字符串一起收)。
   */
  size_bytes: number | string | null

  /**
   * 上传时刻(timestamptz,pg 给 Date)。
   */
  uploaded_at: TimeCell
}

/**
 * 库回的时刻格(timestamptz:pg 给 Date,测试桩可能给串)。
 */
export type TimeCell = Date | string | null

/**
 * 简历原件元信息(洗净;也是上传 / 查元信息两个接口的线格式)。
 */
export type ResumeFileMeta = {
  /**
   * 简历 id(取原件、替换、删除时指明是哪一份)。
   */
  id: number

  /**
   * 是不是默认那份(投递时默认附它)。
   */
  isDefault: boolean

  /**
   * 上传时的原文件名(只给本人看)。
   */
  fileName: string

  /**
   * MIME。
   */
  mime: string

  /**
   * 字节数。
   */
  sizeBytes: number

  /**
   * 上传时刻(ISO 串)。
   */
  uploadedAt: string
}

/**
 * 本人的简历清单(默认那份在最前)。
 */
export type ResumeFileMetas = ResumeFileMeta[]

/**
 * 简历原件的库行(带 base64 正文)。
 */
export type ResumeBlobDbRow = {
  /**
   * 原件 base64。
   */
  file_b64: string | null

  /**
   * 原文件名。
   */
  file_name: string | null

  /**
   * MIME。
   */
  mime: string | null
}

/**
 * 简历原件(洗净:base64 已解回字节)。
 */
export type ResumeBlob = {
  /**
   * 原文件名。
   */
  fileName: string

  /**
   * MIME。
   */
  mime: string

  /**
   * 原件字节。
   */
  bytes: Uint8Array
}

/**
 * 原件或没有。
 */
export type MaybeResumeBlob = ResumeBlob | null

/**
 * 用户 id(payload 给的是 number 或 string,原样带进 SQL 参数)。
 */
export type UserId = string | number

/**
 * 按人取 / 删简历(`loadResumeMeta` / `loadResumeBlob` / `deleteResumeFile`)的入参。
 */
export type ResumeUserIn = {
  /**
   * 数据库连接(调用方注入,本域不自己连库)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId
}

/**
 * 取清单的返回。
 */
export type ResumeListOut = Promise<ResumeFileMetas>

/**
 * 按人数份数的返回。
 */
export type ResumeCountOut = Promise<number>

/**
 * 计数库行。
 */
export type CountDbRow = {
  /**
   * 份数。
   */
  n: number | string | null
}

/**
 * 写入后的回行(新 id 与是否默认)。
 */
export type ResumeIdDbRow = {
  /**
   * 简历 id。
   */
  id: number | string | null

  /**
   * 是不是默认那份。
   */
  is_default: boolean | null
}

/**
 * 写入后的回行(洗净)。
 */
export type ResumeIdFact = {
  /**
   * 简历 id。
   */
  id: number

  /**
   * 是不是默认那份。
   */
  isDefault: boolean
}

/**
 * 按人按份取 / 删(`loadResumeBlob` / `deleteResumeFile`)的入参。
 */
export type ResumeOneIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 简历 id。
   */
  id: number
}

/**
 * 取原件的返回。
 */
export type ResumeBlobOut = Promise<MaybeResumeBlob>

/**
 * 新加或替换一份(`saveResumeFile`)的入参。
 */
export type ResumeSaveIn = {
  /**
   * 数据库连接。
   */
  db: Db

  /**
   * 替换哪一份(null = 新加一份)。
   */
  replaceId: number | null

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 原件 base64。
   */
  b64: string

  /**
   * 文件名(已截到入库上限)。
   */
  fileName: string

  /**
   * MIME(已按文件头判过)。
   */
  mime: string

  /**
   * 字节数。
   */
  sizeBytes: number
}

/**
 * 存简历的返回:写好的元信息;替换的那一份不是本人的给 null。
 */
export type ResumeSaveOut = Promise<ResumeFileMeta | null>

/**
 * 删简历的返回。
 */
export type ResumeDeleteOut = Promise<void>

/**
 * 判文件类型(`fileMimeOf`)的入参。
 */
export type FileMimeIn = {
  /**
   * 上传时的文件名(取扩展名)。
   */
  name: string

  /**
   * 文件头(前几个字节按 latin1 读成的串)。
   */
  head: string
}

/**
 * MIME 或「不收」。
 */
export type MaybeMime = string | null

/**
 * 拼处置头(`dispositionOf`)的入参。
 */
export type DispositionIn = {
  /**
   * 文件名。
   */
  fileName: string

  /**
   * 是否按下载给(否则浏览器里直接打开)。
   */
  download: boolean
}

/**
 * 补文件名(`fileNameOf`)的入参。
 */
export type FileNameIn = {
  /**
   * 浏览器交来的文件名(可能是空串)。
   */
  name: string

  /**
   * 已判出的 MIME。
   */
  mime: string
}

/**
 * 简历 id 或没有(查询参数没带、或不是正整数)。
 */
export type MaybeResumeId = number | null

/**
 * 从简历填档案时模型回的 JSON(先按声明形状收下,逐格判后才用)。
 */
export type PrefillData = {
  /**
   * 英文姓名;简历没写是 null。
   */
  name: JsonCell

  /**
   * 做过的工作(英文职业名)。
   */
  titles: JsonCell

  /**
   * 专业(英文)。
   */
  majors: JsonCell

  /**
   * 教育经历(2026-11-12;证书或学历名称、学校、起止年份)。
   */
  education: JsonCell

  /**
   * 工作经历(2026-11-12;职业、职位名称、雇主、城市、起止年月、职责)。模型可能漏掉这一格:缺席按没有读。
   */
  jobs?: JsonCell
}

/**
 * 洗净的提取结果(全是字符串;没有 = 空)。
 */
export type PrefillFact = {
  /**
   * 英文姓名;没有 = 空串。
   */
  name: string

  /**
   * 做过的工作。
   */
  titles: string[]

  /**
   * 专业。
   */
  majors: string[]

  /**
   * 教育经历(2026-11-12;洗净的,至多 PREFILL_EDU_MAX 条)。
   */
  education: PrefillEdus

  /**
   * 工作经历(2026-11-12;洗净的,至多 PREFILL_JOBS_MAX 段)。
   */
  jobs: PrefillJobs
}

/**
 * 从简历提取的一段工作经历(洗净的;各格字符串,简历没写 = 空串)。
 */
export type PrefillJob = {
  /**
   * 职业的英文通称(映射职业码用)。
   */
  occupation: string

  /**
   * 职位名称,照简历原文。
   */
  title: string

  /**
   * 雇主。
   */
  employer: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始年月(2021 或 2021-03);没写 = 空串。
   */
  from: string

  /**
   * 结束年月;在职或没写 = 空串。
   */
  to: string

  /**
   * 职责,一行一条,照简历原文。
   */
  notes: string
}

/**
 * 几段工作经历。
 */
export type PrefillJobs = PrefillJob[]

/**
 * 一段工作经历或没有(toPrefillJob:这一项不合形或全空就丢)。
 */
export type MaybePrefillJob = PrefillJob | null

/**
 * 回给档案表单的一段工作经历(形同答案档 cv.work 的一项)。
 */
export type PrefillWork = {
  /**
   * 这一段对应的职业码;映射不上 = 空列。
   */
  nocs: string[]

  /**
   * 职位名称。
   */
  title: string

  /**
   * 公司。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始年月。
   */
  from: string

  /**
   * 结束年月;在职或没写 = 空串。
   */
  to: string

  /**
   * 做了什么(职责原文,一行一条)。
   */
  desc: string
}

/**
 * prefillJobsOf 的入参。
 */
export type PrefillJobsIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 洗净的几段工作经历。
   */
  jobs: PrefillJobs
}

/**
 * prefillJobsOf 的返回。
 */
export type PrefillJobsOut = Promise<PrefillWork[]>

/**
 * 从简历提取的一条教育经历(2026-11-12;四格都是字符串,简历没写 = 空串)。
 * 同日 Frank「简历里能抽出来吧」:多三格 —— 院校所在地、公立私立、课程时长,只认档案表单三只下拉的取值,别的一律空串。
 */
export type PrefillEdu = {
  /**
   * 证书或学历名称,照简历原文。
   */
  credential: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份(四位数字);没写 = 空串。
   */
  from: string

  /**
   * 结束年份(四位数字);没写或在读 = 空串。
   */
  to: string

  /**
   * 院校所在地:省码或 abroad;看不出 = 空串。
   */
  prov: string

  /**
   * public / private;看不出 = 空串。
   */
  kind: string

  /**
   * y1 / y2 / y3 / master;看不出 = 空串。
   */
  len: string
}

/**
 * 从简历提取的教育经历清单。
 */
export type PrefillEdus = PrefillEdu[]

/**
 * 一条教育经历或没有(toPrefillEdu:这一项不合形或四格全空就丢)。
 */
export type MaybePrefillEdu = PrefillEdu | null

/**
 * prefillCellOf 的入参。
 */
export type PrefillCellIn = {
  /**
   * 模型回的一格(模型可能漏掉这一格:缺席按没有读)。
   */
  cell?: JsonCell

  /**
   * 至多几个字。
   */
  max: number
}

/**
 * prefillOptOf 的入参(2026-11-12)。
 */
export type PrefillOptIn = {
  /**
   * 模型回的一格(模型可能漏掉这一格:缺席按没有读)。
   */
  cell?: JsonCell

  /**
   * 这一格只认的取值。
   */
  opts: string[]
}

/**
 * 一串码或一串字。
 */
export type PrefillCodes = string[]

/**
 * 取默认简历文字的结果。
 */
export type PrefillTextFact = {
  /**
   * 简历文字;取不到 = 空串。
   */
  text: string

  /**
   * 错误码;成功 = 空串。
   */
  error: string
}

/**
 * 取默认简历文字的返回。
 */
export type PrefillTextOut = Promise<PrefillTextFact>

/**
 * 职业名映射职业码的入参。
 */
export type PrefillWorksIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 英文职业名。
   */
  titles: string[]
}

/**
 * 职业名映射职业码的返回。
 */
export type PrefillWorksOut = Promise<PrefillCodes>

/**
 * 按专业名搜专业码的函数(路由注入 lib/majors 的搜索)。
 */
export type PrefillHitsFn = (q: string) => PrefillCodes

/**
 * 专业名映射专业码的入参。
 */
export type PrefillMajorsIn = {
  /**
   * 英文专业名。
   */
  names: string[]

  /**
   * 按名搜码。
   */
  hitsOf: PrefillHitsFn
}

/**
 * 模型回的一格清单收成字符串清单的入参。
 */
export type CellTextsIn = {
  /**
   * 原格。
   */
  cell: JsonCell

  /**
   * 最多几个。
   */
  max: number
}

/**
 * 一行 trgm 命中的职业码与相似度(洗净)。
 */
export type NocSimFact = {
  /**
   * 职业码;缺位空串。
   */
  noc: string

  /**
   * 相似度(0 到 1)。
   */
  sim: number
}

/**
 * 补提简历正文(ensureResumeBody)的返回。
 */
export type ResumeBodyOut = Promise<void>
