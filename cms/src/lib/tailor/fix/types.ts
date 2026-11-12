/**
 * tailor 子桶 fix 的形状(本桶自声明,只声明真读的格)。
 *
 * @author Frank
 * @time 2026-11-12 02:00:00
 */

/**
 * 模型回的 JSON 一格。
 */
export type JsonCell = string | number | boolean | null | JsonCell[] | { [key: string]: JsonCell }

/**
 * 一串 JSON 格。
 */
export type JsonCells = JsonCell[]

/**
 * cellOf 的入参。
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
 * 要补的那条要求里本桶真读的三格。
 */
export type FixReq = {
  /**
   * 职位描述里的原话。
   */
  jd: string

  /**
   * 求职信里写到它的那句(没有 = 空串)。
   */
  cover: string

  /**
   * 简历里写到它的那句(没有 = 空串)。
   */
  resume: string
}

/**
 * fixMsgOf 的入参。
 */
export type FixMsgIn = {
  /**
   * 要补的那条要求。
   */
  req: FixReq

  /**
   * 本岗简历里的各段工作(给简历补一句时列出来让模型指;给求职信补时给空数组)。
   */
  works: JsonCells

  /**
   * 基础简历全文。
   */
  base: string

  /**
   * 用户补充的事实。
   */
  facts: Record<string, string>
}

/**
 * withLineOf 的入参。
 */
export type WithLineIn = {
  /**
   * 本岗简历草稿。
   */
  cv: JsonCell

  /**
   * 加到第几段工作。
   */
  at: number

  /**
   * 加的那一句。
   */
  line: string
}

/**
 * withSentenceOf 的入参。
 */
export type WithSentenceIn = {
  /**
   * 求职信全文。
   */
  cover: string

  /**
   * 加的那一句。
   */
  line: string
}
