/**
 * me 桶的子桶 profile —— 我的档案一页(2026-11-07 自 account 桶的 Profile / MyStreams 在新域重写)。行为、界面件、样式都住本子桶;
 * 父桶只拼「页标题 + 右边的「修改」+ 正文」。依赖只许父桶 → 子桶,子桶不取父桶。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
export { useProfile } from './hooks'
export { ProfileActs } from './profileacts'
export { ProfileBody } from './profilebody'
