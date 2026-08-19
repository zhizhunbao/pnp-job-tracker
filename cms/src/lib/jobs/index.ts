// 职位域的桶 —— **对外只有这些**。
//
// 为什么单独存在:职位是这个站的主干,取数/匹配/JD/来源四件先前平铺在 lib/ 顶层,
// 一个调用点常要写三四行 import(`api/advisor` 写了 4 行)。收成一个模块之后外部只认这一个入口。
//
// 名字比别的桶多(44 个),不是松:`queries` 25 个导出、`match` 13 个,**每一个都真有模块外的消费者**
// (量过:25/25、13/13,没有一个是过度导出)—— 职位域本来就是站的主干,对外面就是这么大。
// 唯一没上桶的是 `jdFetch` 的 `lazyFetchJd`:它只有 `jd.ts` 一个消费者,留在模块内。
//
// 🔴 外部一律从这里取(eslint 边界闸盯着);模块内部四个文件之间走相对路径,**不从这个桶取**
//    —— 桶反过来引成员、成员再引桶,那是环(`lib/quiz` 立的规矩)。

// ── 取数:SQL 走 ../db/sql,这里只有取数与行映射 ────────────────────────────
export {
  PROV_NAME, buildJobsWhere, checkedAt, fetchAlertHits, fetchBroadNocs, fetchCompanyByJobId,
  fetchCompanyBySlug, fetchJobById, fetchJobRows, fetchJobsPage, fetchMatchPage, fetchNocOpenCounts,
  fetchQuizFacts, fetchRelatedJobs, fetchSimilarEmployers, fetchTopNocs, fetchTotalAndProof,
  mapEeCat, mapPnpOcc, pnpOnly, searchNocByTitle, splitQ,
} from './queries'
export type { CompanyDetail, RelatedJob, SimilarEmployer } from './queries'

// ── 匹配:档案 × 岗位的规则引擎(付费墙头牌,规则只住这一处)────────────────
export { NO_LIST_PROVINCES, hasProfile, match, matchRank, normalizeProfile, provListCoverage, reasonEn, statusEn } from './match'
export type { MatchDims, MatchJob, MatchProfile, MatchReason, ProvListCoverage } from './match'
export { loadMatchDims } from './dims'

// ── JD 正文与来源标签 ───────────────────────────────────────────────────────
export { jobDescription, scrubPii } from './jd'
export { blockedSrc, isDirect, sourceLabel } from './source'

// ── 形状:职位域的类型只有这一个家(库里一行 + 页面「怎么摆」的那三个)────────
export type {
  CoGradeDetail, ColKey, DesigEmp, Dims, EeCat, EeOcc, FieldGroup, FieldSource, JobRow, NewsSlim,
  NocDesc, Plan, PnpDraw, PnpOcc, PnpStream, ProvInfo,
} from './types'
