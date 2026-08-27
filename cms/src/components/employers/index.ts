/**
 * employers 页面域的桶 —— /employers 雇主板(designated / hiring 两个入口共用一块视图)、
 * /employers/compare 对照表,以及首页把脉也在借的担保雇主卡片一族。
 * 2026-08-26 自 app/(frontend)/employers/ 整体迁入(compare 子目录拍平进域根)。
 * 对应 lib 域:lib/employers。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { Compare } from './Compare'
export { Employers } from './Employers'
export { SponsorCard, hasVerdictSignal, sponsorEmployerCols } from './Sponsors'
export type { SponsorKind } from './Sponsors'
