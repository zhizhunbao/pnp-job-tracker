/**
 * review 的子桶 cv —— 修改简历右侧栏的草稿运算(换一段工作的要点、拼一段工作的抬头)。
 * 2026-11-10 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 过线,切出修改简历右侧栏用的纯函数。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-10 23:00:00
 */

export { cvHeadOf, withDescOf } from './functions'
