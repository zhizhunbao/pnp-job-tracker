/**
 * employers 页面域的桶 —— /employers 雇主板(designated / hiring 两个入口共用一块视图)、
 * /employers/compare 对比表,以及首页把脉页也在借的担保雇主卡片一族。
 * 2026-08-26 自 app/(frontend)/employers/ 整体迁入(compare 子目录拍平进域根)。
 * 2026-08-27 换装批整体重写:整页外框上交给 shell 桶的 Frame(页面门去拼顶栏/页脚),
 * 视图拆成筛选区 / 列表区 / 卡片流等小件,每一列的单元格各自成文件,取值与文案全部
 * 先洗成展示行再渲。域内小件(各 *Cell / DashText / TagText / 表卡分件)不出桶。
 * 对应 lib 域:lib/employers。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { Compare } from './compare'
export { Employers } from './employers'
export { hasVerdictSignal, sponsorEmployerColsOf, toSponsorCellRows } from './functions'
export { SponsorCard } from './sponsorcard'
export type { SponsorCellRow, SponsorKind } from './types'
