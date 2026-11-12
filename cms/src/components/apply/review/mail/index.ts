/**
 * review 的子桶 mail —— 存本人改过的邮件正文(2026-11-11 Frank「应该是用户可以编辑吧」)。
 * 2026-11-11 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 贴线,存邮件正文这一件切出来。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-12 01:00:00
 */

export { saveMailEdit } from './functions'
