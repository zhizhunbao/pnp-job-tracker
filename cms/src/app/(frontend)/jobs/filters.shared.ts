// URL 查询参数 ↔ 筛选键 的唯一映射:**服务端和客户端都要用**,所以单独放这个不带 hook 的文件
// (同 colWidths.shared.ts 的理由:page.tsx 是 Server Component,一 import 带 hook 的模块就报错)。
//
// 2026-08-03 Frank「之前选了条件,刷新页面会先抖一下选全部,然后才显示筛选后的结果」的根治:
// 原来只有客户端读 URL —— SSR 一律渲「未筛选的最近 50 行 + 下拉全是全部」,浏览器先把这一帧画出来,
// 等 JS 水合才把筛选塞进 state(下拉这才变),再打一次 /api/jobs 才换行,于是抖两段。
// 现在 page.tsx 在 SSR 就按同一套参数查库、并把筛选当作初值传给 Jobs → 首帧即终态,水合零差异。
//
// 参数名沿用既有深链(q/prov/broad/mid/fine 三方在用,不能改),新增的取短名。
// ⚠️ 新增筛选键四处同步:本表 + buildJobsWhere(lib/jobsSql)+ 前端 state(Jobs.fState)
//   + /api/jobs 的 FILTER_KEYS。

import { PROV_NAMES } from '@/lib/location'
/** 省码 → 省全名。真值住 lib/location(省名是地点域的事,那儿的 provName/parseLoc 也吃它);
 *  筛选值一律用全名(fProv/深链/保存的筛选都依赖它),故这里原样再导出给筛选侧,调用点不必改。 */
export { PROV_NAMES }

/** URL 短名 → 筛选键(筛选键 = 前端 state 名 = buildJobsWhere 的键,三者同名,不必再各翻译一遍) */
export const URL_TO_FILTER: Record<string, string> = {
  // noc:逗号分隔的 NOC 码多值(2026-08-16 Frank「查岗位应该带着条件查」「要支持多个职位类别」)——
  // 先前从初评表跳过来是把 NOC 码塞进关键词框(q=72310):页面看着像在搜一串数字,且只带得动一个职业。
  noc: 'fNoc',
  q: 'q', prov: 'fProv', broad: 'fBroad', mid: 'fMid', fine: 'fFine', city: 'fCity',
  dist: 'fDistrict', country: 'fCountry', teer: 'fTeer', src: 'fSource', acc: 'fAcc',
  pnp: 'fPnp', aip: 'fAip', pilot: 'fPilot', st: 'fStatus', org: 'fOrigin', score: 'fScore', sal: 'fSal',
  vs: 'fVs', emp: 'fEmp', elig: 'fElig',
}
/** directOnly 是布尔,URL 上是 direct=1,不走上表 */
export const DIRECT_URL_KEY = 'direct'

/** 筛选对象:键=筛选键,值=非空字符串;directOnly 为 true 时才在。全默认 = 空对象(没参数就是干净板)。 */
export type JobFilters = Record<string, string | boolean>

/** URL 参数 → 筛选对象。省接受两位码或全名(深链两种都在用)。 */
export function parseJobFilters(sp: URLSearchParams): JobFilters {
  const f: JobFilters = {}
  for (const [urlKey, fKey] of Object.entries(URL_TO_FILTER)) {
    const raw = (sp.get(urlKey) || '').trim()
    if (!raw) continue
    f[fKey] = urlKey === 'prov' ? PROV_NAMES[raw.toUpperCase()] || raw : raw
  }
  if (sp.get(DIRECT_URL_KEY) === '1') f.directOnly = true
  return f
}

/** Next 的 searchParams 对象 → URLSearchParams(服务端也走 parseJobFilters 一个入口,别自己拆) */
export function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(sp || {})) {
    if (typeof v === 'string') u.set(k, v)
    else if (Array.isArray(v) && v.length) u.set(k, v[0])   // 同名参数重复出现:取第一个,与 sp.get 同语义
  }
  return u
}

/** 筛选签名:客户端拿它比对「SSR 是不是已经按这套筛选查过了」,一致就跳过首次重复请求 */
export function filterSig(f: JobFilters): string {
  return Object.keys(f).sort().map((k) => `${k}=${String(f[k])}`).join('&')
}
