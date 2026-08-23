/**
 * 简历域的形状 —— **本域自己声明,不从别的域取**。
 * MatchMessage 与 llm 域的 ChatMessage 结构同形(role 是它的子集),靠结构类型对上,不 import。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

// eslint-disable-next-line local/no-import-in-leaf -- db 是基础设施叶子（能 query 的连接形状归它），与 stats/types 同一特批
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
