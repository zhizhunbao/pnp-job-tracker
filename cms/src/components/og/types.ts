/**
 * og 域的形状 —— 本域自己声明,不从别的域取;唯一例外是 Db(基础设施叶子的
 * 连接形状,牌形同 components/start/types.ts 的钦定特批格)。
 *
 * @author Frank
 * @time 2026-08-29 16:30:00
 */

/**
 * 职位卡要画的洗净格(lib/jobs 的 JobOgFact 全格照抄 —— 跨域不取各家一份;
 * 结构相同即兼容,接缝零断言)。
 */
// eslint-disable-next-line local/no-import-in-leaf -- 基础设施叶子的连接形状(钦定特批格,先例 start/news 的 types)
import type { Db } from '@/lib/db'

/**
 * `ogFileResponse` 的入参(壳递:请求 URL 取件名,连接给职位卡取数)。
 */
export type OgFileIn = {
  /**
   * 请求完整 URL(芯取路径末段当件名)。
   */
  url: string

  /**
   * 数据库连接(壳里 getDb 注入;站点卡不用它,职位卡取数用)。
   */
  db: Db
}

/**
 * 芯的返回:图响应;件名不合形给 null(壳按 404 收场)。
 */
export type MaybeOgResponse = Response | null

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
