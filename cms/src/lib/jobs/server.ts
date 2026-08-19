// 职位域的**服务端**入口 —— 取数、维度、JD 正文;它们要连库,只能在服务端跑。
//
// 🔴 为什么必须和 `index.ts` 分开(2026-08-18 实撞,dev 直接白屏):
//    `queries` / `dims` / `jd` 这三支的依赖链上挂着 `payload` 与 `@/payload.config`(连接池、集合配置),
//    而 `Table.tsx` / `Pnp.tsx` / `OnboardingWizard.tsx` 是 `'use client'` 组件、只要 `match` 与 `source`。
//    一旦它们从同一个桶取,打包器会把整条链拉进**浏览器**包 ——
//    `Can't resolve 'fs/promises' / 'net' / 'tls'` 一屏,页面渲不出来(tsc 全绿,build 才炸)。
//    **桶不挑食,浏览器挑食** —— 所以混着服务端依赖的模块必须有两个门:
//      · `@/lib/jobs`        客户端也安全的那半(match / source / 形状)
//      · `@/lib/jobs/server` 只在服务端跑的那半(本文件)
//    服务端要另一半时照旧从 `@/lib/jobs` 取,两边不重复导出。

export {
  PROV_NAME, buildJobsWhere, checkedAt, fetchAlertHits, fetchBroadNocs, fetchCompanyByJobId,
  fetchCompanyBySlug, fetchJobById, fetchJobRows, fetchJobsPage, fetchMatchPage, fetchNocOpenCounts,
  fetchQuizFacts, fetchRelatedJobs, fetchSimilarEmployers, fetchSsrDims, fetchTopNocs, fetchTotalAndProof,
  mapEeCat, mapPnpOcc, pnpOnly, searchNocByTitle, splitQ,
} from './queries'
export type { CompanyDetail, RelatedJob, SimilarEmployer, SsrDims } from './queries'
export { loadMatchDims } from './dims'
export { jobDescription, scrubPii } from './jd'
