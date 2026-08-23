/**
 * /api/quiz/answers — 答案档存取的壳。芯在 lib/quiz/routes.ts(第十一抽屉)。
 * POST 是 PUT 的 beacon 别名(sendBeacon 只能 POST,送的和 PUT 一模一样)。
 *
 * @author Frank
 * @time 2026-08-23 04:30:00
 */

export { quizAnswersGetRoute as GET, quizAnswersPutRoute as PUT, quizAnswersPutRoute as POST } from '@/lib/quiz/server'
