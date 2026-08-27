/**
 * quiz 页面域的桶 —— 三问答题的公共件:答案读写与落档(EntryQuiz)、
 * 职业/省份两个挑选器、以及全站答题卡共用的 UI 原件(标题、选项、导航、进度)。
 * 借它的有 jobs(职位板落档与省分卡)、plan(决策页答题主干)、start(行情卡砍职业名)。
 * 2026-08-26 自 app/(frontend)/quiz/ 整体迁入 —— 那个目录本来就没有 page.tsx,搬完随之删除。
 * 对应 lib 域:lib/quiz。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { quizToProfile, readQuiz, shortOcc } from './EntryQuiz'
export { OccPicker } from './OccPicker'
export { ProvincePicker } from './ProvincePicker'
export { QuizChecks, QuizChoices, QuizNav, QuizStyle, QuizSub, QuizTitle, pickL } from './QuizUI'
export type { L } from './QuizUI'
