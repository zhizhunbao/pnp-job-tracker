/**
 * og 域的形状 —— 本域自己声明,不从别的域取。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */

/**
 * 职位卡要画的洗净格(lib/jobs 的 JobOgFact 全格照抄 —— 跨域不取各家一份;
 * 结构相同即兼容,接缝零断言)。
 */
export type JobOgView = {
  /**
   * 标题;查无此岗给品牌兜底句。
   */
  title: string

  /**
   * 公司名;没有 null(整行不出)。
   */
  company: string | null

  /**
   * 「城市, 省」合并好的一段;空串 = 不出。
   */
  loc: string

  /**
   * 薪资展示串;空串 = 不出。
   */
  salary: string

  /**
   * 徽章清单(空表 = 不出)。
   */
  chips: string[]
}

/**
 * JobOgCard 的 props。
 */
export type JobOgCardIn = {
  /**
   * 要画的洗净格。
   */
  og: JobOgView

  /**
   * 岗位号(右下角地址尾巴)。
   */
  id: string
}

/**
 * JobOgChips 的 props。
 */
export type JobOgChipsIn = {
  /**
   * 徽章清单(空表时由 JobOgCard 整段不渲)。
   */
  chips: string[]
}
