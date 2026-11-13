/**
 * gate 桶的子桶 edu —— 档案表单「教育经历」几段的行为与它要的常量(父桶 hooks / functions / 教育经历一段的件 / 桶门经这里取)。
 * 2026-11-12 按「大于 1000 就拆子桶」(样张 apply/letter):gate 桶首个子桶。父桶 functions.ts 到 981 行贴线,按关注点切出
 * 教育经历几段这一族(起头、存档、改格加段删段、选项字、并简历);依赖只许父桶 → 子桶(经本目录 index.ts),子桶不取父桶任何东西,
 * 要用的常量各自抄、形状本桶自声明。教育经历题的两个 tsx(GateEdu / GateEduLine)仍住父桶(它们拼父桶的整机与样式)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */

export { EDU_AT_NONE } from './constants'
export {
  eduFormRowsOf, eduListOf, eduMajorsOf, eduMergedOf, eduPicksOf, eduStrsOf, eduWithMajorsOf, makeEduAdd, makeEduLabel,
  makeEduMajor, makeEduPick, makeEduRemove,
} from './functions'
