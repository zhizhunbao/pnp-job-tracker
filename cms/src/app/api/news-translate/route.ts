/**
 * POST /api/news-translate — 新闻正文懒翻译的壳。芯在 lib/llm/routes.ts（第十一抽屉）。
 *
 * @author Frank
 * @time 2026-08-23 09:40:00
 */

export { newsTranslateRoute as POST } from '@/lib/llm/server'
