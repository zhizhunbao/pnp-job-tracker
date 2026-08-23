/**
 * 雇主域的**服务端**门:四条线的取数与组装,依赖链上有 `pool`/`Db`,浏览器跑不了。
 * 门里只有转发(闸 door-forward-only);连接池由调用方注进来(拍板③:db 只在边缘,
 * 路由/页面自己 `getDb()` 再传 —— 本域不 import payload)。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

export { EMP_PAGE_SIZE, EMP_SSR_ROWS, SE_SSR_ROWS } from './constants'
export type { CompanyResearch, SponsorBoards } from './types'
export {
  applyEmployerFilters, applySponsorFilters, buildSponsorBoards, companyRow, compareEmployers,
  employersBoardProps, fetchOccupations, fetchSponsorEmployers, investigateCompany, loadEmployerPage,
  normalizeEmployerFilters, resetEmployersCache,
} from './functions'
export { employersExportRoute, employersInfoRoute, employersRoute, employersSponsorsRoute } from './routes'
