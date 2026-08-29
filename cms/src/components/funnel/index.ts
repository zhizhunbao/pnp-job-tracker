/**
 * funnel 页面域的桶 —— /funnel 转化漏斗内部看板(一块视图 + 两枚域内件)。
 * 2026-08-26 自 app/(frontend)/funnel/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-27 换装批整体重写成小写件形制:
 * 内联样式与那块 <style> 标签逐格迁 funnel.module.css、洗行与列组进 functions.ts、
 * 死值进 constants.ts、三段形状(库原始行 / 事实行 / 展示行)进 types.ts。
 * 同批壳件拼装归页面门(Frank「组装只许在 (frontend) 页面门里」)—— 整页外框 Frame、
 * 顶栏与页脚由 page.tsx 直接拼,Funnel 只出 Shell 轨往下的正文。
 * 尾行件 FunnelPayRow 与分组行件 FunnelPropLine 是域内件,只给 Funnel 用,不出桶。
 * 页面门要的三件也从这里出:两条查询的行构造器与整块看板的洗行。
 * 对应 lib 域:lib/funnel(白名单与三条链的转化率)。
 *
 * @author Frank
 * @time 2026-08-27 03:00:00
 */
export { ROLE_ADMIN } from './constants'
export { Funnel } from './funnel'
export { toFunnelBoard, toFunnelEventFact, toFunnelPayFact } from './functions'
export type { FunnelBoard, FunnelCellRow, FunnelEventFact, FunnelPayFact } from './types'
