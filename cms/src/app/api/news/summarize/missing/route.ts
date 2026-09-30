/**
 * POST /api/news/summarize/missing — 批量补新闻 AI 速读的壳(带钥匙,数据层 news 域每轮调)。芯在 lib/news/routes.ts。
 *
 * @author Frank
 * @time 2026-09-30 14:00:00
 */

export { newsSummarizeMissingRoute as POST } from '@/lib/news/server'
