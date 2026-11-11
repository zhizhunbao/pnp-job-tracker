/**
 * alerts 桶的子桶 body —— 信的正文:四种提醒信与确认信的 HTML 版和纯文本版(父桶的编排与推送设置经这里取)。
 * 2026-11-11 邮件改版收尾:父桶 functions.ts 加上纯文本版后超 1000 行,照 apply/letter、pathways/fit 的形按关注点切出
 *「这封信长什么样」这一族(外壳、职位块、各封信的拼装);「发给谁、什么时候发、退订与确认」留父桶。
 * 依赖只许父桶 → 子桶(经本目录 index.ts),子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-11-11 03:00:00
 */

export {
  confirmMailHtml, confirmMailText, dailyHtml, dailyText, emailHtml, emailText, weeklyHtml, weeklyProfileHtml, weeklyProfileText,
  weeklyText,
} from './functions'
