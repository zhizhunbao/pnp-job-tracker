/**
 * quiz 页面域的桶 —— 三问答题的公共件:答案读写与落档、职业/省份两个挑选器、
 * 以及全站答题卡共用的 UI 原件(标题、小注、选项、导航、样式注入)。
 * 借它的有 jobs(职位板落档与省分卡)、plan(决策页答题主干)、start(行情卡砍职业名)。
 * 2026-08-26 自 app/(frontend)/quiz/ 整体迁入 —— 那个目录本来就没有 page.tsx,搬完随之删除。
 * 2026-08-28 换装批整体重写成小写件形制:答案层与派生下沉 functions.ts、十二格状态收进
 * hooks.ts、死值与两段全局样式进 constants.ts、内联样式迁 quiz.module.css、
 * 排版拆成 16 个小件一件一文件。**对外这张表一个名字都没变**(消费者八个文件一个未碰)。
 * 🔴 桶不带 `'use client'`:各件自己标,类型与函数两侧都能取。
 * 对应 lib 域:lib/quiz。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { OccPicker } from './occpicker'
export { ProvincePicker } from './provincepicker'
export { QuizChecks } from './quizchecks'
export { QuizChoices } from './quizchoices'
export { QuizNav } from './quiznav'
export { QuizStyle } from './quizstyle'
export { QuizSub } from './quizsub'
export { QuizTitle } from './quiztitle'
export { pickL, quizToProfile, readQuiz, shortOcc } from './functions'
export type { L } from './types'
