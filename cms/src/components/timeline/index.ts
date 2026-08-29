/**
 * timeline 页面域的桶 —— /timeline 政策时间线(一块视图)。
 * 2026-08-26 自 app/(frontend)/timeline/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-28 换装批整体重写成小写件形制:
 * 排版拆成域内小件、状态收进 hooks.ts、内联样式逐格迁 timeline.module.css、
 * 死值进 constants.ts、形状进 types.ts。同批照 companies 样张收一刀:
 * 壳件(整页外框 / 顶栏 / 页脚)拼装归页面门,Timeline 只出 Shell 轨往下的视图。
 * 2026-08-29 页面门清闸批:本页的 SEO 头收成 TIMELINE_META 从这里出 —— 原先那个无参、
 * 返回死值的 generateMetadata 改成常量形(门里除框架定名导出外零函数零常量)。
 * 对应 lib 域:lib/plan(fetchTimeline 一族,抽选节律与三路事件)。
 *
 * @author Frank
 * @time 2026-08-28 12:43:06
 */
export { TIMELINE_META } from './constants'
export { Timeline } from './timeline'
