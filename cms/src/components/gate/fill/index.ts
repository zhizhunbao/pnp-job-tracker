/**
 * gate 桶的子桶 fill —— 把档案里空着的格子自动填上:修改面板里的「从简历填写」、传简历后后台自己读简历填并存、
 * 投出后补想做的工作与现居省(父桶 hooks / functions 经这里取)。
 * 2026-11-13 Frank「别等一周啊 都做完」:父桶 functions.ts 贴 1000 行线,按「大于 1000 就拆子桶」(样张 apply/letter)切出;
 * 依赖只许父桶 → 子桶,子桶不取父桶也不取兄弟子桶 —— 工作经历、教育经历的并法与存取由父桶注进来(形状 FillFns)。
 *
 * @author Frank
 * @time 2026-11-13 21:00:00
 */

export { EV_APPLY_SENT, EV_UPLOADED, EV_UPLOADED_APPLY } from './constants'
export { makeResumeFill, runApplyAuto, runResumeAuto } from './functions'
export type { FillFns } from './types'
