/**
 * PATCH /api/queue/resume —— 就地换「今日待投」里那一岗附的简历(2026-10-08 Frank「这两个应该都是可以弹框,并且可以替换吧」)。
 * 芯在 lib/queue/routes.ts。
 *
 * @author Frank
 * @time 2026-10-08 23:50:00
 */

export { queueResumeRoute as PATCH } from '@/lib/queue/server'
