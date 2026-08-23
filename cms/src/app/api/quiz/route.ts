/**
 * GET /api/quiz — 入口三问只读分发器的壳。芯在 lib/quiz/routes.ts(第十一抽屉)。
 *
 * @author Frank
 * @time 2026-08-23 04:30:00
 */

export { quizRoute as GET } from '@/lib/quiz/server'
