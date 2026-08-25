/**
 * 新闻域的常量：译文/速读的列名映射与两个端点的限额。
 *
 * @author Frank
 * @time 2026-08-23 12:40:00
 */

/**
 * 新闻正文译文列：语种 → 列名（懒翻译的 DB 永久缓存；seed 对这两列不清）。
 */
export const NEWS_BODY_COL: Record<string, string> = {
  /**
   * 中文正文列。
   */
  zh: 'body_zh',

  /**
   * 韩文正文列。
   */
  ko: 'body_ko',
}

/**
 * 新闻速读列：语种 → 列名（summary_en 由 DDL4 手写加，未跑时查询报错由路由容错）。
 */
export const NEWS_SUMMARY_COL: Record<string, string> = {
  /**
   * 中文速读列。
   */
  zh: 'summary_zh',

  /**
   * 韩文速读列。
   */
  ko: 'summary_ko',

  /**
   * 英文速读列。
   */
  en: 'summary_en',
}

/**
 * news-translate 的 IP 日限（缓存命中不计）。
 */
export const NTR_IP_DAILY = 60

/**
 * news-translate 限额键前缀。
 */
export const NTR_LIMIT_PREFIX = 'ntr:'

/**
 * news-summarize 的 IP 日限。
 */
export const NSUM_IP_DAILY = 60

/**
 * news-summarize 限额键前缀。
 */
export const NSUM_LIMIT_PREFIX = 'nsum:'

/**
 * 错误体：段落对位失败（整篇拒收红线）。
 */
export const E_PARA_ALIGN = 'paragraph alignment failed'

/**
 * 错误体：速读太短/没给。
 */
export const E_EMPTY_SUMMARY = 'empty summary'

/**
 * 请求体里这一格没给时的占位:空串。两个 handler 收 body 的路数一样 ——
 * 起手按「没给」落地,`typeof === 'string'` 过了才覆盖上去,JSON 本身坏掉则在 catch 里
 * 把它按回「没给」。于是「缺字段」「类型不对」「body 是坏 JSON」三种脏法收成同一种,
 * 下面只留一条拒收线(空 = 400),不必为每种脏法各写一支。
 */
export const BODY_MISSING = ''
