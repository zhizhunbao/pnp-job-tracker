/**
 * 导出求职记录的形状。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */

/**
 * 一条投递记录。
 */
export type RecordRow = {
  /**
   * 投递日期。
   */
  date: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 状态。
   */
  status: string
}

/**
 * 表头(与 RecordRow 同序)。
 */
export type RecordHead = RecordRow

/**
 * recordCsvOf 的入参。
 */
export type RecordCsvIn = {
  /**
   * 表头。
   */
  head: RecordHead

  /**
   * 各行。
   */
  rows: RecordRow[]
}

/**
 * downloadRecord 的入参。
 */
export type RecordDownloadIn = {
  /**
   * 文件内容。
   */
  csv: string

  /**
   * 今天(年-月-日,进文件名)。
   */
  day: string
}

/**
 * hasSentOf 的入参。
 */
export type HasSentIn = {
  /**
   * 投递清单(只读状态一格)。
   */
  items: {
    /**
     * 状态值。
     */
    stage: string
  }[]

  /**
   * 草稿的状态值。
   */
  draft: string
}
