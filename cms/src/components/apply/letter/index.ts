/**
 * apply 桶的子桶 letter —— 投递框求职信页的行为与它要的常量(父桶 hooks / functions / 求职信页经这里取)。
 * 2026-10-10 Frank「大于 1000 就 拆 子桶」:apply 桶首个子桶。父桶 functions.ts 超 1000 行,按关注点切出求职信页这一族
 * (信的单选项、上传求职信抽字、按职位改写);依赖只许父桶 → 子桶(经本目录 index.ts),子桶不取父桶任何东西,
 * 要用的常量各自抄、形状本桶自声明。求职信页与对照框两个 tsx 仍住父桶(它们拼父桶的分区卡、单选行与样式)。
 *
 * @author Frank
 * @time 2026-10-10 18:00:00
 */

export { OPT_NONE, OPT_NONE_ITEM } from './constants'
export {
  draftOptsOf, firstPickOf, makeLetterChange, makeLetterPickOf, makeLetterRewrite, makeResumeRewrite,
  makeRwUse, uploadLetter,
} from './functions'
