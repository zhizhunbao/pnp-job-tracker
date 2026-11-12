/**
 * tailor 的子桶 fix —— 针对一条要求补写一句时的纯运算(给模型看的字、把那一句加进草稿或求职信、读模型回的整数)。
 * 2026-11-11 按「大于 1000 就拆子桶」:tailor 的 functions.ts 过线,补写一句用到的纯运算切出来。
 * 依赖只许 tailor → 本子桶(经 index.ts);本子桶不取 tailor 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-12 02:00:00
 */

export { fixMsgOf, intOf, withLineOf, withSentenceOf, worksOf } from './functions'
