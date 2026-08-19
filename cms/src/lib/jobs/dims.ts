// 匹配用维度加载(pnp/ee 清单)进程内缓存 1h —— advisor 档案注入与 alerts run 共用(E5-00/E5-03)。
//
// 🔴 2026-08-18 改走 db 层(Frank:「这个完全没走我的 database 和 sql」)。此前它自己 `getPayload()`
//    再 `payload.find({collection})` —— **绕过 lib/db 的两件事**:取池不走 `getDb()`、查询不在 `db/sql.ts`。
//    绕过的代价不是不整齐,是**口径分叉**:职位板那条路(`/api/jobs`)一直用 `pnpOnly` 滤掉 AIP 行,
//    这条路没滤,于是同一个 `match()` 在两处吃到不同的清单。现在滤在 SQL 的 WHERE 里(见 db/sql.ts 那段注释),
//    两条路口径合一。
//
// 为什么用 `getDb()` 而不是让调用方传池:这个函数是**自带缓存的单件**(advisor / alerts 各调各的,
// 手里不一定有池);`getDb()` 正是为这种「手里没有 payload 实例」的调用点准备的(它按 config 记忆化,不多开连接)。
import { getDb } from '../db/database'
import * as SQL from '../db/sql'
import { iso, num } from './queries'
import type { MatchDims } from './match'

let cache: { at: number; dims: MatchDims } | null = null

export async function loadMatchDims(): Promise<MatchDims> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.dims
  const db = await getDb()
  const [pnp, ee] = await Promise.all([
    db.query(SQL.MATCH_PNP_OCCUPATIONS),
    db.query(SQL.MATCH_EE_CATEGORIES),
  ])
  // 列名是库里的 snake_case(Payload 的 Local API 给的是 camelCase —— 换路必须跟着换,
  // 否则 drawCrs/drawDate 会静默变成 undefined,而 match() 只会少给一条理由,不会报错)。
  const dims: MatchDims = {
    pnpOccupations: pnp.rows.map((r: any) => ({
      province: r.province, label: r.label, type: r.type, noc: r.noc, url: r.url, fetched: iso(r.fetched),
    })),
    eeCategories: ee.rows.map((r: any) => ({
      category: r.category, label: r.label, noc: r.noc,
      drawCrs: num(r.draw_crs), drawDate: iso(r.draw_date), url: r.url, fetched: iso(r.fetched),
    })),
  }
  cache = { at: Date.now(), dims }
  return dims
}
