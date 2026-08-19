// 雇主域的**服务端**入口 —— 四条线的取数与组装;要连库或要 pool,只能在服务端跑。
//
// 🔴 为什么必须和 `index.ts` 分开(照 lib/jobs 08-18 实撞的教训):
//    `employerCompare` / `board` 的依赖链上挂着 `payload` 与 `@/payload.config`(连接池、集合配置),
//    其余几支即便自己不 import payload,也都要外部注进来的 `pool`/`Db` —— 浏览器里根本跑不了。
//    而 `Employers.tsx` / `Sponsors.tsx` / `Compare.tsx` 是 `'use client'` 组件,只要枚举与形状。
//    一旦它们从同一个桶取,打包器会把整条链拉进**浏览器**包(tsc 全绿,build 才炸)。
//    服务端要另一半时照旧从 `@/lib/employers` 取,两边不重复导出。
//
// `board` 2026-08-19 从 `app/(frontend)/employers/board.ts` 收编进来:它是 SSR 取数,
// 却住在路由树里(全仓仅有的两个这种文件之一)。边界从此可 grep:数据访问只在 lib 与 Next 服务端入口。

export { EMP_PAGE_SIZE, EMP_SSR_ROWS, loadEmployerPage, normalizeEmployerFilters } from './designatedEmployers'
export type { EmployerMode, Pool } from './designatedEmployers'
export { employersBoardProps } from './board'
export { SE_SSR_ROWS, applySponsorFilters, buildSponsorBoards, fetchSponsorEmployers } from './sponsorEmployers'
export type { SponsorBoards } from './sponsorEmployers'
export { compareEmployers } from './employerCompare'
export { companyRow, investigateCompany } from './companyResearch'
export type { CompanyResearch } from './companyResearch'
export { fetchOccupations } from './directory'
