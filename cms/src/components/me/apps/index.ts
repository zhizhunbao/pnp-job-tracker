/**
 * me 桶的子桶 apps —— 一次投递的记录:只读投递框(宿主 AppViewHost 认地址栏 `?app=`、开框 openAppView)
 * (2026-11-07 自 myjobs 桶的 appview / 子桶 thread 在新域重写)。
 * 子桶 jobs 的 functions 逼近 1000 行闸,按关注点切出这一族(「我的求职」三张表 vs 一次投递的往来);
 * 依赖只许父桶 → 子桶,子桶不取父桶与兄弟子桶 —— jobs 要开框时由父桶把 openAppView 注进去。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
export { AppViewHost } from './appviewhost'
export { openAppView } from './functions'
