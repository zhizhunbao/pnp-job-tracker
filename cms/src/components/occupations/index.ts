/**
 * occupations 页面域的桶 —— /occupations 紧缺职业清单(一块视图)。
 * 2026-08-26 自 app/(frontend)/occupations/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-28 换装批整体重写成小写件形制:
 * 内联样式逐格迁 occupations.module.css、分组与派生进 functions.ts、死值进 constants.ts、
 * 契约进 types.ts,省小节 / 通道表 / 三个单元格各自成件。壳件(整页外框 / 顶栏 / 页脚)
 * 拼装归页面门(样张 companies),Occupations 只出正文,域内件不出桶。
 * 2026-08-28 拆域批曾迁入 OccReportCard.tsx,同批查实全仓零代码消费者(入口 2026-08-06
 * Frank「没什么用可以删了」已摘)—— 带证退役删除。(原注:职位详情页的职业报告入口,
 * 原样搬,形制照旧是旧形,归换装批收拾)。
 * 2026-08-29 页面门清闸批:本页的 SEO 头收成 OCC_META 从这里出 —— 原先那个无参、
 * 返回死值的 generateMetadata 改成常量形(门里除框架定名导出外零函数零常量)。
 * 对应 lib 域:lib/employers(loadOccupations)。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */
export { OCC_META } from './constants'
export { Occupations } from './occupations'
export type { OccupationRow, OccupationsIn } from './types'
