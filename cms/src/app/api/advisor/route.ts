/**
 * POST /api/advisor — 场景解读(初判/速读/字段解释/追问)的壳。芯在 lib/advisor/routes.ts
 * (第十一抽屉)。2026-08-23 切换:老链 streamChat 版(454 行)整删,回滚 = git revert
 * 本次提交;质量关报告 docs/evaluation/advisor评测-2026-08-23.md。
 * 老壳的 runtime='nodejs'/dynamic='force-dynamic' 一并退役:POST handler 本就不参与
 * 静态化,route handler 默认就是 nodejs 运行时,两行都是缺省值。
 *
 * @author Frank
 * @time 2026-08-23 22:40:00
 */

export { advisorRoute as POST } from '@/lib/advisor/server'
