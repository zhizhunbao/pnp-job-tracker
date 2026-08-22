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
  buildJobsWhere, checkedAt, fetchAlertHits, fetchBroadNocs, fetchCompanyByJobId, fetchCompanyBySlug,
  fetchJobById, fetchJobRows, fetchJobsPage, fetchMatchPage, fetchNocOpenCounts, fetchQuizFacts,
  fetchOccCompetition, fetchRelatedJobs, fetchSimilarEmployers, fetchSsrDims, fetchTopNocs,
  fetchTopNocsCached, fetchTotalAndProof, jobDescription,
  loadMatchDims, pnpOnly, scrubPii, searchNocByTitle, splitQ,
} from './functions'
export { mapEeCat, mapPnpOcc } from './rows'
export type { CompanyDetail, RelatedJob, SimilarEmployer, SsrDims } from './types'
