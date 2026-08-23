/**
 * 榜单域的形状 —— **本域自己声明,不从别的域取**(唯一例外:`import type` 自 db 基础设施叶子)。
 * `RankRow` 2026-08-22 自 `app/(frontend)/rankings/Ranking.tsx` 搬来:形状的主人是取数的域,
 * 组件只是消费者(此前是 lib 反向 import 一个页面组件的倒置)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

// eslint-disable-next-line local/no-import-in-leaf -- db 是基础设施叶子(能 query 的连接形状归它),与 stats/types 同一特批
import type { Db } from '../db'

/**
 * 榜单的一行(rankings 表;零计算 —— 计算在 etl/10_build_rankings.py)。
 */
export type RankRow = {
  /**
   * 名次(1 起)。
   */
  rank: number

  /**
   * 行的种类(job / company;控制卡片形态)。
   */
  kind: string

  /**
   * 外部 id(岗 = posting id,公司 = slug)。
   */
  externalId: string

  /**
   * 职位名 / 公司名所配标题。
   */
  title: string

  /**
   * 公司名。
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
   * NOC 码。
   */
  noc: string

  /**
   * TEER 档;库里可空。
   */
  teer: number | null

  /**
   * 移民价值评分;库里可空。
   */
  score: number | null

  /**
   * 薪资原文。
   */
  salaryText: string

  /**
   * 年化薪资;库里可空。
   */
  salaryAnnual: number | null

  /**
   * 省提名通道文本。
   */
  pnpStream: string

  /**
   * 联邦 EE 类别文本。
   */
  eeCategory: string

  /**
   * 发布日期。
   */
  datePosted: string

  /**
   * 申请链接。
   */
  applyUrl: string

  /**
   * 官方原帖链接(E4-03:行只含事实字段 + 官方链接)。
   */
  officialUrl: string

  /**
   * 公司行:在招岗数;岗行不填。
   */
  openJobs: number | null

  /**
   * 公司行:省提名清单命中岗数;岗行不填。
   */
  namedJobs: number | null

  /**
   * 公司行:平均评分;岗行不填。
   */
  avgScore: number | null

  /**
   * 公司行:近两年 LMIA 获批职位数(#21 第 17 轮:第一排序键上榜可见)。
   */
  lmiaPositions: number | null

  /**
   * LMIA 数据的季度标注。
   */
  lmiaQuarter: string
}

/**
 * 榜单行的原始行(pg 给的一行;列值三态,判定在 rows 的词汇表)。
 */
export type RankDbRow = Record<string, string | number | null>

/**
 * slug 行的原始行。
 */
export type SlugDbRow = Record<string, string | null>

/**
 * `fetchRankingSlugs` 的返回(有数据的榜 slug 清单)。
 */
export type SlugsOut = Promise<string[]>

/**
 * `fetchRankingRows` 的返回(名次序的榜行)。
 */
export type RowsOut = Promise<RankRow[]>

/**
 * `fetchRankingRows` 的入参。
 */
export type FetchRowsIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 榜 slug(白名单 RANKING_SLUGS 先验,函数不重验)。
   */
  slug: string
}
