/**
 * jobs 页面域的桶 —— 全站基准视图:/jobs 职位板(Jobs)与 /jobs/[id] 职位详情(Job),
 * 外加它们身上那批被别的页面域借走的件:定价弹框与价卡(header / employers / pricing)、
 * 三判面板与条件网格与省分卡(plan)、公司身体(companies)、首访引导的记忆键(quiz)、
 * 列宽与列/筛选的 cookie 契约(page.tsx 的 SSR 侧要按同一份键读写)。
 * 2026-08-26 自 app/(frontend)/jobs/ 整体迁入(动态段 [id] 拍平进域根)。
 * 对应 lib 域:lib/jobs。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { default as Jobs } from './Jobs'
export { BANNER_COOKIE } from './Jobs'
export { default as Job } from './Job'
export { CompanyBody } from './Company'
export { ConditionGrid } from './ConditionGrid'
export { PnpScoreCard } from './PnpScoreCard'
export { PRICE, PricingCard, PricingModal } from './PricingModal'
export type { PriceCaps } from './PricingModal'
export { TripleVerdictPanel } from './TripleVerdictModal'
export { OB_SEEN_KEY } from './OnboardingWizard'
export { resizeColWidths } from './colWidths'
export { COLW_COOKIE, DEFAULT_COLW_SEED, parseColWidthSeed } from './colWidths.shared'
export type { ColWidthSeed } from './colWidths.shared'
export { COLS_COOKIE } from './columns.shared'
export { parseJobFilters, toSearchParams } from './filters.shared'
