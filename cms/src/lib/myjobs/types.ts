/**
 * 我的岗位域(lib/myjobs)的形状:库行 → 对外行(两张表同一种线格式)。
 *
 * @author Frank
 * @time 2026-10-06 23:00:00
 */
import type { Db } from '../db'

/**
 * 一行的库行(收藏表连职位表、城市表;职位删了时职位那几格是 NULL)。
 */
export type MyJobDbRow = {
  /**
   * 收藏记录 id。
   */
  id: number | string | null

  /**
   * 职位 id(职位删了是 NULL)。
   */
  job_id: number | string | null

  /**
   * 职位名快照。
   */
  title: string | null

  /**
   * 公司名快照。
   */
  company: string | null

  /**
   * 投递进度(空 / applied / interview / offer)。
   */
  status: string | null

  /**
   * 收藏的时刻。
   */
  created_at: TimeCell

  /**
   * 最近一次改进度的时刻(已投的行 = 点「邮箱投递」那一刻)。
   */
  updated_at: TimeCell

  /**
   * 城市英文名。
   */
  city: string | null

  /**
   * 城市中文译名(人工核定)。
   */
  city_zh: string | null

  /**
   * 城市韩文译名(人工核定)。
   */
  city_ko: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 薪资显示串(数据层洗好,如 $18–$21/hr)。
   */
  salary_text: string | null

  /**
   * 折算年薪(数据层算好;薪资列按它排序)。
   */
  salary_annual: number | string | null

  /**
   * 发布日期。
   */
  date_posted: TimeCell

  /**
   * 公司页 slug(公司表没这家 / 职位删了是 NULL)。
   */
  company_slug: string | null

  /**
   * 职位状态(open / closed / campus;职位删了是 NULL)。
   */
  job_status: string | null

  /**
   * 库里有投递邮箱(我的收藏:能不能直接投;我的求职那条 SQL 给 false;2026-10-08)。
   */
  has_email: boolean | null
}

/**
 * 计数库行(已投几封)。
 */
export type CountDbRow = {
  /**
   * 条数。
   */
  n: number | string | null
}

/**
 * 时刻格(pg 的 timestamptz 交回 Date;测试桩可能给串)。
 */
export type TimeCell = Date | string | null

/**
 * 一行(洗净;也是两个接口的线格式)。
 */
export type MyJobRow = {
  /**
   * 收藏记录 id(取消收藏时 DELETE 它)。
   */
  id: number

  /**
   * 职位 id;null = 职位已从库里删掉(打不开职位页)。
   */
  jobId: number | null

  /**
   * 职位名(英文原名;没有 = 空串)。
   */
  title: string

  /**
   * 公司名(没有 = 空串)。
   */
  company: string

  /**
   * 城市英文名(没有 = 空串)。
   */
  city: string

  /**
   * 城市中文译名(没有 = 空串)。
   */
  cityZh: string

  /**
   * 城市韩文译名(没有 = 空串)。
   */
  cityKo: string

  /**
   * 省码(没有 = 空串)。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 折算年薪(排序用;没有 = null)。
   */
  salaryAnnual: number | null

  /**
   * 发布日期(ISO;没有 = 空串)。
   */
  datePosted: string

  /**
   * 公司页 slug(点公司名开公司弹框;没有 = 空串,公司名不可点)。
   */
  companySlug: string

  /**
   * 投递进度(空串 = 只收藏没投;applied / interview / offer)。
   */
  stage: string

  /**
   * 收藏的时刻(ISO)。
   */
  savedAt: string

  /**
   * 最近一次改进度的时刻(ISO;已投的行 = 投递那一刻)。
   */
  updatedAt: string

  /**
   * 职位已下架。
   */
  closed: boolean

  /**
   * 库里有投递邮箱(我的收藏表上出「投递」钮的前提;2026-10-08)。
   */
  hasEmail: boolean
}

/**
 * 用户 id(payload 给的是 number 或 string,原样带进 SQL 参数)。
 */
export type UserId = string | number

/**
 * 按人取清单(loadApplied / loadSaved)的入参。
 */
export type MyJobsIn = {
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
export type MyJobsOut = Promise<MyJobRow[]>

/**
 * 取计数的返回。
 */
export type CountOut = Promise<number>
