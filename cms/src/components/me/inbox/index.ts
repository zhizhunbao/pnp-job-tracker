/**
 * me 桶的子桶 inbox —— 收件箱一页(2026-11-07 自 inbox 桶在新域重写)。行为、界面件、样式都住本子桶;
 * 父桶只拼「页标题 + 右边的转发开关 + 正文」。依赖只许父桶 → 子桶,子桶不取父桶;
 * 打开投递记录框的函数由父桶注入(useInbox 的 openApp)。
 *
 * @author Frank
 * @time 2026-11-07 16:30:00
 */
export { useInbox } from './hooks'
export { InboxBody } from './inboxbody'
export { InboxFwd } from './inboxfwd'
