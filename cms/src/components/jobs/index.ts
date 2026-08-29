/**
 * jobs 页面域的桶 —— 全站基准视图:/jobs 职位板(Jobs + 它的顶栏 JobsHeader)与
 * /jobs/[id] 职位详情(Job),外加列宽、列集、筛选三份 cookie/URL 契约
 * (page.tsx 的 SSR 侧要按同一份键读写)。
 *
 * 2026-08-26 自 app/(frontend)/jobs/ 整体迁入(动态段 [id] 拍平进域根)。
 * 2026-08-28 拆域批搬走 12 件:定价三件去 pricing、省分卡去 plan、首访引导去 profile、
 * 省提名与通道卡去 pnp、三判与条件网格去 verdict、职业报告卡去 occupations、
 * 字段顾问去 advisor、简历对照去 resume;公司本体族重写进 components/companies。
 * 同日换装批整体重写成小写件形制:内联样式与注入的 \x3cstyle> 逐格迁 jobs.module.css、
 * 状态进 hooks.ts、口径与派生进 functions.ts、死值进 constants.ts、契约进 types.ts。
 * 同批两条拆分随 Frank 拍板落位:内嵌顾问初判段迁 components/advisor(它是顾问域的肉),
 * 「什么算没有 JD」迁 lib/jobs(那是数据口径不是视图)。
 *
 * ⚠️ 门上这几个名字是**承重墙**:两个页面门、header 的账户区、seed/api 与 tests/int 都在用,
 * cookie 键名与值格式更是线上有存量的 —— 改名要连它们一起改。
 * 对应 lib 域:lib/jobs。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
export {
  BANNER_COOKIE, BOARD_META, COLS_COOKIE, COLW_COOKIE, DEFAULT_COLW_SEED, EMPTY_MATCH_DIMS, EMPTY_RELATED,
  FIRST_SCREEN_ROWS, P_VIEW, STATUS_CLOSED, VAL_MATCH,
} from './constants'
export { Job } from './job'
export { Jobs } from './jobs'
export { JobsHeader } from './jobsheader'
export {
  colsFromCookie, parseColWidthSeed, parseJobFilters, resizeColWidths, toCatLabelList,
  toJobPlan, toNocDescList, toSearchParams,
} from './functions'
export type {
  ColWidthSeed, JobFact, JobFilters, JobPageDims, JobsIn, NocCategoryDoc, NocDescDoc, RelatedJobs, SessionUser,
} from './types'
