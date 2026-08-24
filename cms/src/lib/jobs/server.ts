/**
 * 职位域的**服务端**门:取数、维度、JD 正文 —— 依赖链上要 `Db`,浏览器跑不了。
 * 门里只有转发(闸 door-forward-only);连接池由调用方注进来(拍板③:db 只在边缘,
 * 路由/页面自己 `getDb()` 再传 —— 本域不 import payload)。
 *
 * @author Frank
 * @time 2026-08-22 00:05:00
 */

export { PROV_NAME } from './constants'
export {
  buildJobsWhere, checkedAt, loadAlertHits, loadBroadNocs, loadCompanyByJobId, loadCompanyBySlug,
  loadJobById, loadJobRows, loadJobsPage, loadMatchPage, loadNocOpenCounts, loadQuizFacts,
  loadOccCompetition, loadRelatedJobs, loadSimilarEmployers, loadSsrDims, loadTopNocs,
  getTopNocs, loadTotalAndProof, jobDescription,
} from './functions'
export {
  loadCityCard, loadMatchDims, loadProvinceCard, pnpOnly, scrubPii, searchNocByTitle, splitQ,
} from './functions'
export { mapEeCat, mapPnpOcc } from './functions'
export type { AlertHit, CompanyDetail, JobsFilters, RelatedJob, SimilarEmployer, SsrDims, TopNoc } from './types'
export {
  jobsJdformatRoute, jobsJdTranslateRoute, jobsApplyhowRoute, jobsCityRoute, jobsCompanyRoute, jobsCompetitionRoute, jobsDimsRoute,
  jobsProvinceRoute, jobsRoute, jobsTextRoute,
} from './routes'
export {
  loadApplyUrlById, loadJdFormatted, loadJdState,
} from './functions'
