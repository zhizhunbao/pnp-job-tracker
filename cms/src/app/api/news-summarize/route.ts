/**
 * POST /api/news-summarize — 新闻 AI 速读的壳。芯在 lib/llm/routes.ts（第十一抽屉）。
 *
 * @author Frank
 * @time 2026-08-23 09:40:00
 */

export { newsSummarizeRoute as POST } from '@/lib/llm/server'
