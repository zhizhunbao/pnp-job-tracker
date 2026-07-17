import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import JobsTable, { BANNER_COOKIE, TZ_PROV } from './JobsTable'
import { COLS_COOKIE } from './i18n'
import { getUser, isPro } from '@/lib/entitlement'
import { FREE_MATCH_JOBS_PER_DAY } from '@/lib/plan'
import { normalizeProfile, hasProfile } from '@/lib/match'
import { fetchJobRows } from '@/lib/jobsList'

// 首屏行数(2026-07-05 用户拍板):SSR 只带最近 N 行秒开,全量 /api/jobs-data 后台拉(拉完筛选/搜索照旧)
const FIRST_SCREEN_ROWS = 50

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Canadian jobs with immigration signals — PNP · EE · wages | Offer2PR',
  description: 'Daily-updated job board across all 10 provinces: PNP named streams, EE categories, wages vs ESDC median, profile matching. 全加拿大日更职位板:省提名通道/EE 类别/工资对比/档案匹配。',
}

export default async function JobsPage() {
  const payload = await getPayload({ config: await config })

  // 分层(E3-05):Pro 列(工资中位对比三件套 + 匹配)在 SELECT 源头裁掉 —— 免费用户的数据不进浏览器
  const user = await getUser(await headers())
  const pro = isPro(user)
  const profile = normalizeProfile((user as any)?.profile)
  const profileOk = hasProfile(profile)

  // 列表查询在 lib/jobsList.ts(与 /api/jobs-data 共用);首屏只取 FIRST_SCREEN_ROWS 行 + 总数
  const pool = (payload.db as any).pool

  // 维度表小,继续走 payload.find
  const [provDocs, cityDocs, distDocs, nocDocs, srcDocs, expDocs, pnpDocs, pnpDrawDocs, eeDocs, aipDocs, nocDescDocs, fieldSrcDocs] = await Promise.all([
    payload.find({ collection: 'provinces', limit: 100, depth: 0, sort: 'name' }),
    payload.find({ collection: 'cities', limit: 5000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'districts', limit: 1000, depth: 0, sort: 'name' }),
    payload.find({ collection: 'noc-categories', limit: 1000, depth: 0 }),
    payload.find({ collection: 'sources', limit: 200, depth: 0, sort: 'name' }),
    payload.find({ collection: 'experience-levels', limit: 50, depth: 0 }),
    payload.find({ collection: 'pnp-occupations', limit: 5000, depth: 0 }),
    payload.find({ collection: 'pnp-draws', limit: 200, depth: 0, sort: '-drawDate' }),
    payload.find({ collection: 'ee-categories', limit: 2000, depth: 0 }),
    payload.find({ collection: 'designated-employers', limit: 5000, depth: 0 }),
    payload.find({ collection: 'noc-descriptions', limit: 2000, depth: 0 }),
    payload.find({ collection: 'field-sources', limit: 200, depth: 0 }),
  ])
  const dims = {
    provinces: provDocs.docs.map((p: any) => ({ code: p.code, name: p.name })),
    cities: cityDocs.docs.map((c: any) => ({ name: c.name, province: c.province })),
    districts: distDocs.docs.map((d: any) => ({ name: d.name, city: d.city, province: d.province })),
    nocCategories: nocDocs.docs.map((c: any) => ({ broad: c.broad, mid: c.mid, fine: c.fine, teer: typeof c.teer === 'number' ? c.teer : null })),
    sources: srcDocs.docs.map((s: any) => ({ name: s.name })),
    experienceLevels: expDocs.docs.map((e: any) => ({ name: e.name })),
    pnpOccupations: pnpDocs.docs.map((r: any) => ({ province: r.province, stream: r.stream, label: r.label, type: r.type, noc: r.noc, name: r.name, gtaRestricted: !!r.gtaRestricted, url: r.url, fetched: r.fetched })),
    pnpDraws: pnpDrawDocs.docs.map((r: any) => ({ province: r.province, kind: r.kind, drawDate: r.drawDate ?? '', stream: r.stream ?? '', score: typeof r.score === 'number' ? r.score : null, scale: r.scale ?? '', invitations: typeof r.invitations === 'number' ? r.invitations : null, note: r.note ?? '', label: r.label ?? '', url: r.url ?? '', fetched: r.fetched ?? '' })),
    eeCategories: eeDocs.docs.map((r: any) => ({ category: r.category, label: r.label, noc: r.noc, teer: typeof r.teer === 'number' ? r.teer : null, title: r.title, url: r.url, fetched: r.fetched, drawCrs: typeof r.drawCrs === 'number' ? r.drawCrs : null, drawDate: r.drawDate ?? '', drawSize: typeof r.drawSize === 'number' ? r.drawSize : null })),
    designatedEmployers: aipDocs.docs.map((r: any) => ({ name: r.name, province: r.province, location: r.location, isTech: !!r.isTech })),
    nocDescriptions: nocDescDocs.docs.map((r: any) => ({ noc: r.noc, title: r.title ?? '', duties: r.duties ?? '', requirements: r.requirements ?? '', fetched: r.fetched ?? '' })),
    fieldSources: fieldSrcDocs.docs.map((r: any) => ({ field: r.field ?? '', kind: r.kind ?? '', publisher: r.publisher ?? '', url: r.url ?? '', title: r.title ?? '', description: r.description ?? '', status: r.status ?? '', fetched: r.fetched ?? '', note: r.note ?? '' })),
  }

  // 首屏 50 行 + 总数(全量由客户端后台拉 /api/jobs-data,同一查询层同一排序,换入无跳变)
  const matchDims = { pnpOccupations: dims.pnpOccupations, eeCategories: dims.eeCategories }
  const [{ jobs, updatedAt }, cntRes] = await Promise.all([
    fetchJobRows(pool, { pro, profile, profileOk, matchDims, limit: FIRST_SCREEN_ROWS }),
    // 差异化证言数字(第 5 轮 #14):省提名清单命中岗 + 有外劳记录雇主数 —— 首屏 3 秒讲清与聚合站的区别
    pool.query(`SELECT count(*)::int AS n,
      count(*) FILTER (WHERE status = 'open' AND pnp_stream IS NOT NULL AND pnp_stream <> '')::int AS named,
      (SELECT count(*)::int FROM companies WHERE lmia_positions > 0) AS lmia
      FROM jobs`),
  ])
  const totalCount: number = cntRes.rows[0]?.n ?? jobs.length
  const proof = { named: cntRes.rows[0]?.named ?? 0, lmia: cntRes.rows[0]?.lmia ?? 0 }

  // 列偏好从 cookie 读(浏览器/服务器都能读)→ SSR 直接渲对的列,零闪烁。客户端选列时写这个 cookie。
  let initialCols: string[] | undefined
  let initialBanner = true
  try {
    const jar = await cookies()
    const raw = jar.get(COLS_COOKIE)?.value
    if (raw) { const arr = JSON.parse(decodeURIComponent(raw)); if (Array.isArray(arr)) initialCols = arr.filter((x) => typeof x === 'string') }
    if (jar.get(BANNER_COOKIE)?.value) initialBanner = false  // 关过横幅 → SSR 首帧即不渲(不再等水合后才弹)
  } catch { /* 无 cookie/解析失败 → 用默认列 */ }

  // plan(E3-05/E5-00):分层态与档案传给前端 —— 展示引导用;gate 本身在服务端(上方 SELECT/匹配范围)已生效
  const plan = {
    isPro: pro,
    loggedIn: !!user,
    profileOk,
    profile: profileOk ? profile : null,   // 本人档案(弹框端重算依据链用)
    freeMatchCap: FREE_MATCH_JOBS_PER_DAY,
  }
  // 推荐横幅槽位预判(2026-07-17 用户「刷新怎么后弹出来」):画像在 localStorage,SSR 画不出横幅,
  // 水合后插入会把内容整体下推(CLS)。内联脚本在首帧前同步预判「会出横幅」→ <html> 挂 recslot 类,
  // CSS 先把 .recSlot 那一行高度占好,横幅水合后原位填入;水合后 JobsTable 按真实显隐纠正该类。
  // 预判口径镜像横幅逻辑(当日关闭/ev≥5 主导项/geo 时区),近似即可——错了只是短暂多/少一条空带。
  const recSlotScript = `try{var d=new Date().toLocaleDateString('en-CA');
if(localStorage.getItem('jobsPrefHide')!==d){var p=JSON.parse(localStorage.getItem('jobsPref1')||'{}');var s=false;
if((p.ev||0)>=5){var has=function(m){for(var k in (m||{}))if(m[k]&&(m[k].w||m[k])>=3)return true;return false};s=has(p.combo)}
else{s=!!(${JSON.stringify(TZ_PROV)})[Intl.DateTimeFormat().resolvedOptions().timeZone]}
if(s)document.documentElement.classList.add('recslot')}}catch(e){}`
  return <>
    <script dangerouslySetInnerHTML={{ __html: recSlotScript }} />
    <JobsTable jobs={jobs} updatedAt={updatedAt} dims={dims} initialCols={initialCols} plan={plan}
      initialBanner={initialBanner} totalCount={totalCount} proof={proof} deferFull />
  </>
}
