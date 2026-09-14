/**
 * coop 域的形状(校内板取数:pg 原始行 → 对外行;一参令 XxxIn)。
 * 唯一 import 是共享叶 lib/db 的 Db(基础设施例外,照 lib/employers/types.ts)。
 *
 * @author Frank
 * @time 2026-09-13 20:30:00
 */
import type { Db } from '../db'

/**
 * SQL.COOP_JOBS 的一行原始格(列名即 pg 列;to* 之前可能脏,值级清洗在 toCoopJobRow)。
 */
export type CoopJobDbRow = {
  /**
   * jobs.id(详情页路由段)。
   */
  id: number

  /**
   * 职位标题。
   */
  title: string | null

  /**
   * 雇主名(companies.name;LEFT JOIN 可空)。
   */
  company_name: string | null

  /**
   * 城市(空串 = 板上没给或没认出)。
   */
  city: string | null

  /**
   * 省码。
   */
  province: string | null

  /**
   * 工时词(full / part / 空)。
   */
  employment_hours: string | null

  /**
   * 雇佣期限词(permanent / term / seasonal / 空)。
   */
  employment_term: string | null

  /**
   * 发布日(to_char 出的 YYYY-MM-DD;校内板 = 本站首见日)。
   */
  date_posted: string | null
}

/**
 * 校内板一行(洗净;空串 = 没有)。
 */
export type CoopJobRow = {
  /**
   * jobs.id。
   */
  id: number

  /**
   * 职位标题。
   */
  title: string

  /**
   * 雇主名。
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
   * 工时词(full / part / 空串)。
   */
  empHours: string

  /**
   * 雇佣期限词(permanent / term / seasonal / 空串)。
   */
  empTerm: string

  /**
   * 发布日 YYYY-MM-DD(空串 = 没记)。
   */
  datePosted: string
}

/**
 * loadCoopJobs() 入参。
 */
export type LoadCoopJobsIn = {
  /**
   * 连接(调用方注入;方案 A)。
   */
  db: Db
}

/**
 * loadCoopJobs() 出参(洗净的行;表空回空数组)。
 */
export type LoadCoopJobsOut = Promise<CoopJobRow[]>
