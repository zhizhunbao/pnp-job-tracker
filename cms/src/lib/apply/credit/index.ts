/**
 * apply 桶的子桶 credit —— 按职位改写的额度(2026-11-09 Frank 逐条定:免费每人 3 个终身一次;会员从购买日起每 30 天一期、
 * 每期 60 个;手动重新生成免费每份文件每天 1 次、会员 5 次,不耗额度)。
 * 父桶 functions.ts 早已超 1000 行(基线存量),新关注点照 llm/ledger 的形开子桶;依赖只许父桶 → 子桶。
 * 表 docs/sql/ai-trials-20261007.sql(额度账)、docs/sql/apply-credit-20261109.sql(重新生成计数)。
 *
 * @author Frank
 * @time 2026-11-09 21:00:00
 */

export { creditLeftOf, creditOf, isCreditOpen, loadCredit, markCredit, periodOf, regenMaxOf, takeRegen } from './functions'
export { CREDIT_FREE_MAX, CREDIT_PRO_MAX, PLAN_FREE, PLAN_PRO } from './constants'
export type { CreditFact, CreditPlan } from './types'
