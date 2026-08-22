/**
 * 数据库层的桶 —— **浏览器也能打包的那半**:形状、默认值词汇表、SQL 文本。
 *
 * 门里只有转发,一个函数都没有(宪法「两个门的域怎么摆」)。
 * 真去连库的 `getDb` / `dbOf` 走 `./server` —— 它沾 payload,进了这个桶,
 * 连接池就会被打进浏览器包(tsc 全绿、只有 build 才炸)。
 *
 * `SQL` 以命名空间整体转发:180 条语句的家仍是 `./sql.ts`(宪法特批的「另一种介质」,
 * 文件名就是内容说明,不改名)。
 *
 * @author Frank
 * @time 2026-08-21 15:21:30
 */

export {
  count, numOrNull, poolOf, queryRows, show, text, textOrNull,
} from './functions'

export * as SQL from './sql'

export type {
  Db, DbClient, DbPool, PayloadWithPool, QueryResult, QueryRowsIn, SqlParam,
} from './types'
