/**
 * 简历域的形状 —— **本域自己声明,不从别的域取**。
 * MatchMessage 与 llm 域的 ChatMessage 结构同形(role 是它的子集),靠结构类型对上,不 import。
 *
 * @author Frank
 * @time 2026-08-22 16:00:00
 */

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
