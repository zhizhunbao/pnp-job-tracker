/**
 * 新闻域的形状 —— 本域自己声明（唯一例外：`import type` 自 db 基础设施叶子）。
 * 2026-08-23 立域：译文/速读的存取此前寄居 jobs（图 NewsSlim 现成），新闻和职位板
 * 回答的不是同一个问题 —— news 表的主人是本域（NewsSlim 等存量随 advisor 重建批再迁）。
 *
 * @author Frank
 * @time 2026-08-23 12:40:00
 */

// eslint-disable-next-line local/no-import-in-leaf -- db 是基础设施叶子（能 query 的连接形状归它），与 stats/types 同一特批
import type { Db } from '../db'

/**
 * 可缺位的文本（库里可空列的本域名字）。
 */
export type MaybeStr = string | null

/**
 * 新闻翻译源行：英文正文 + 已有译文缓存。
 */
export type NewsTransRow = {
  /**
   * 英文正文；没有是 null（= 库里没这条或没正文）。
   */
  en: MaybeStr

  /**
   * 已有的译文；没翻过是 null。
   */
  cached: MaybeStr
}

/**
 * 新闻速读源行：标题 + 英文正文 + 已有速读。
 */
export type NewsSummaryRow = {
  /**
   * 标题。
   */
  title: string

  /**
   * 英文正文；没有是 null。
   */
  en: MaybeStr

  /**
   * 已有的速读；没生过是 null。
   */
  cached: MaybeStr
}

/**
 * `loadNewsForTranslate` / `saveNewsTranslation` 等新闻译文存取的入参。
 */
export type NewsTransIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 新闻 slug。
   */
  slug: string

  /**
   * 目标语种（zh/ko；列名映射在 NEWS_BODY_COL）。
   */
  lang: string
}

/**
 * `loadNewsForTranslate` 的返回（查无这条是 null）。
 */
export type NewsTransOut = Promise<NewsTransRow | null>

/**
 * `saveNewsTranslation` 的入参。
 */
export type NewsTransSaveIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 新闻 slug。
   */
  slug: string

  /**
   * 目标语种。
   */
  lang: string

  /**
   * 校验过的译文全文。
   */
  body: string
}

/**
 * `loadNewsForSummary` 的返回（查无这条是 null；列未建由查询抱错、路由容错）。
 */
export type NewsSummaryOut = Promise<NewsSummaryRow | null>

/**
 * `saveNewsSummary` 的入参。
 */
export type NewsSummarySaveIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 新闻 slug。
   */
  slug: string

  /**
   * 速读语种（zh/ko/en；列名映射在 NEWS_SUMMARY_COL）。
   */
  lang: string

  /**
   * 生成好的速读。
   */
  summary: string
}

/**
 * 库标量格（本域窄行只读文本列）。
 */
export type Cell = string | number | boolean | null

/**
 * 库里的一行（窄查询 + 词汇表收窄）。
 */
export type Row = Record<string, Cell>

/**
 * 写库即返类函数的返回（无体）。
 */
export type SavedOut = Promise<void>

/**
 * POST /api/news/translate 与 /api/news/summarize 的请求体形状（跨边界断言目标，
 * 逐格判后才用）。
 */
export type NewsTransBody = {
  /**
   * 新闻 slug；不是字符串当没带。
   */
  slug: string | null

  /**
   * 目标语种；不在白名单 400。
   */
  lang: string | null
}
