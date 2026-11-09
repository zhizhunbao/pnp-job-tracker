/**
 * cv 桶的子桶 prefill —— 从我的档案带工作经历与专业进简历(2026-11-08 清单第 8 条,出处 Job Bank Resume Builder Step 2、Job Match Step 3)。
 * 父桶 functions 贴着 1000 行闸,切出这一族;依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */
export { contactFilledOf, entriesWithNamesOf, loadProfileLists, makeProfileImport } from './functions'
export type { ProfileLists } from './types'
