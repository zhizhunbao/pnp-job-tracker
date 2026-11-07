/**
 * me 桶的子桶 jobs —— 「我的求职」一页(2026-11-07 自 myjobs 桶(连子桶 recommend)与 account 桶的五题弹框在新域重写):
 * 页签「今日推荐 / 我的收藏 / 我的投递」、三张表、进页先弹五题。行为、界面件、样式都住本子桶;
 * 父桶只拼「页标题 + 正文」。依赖只许父桶 → 子桶,子桶不取父桶与兄弟子桶;打开只读投递框的函数(子桶 apps 的 openAppView)
 * 由父桶注入(JobsBody 的 openApp)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
export { JobsBody } from './jobsbody'
