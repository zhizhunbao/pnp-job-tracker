/**
 * 新闻域的行为：译文/速读的存取（DB 列 = 永久缓存，第二个读者秒开；
 * seed 对这些列不清）。池由调用方注进来，本文件不 import payload（方案 A）。
 *
 * @author Frank
 * @time 2026-08-23 12:40:00
 */

import { count, firstOf, queryRows, SQL, text, textOrNull } from '../db'
import { NEWS_BODY_COL, NEWS_SUMMARY_COL } from './constants'
import type {
  NewsCountOut, NewsDbIn, NewsSummaryOut, NewsSummaryRow, NewsSummarySaveIn, NewsSummaryTodo, NewsSummaryTodoIn, NewsSummaryTodoOut,
  NewsTransIn, NewsTransOut, NewsTransRow, NewsTransSaveIn, Row, SavedOut,
} from './types'

/**
 * 新闻译文源（英文正文 + 该语种已有译文；列名映射 NEWS_BODY_COL）。
 *
 * @param input 连接、slug 与语种（路由已验在白名单里）。
 * @returns 源行；查无这条是 null。
 */
export async function loadNewsForTranslate(input: NewsTransIn): NewsTransOut {
  const col = NEWS_BODY_COL[input.lang]
  if (col == null) {
    return null
  }
  const rows = await queryRows({ db: input.db, sql: SQL.newsBodyForTranslate(col), params: [input.slug], map: toNewsTransRow })
  return firstOf(rows)
}


/**
 * 写回新闻译文（= 永久缓存，第二个读者秒开；seed 对这两列不清）。
 *
 * @param input 连接、slug、语种与校验过的译文。
 * @returns 落库即返。
 */
export async function saveNewsTranslation(input: NewsTransSaveIn): SavedOut {
  const col = NEWS_BODY_COL[input.lang]
  if (col == null) {
    return
  }
  await input.db.query(SQL.newsSetTranslation(col), [input.body, input.slug])
}


/**
 * 新闻速读源（标题 + 英文正文 + 该语种已有速读）。summary_en 列未建（DDL4 未跑）
 * 时查询抱错 —— 不在这里吞，由路由容错成 503（这是部署态不是数据态）。
 *
 * @param input 连接、slug 与语种。
 * @returns 源行；查无这条是 null。
 */
export async function loadNewsForSummary(input: NewsTransIn): NewsSummaryOut {
  const col = NEWS_SUMMARY_COL[input.lang]
  if (col == null) {
    return null
  }
  const rows = await queryRows({ db: input.db, sql: SQL.newsForSummary(col), params: [input.slug], map: toNewsSummaryRow })
  return firstOf(rows)
}


/**
 * 写回新闻速读（= 永久缓存）。
 *
 * @param input 连接、slug、语种与速读。
 * @returns 落库即返。
 */
export async function saveNewsSummary(input: NewsSummarySaveIn): SavedOut {
  const col = NEWS_SUMMARY_COL[input.lang]
  if (col == null) {
    return
  }
  await input.db.query(SQL.newsSetSummary(col), [input.summary, input.slug])
}


/**
 * 缺速读的待办(有英文正文、中文或韩文速读还空着;一语一件,新的在前)。
 *
 * @param input 连接与件数。
 * @returns 待办清单。
 */
export async function loadNewsSummaryTodo(input: NewsSummaryTodoIn): NewsSummaryTodoOut {
  return queryRows({ db: input.db, sql: SQL.NEWS_SUMMARY_TODO, params: [input.limit], map: toNewsSummaryTodo })
}


/**
 * 缺速读的还剩几件(口径同 loadNewsSummaryTodo)。
 *
 * @param input 连接。
 * @returns 件数。
 */
export async function loadNewsSummaryLeft(input: NewsDbIn): NewsCountOut {
  const rows = await queryRows({ db: input.db, sql: SQL.NEWS_SUMMARY_TODO_COUNT, params: [], map: toCount })
  const n = firstOf(rows)
  if (n == null) {
    return 0
  }
  return n
}

// =========================================================================
// 行构造器（rows 抽屉 2026-08-23 撤编后的固定尾段：db 词汇只许 to* 体内）
// =========================================================================

/**
 * 一行新闻译文源（SQL.newsBodyForTranslate）。
 *
 * @param r 库里的一行。
 * @returns 英文正文与已有译文（都可缺）。
 */
export function toNewsTransRow(r: Row): NewsTransRow {
  return { en: textOrNull(r.en), cached: textOrNull(r.cached) }
}


/**
 * 一行新闻速读源（SQL.newsForSummary）。
 *
 * @param r 库里的一行。
 * @returns 标题、英文正文与已有速读。
 */
export function toNewsSummaryRow(r: Row): NewsSummaryRow {
  return { title: text(r.title), en: textOrNull(r.en), cached: textOrNull(r.cached) }
}


/**
 * 一件缺速读的待办(SQL.NEWS_SUMMARY_TODO)。
 *
 * @param r 库里的一行。
 * @returns slug、标题、英文正文与要补的语种。
 */
export function toNewsSummaryTodo(r: Row): NewsSummaryTodo {
  return { slug: text(r.slug), title: text(r.title), en: text(r.en), lang: text(r.lang) }
}


/**
 * 计数行(SQL.NEWS_SUMMARY_TODO_COUNT)。
 *
 * @param r 库里的一行。
 * @returns 件数。
 */
export function toCount(r: Row): number {
  return count(r.n)
}
