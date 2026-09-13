/**
 * employers 页面域的桶 —— /employers 雇主板(2026-09-13 批二:一个入口读雇主池,组 × 省切面;
 * 此前 designated / hiring 两个入口共用一块视图)、
 * /employers/compare 对比表,以及首页把脉页也在借的担保雇主卡片一族。
 * 2026-08-26 自 app/(frontend)/employers/ 整体迁入(compare 子目录拍平进域根)。
 * 2026-08-27 换装批整体重写:整页外框上交给 shell 桶的 Frame(页面门去拼顶栏/页脚),
 * 视图拆成筛选区 / 列表区 / 卡片流等小件,每一列的单元格各自成文件,取值与文案全部
 * 先洗成展示行再渲。域内小件(各 *Cell / DashText / TagText / 表卡分件)不出桶。
 * 2026-08-29 页面门清闸批:入口的 SEO 头也从这里出 —— /employers/compare 的死值
 * COMPARE_META、雇主板入口的 employersMetaOf(2026-09-13 自 designatedMetaOf / hiringMetaOf 合一;
 * 门里除框架定名导出外零函数零常量,内容一律来自桶)。
 * 对应 lib 域:lib/employers。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { Compare } from './compare'
export { COMPARE_META, COMPARE_MIN_ROWS } from './constants'
export { Employers } from './employers'
export {
  compareNamesOf, employersMetaOf, hasVerdictSignal, noDimsOf, sponsorEmployerColsOf,
  toSponsorCellRows,
} from './functions'
export { SponsorCard } from './sponsorcard'
export type { SponsorCellRow, SponsorKind } from './types'
