/**
 * GET /api/majors — 访客四题第 2 题「读的什么专业」取数口的壳(热门 / 搜索 / 按码)。芯在 lib/majors/routes.ts(第十一抽屉)。
 * 2026-10-05 芯里加了选择器两支(?cats=1 大类清单、?cat=<键> 一个大类的树),壳不变。
 *
 * @author Frank
 * @time 2026-10-04 02:14:05
 */

export { majorsRoute as GET } from '@/lib/majors/server'
