/**
 * review 的子桶 pick —— 点一条要求、点一块高亮时的选中与取消。
 * 2026-11-11 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 过线,切出选中这一族。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-11 23:30:00
 */

export { hlDataOf, makeHlPick, makePickActive } from './functions'
