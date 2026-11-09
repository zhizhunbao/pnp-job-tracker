/**
 * me 桶子桶 jobs 的子桶 record —— 导出求职记录(2026-11-08 清单第 7 条,出处 Job Bank「track your job search activities」)。
 * 父桶 functions 贴着 1000 行闸,切出这一族;依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */
export { downloadRecord, hasSentOf, recordCsvOf } from './functions'
export type { RecordHead, RecordRow } from './types'
