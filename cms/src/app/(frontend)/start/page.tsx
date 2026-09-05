/**
 * E13-03 把脉首页(/start)的门 —— 2026-09-04 重构后:职业 / 雇主 / LMIA / 省份 / 城市 / 趋势六段
 * (设计:docs/design/把脉页重构-20260904.md;E13 原设计 docs/implementation/E13-把脉首页/00_总设计与口径.md)。
 * 本门只做 SSR 取数与拼装:判决区的证据数(proof)、省卡的 IRCC 体量与难度档、担保雇主三分表、
 * 职业统计标量、趋势段的逐日在招量。
 * 红线:数字全部来自库内聚合查询,不写死;单项查询失败 → 该行 / 该块整条不渲染,
 * 绝不显示 0(每条查询各自兜空,一张表缺只丢它自己那块)。
 * SSR 瘦身照旧:职业大表(occ ~3400 行,含 E13-03 派生列)不进 HTML,
 * 由 Pulse 挂载后拉 /api/stats/market;担保雇主全量同理走 /api/employers/sponsors。
 * 2026-09-04 撤:政策动态查询(段撤成一行链接)、职业筛两张字典(筛选下拉撤);抽选表 Frank 走查要求保留,查询回来。
 * 2026-08-28 换装批:聚合的组装、进程内缓存、预选省全部下沉 components/start 的 functions
 * (方案 A:连接池与 payload 在这里取好注进去,那个桶一个 `/server` 门都不 import);
 * 壳件(整页外框 Frame / 顶栏 / 页脚)拼装收回本门(Frank「组装只许在 (frontend) 页面门里」,样张 companies)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Frame } from '@/components/shell'
import {
  DRAWS_LIMIT, Pulse, START_META, cachedHomeOf, emptyCityRows, emptyDailyRows, emptyOccRows, emptyProvExtra,
  emptyQueryResult,
  emptySponsorRows, emptyText, homeCoreOf, homeStatsOf, nullProof, nullUser, provPresetOf, putHomeCache,
} from '@/components/start'
import { SQL } from '@/lib/db'
import { dbOf } from '@/lib/db/server'
import { buildSponsorBoards, loadSponsorEmployers } from '@/lib/employers/server'
import { checkedAt, loadTotalAndProof } from '@/lib/jobs/server'
import { getUser } from '@/lib/quota/server'
import { employerVerdict } from '@/lib/ruling/server'
import { loadCityStats, loadDailySeries, loadOccStats, loadProvExtra } from '@/lib/stats/server'

export const dynamic = 'force-dynamic'

export const metadata = START_META

/**
 * 把脉首页的门:进程内缓存没命中就八条查询并发取数 → 纯函数组装 → 拼大写组件。
 * 缓存口径与旧版一字未改:10 分钟内给同一份,过期现查再存;抓取时刻与预选省是逐用户 /
 * 逐请求的,不进缓存(前者 lib/jobs 自带 30s 缓存,后者按会话算)。
 *
 * @returns 整页。
 */
export default async function PulsePage() {
  const payload = await getPayload({ config: await config })
  const db = dbOf(payload)
  let core = cachedHomeOf()
  if (core == null) {
    const [proof, provExtra, sponsorRows, occRows, cityRows, dailyRows, drawRes, pilotRes, briefRes] = await Promise.all([
      loadTotalAndProof(db).catch(nullProof),
      loadProvExtra(db).catch(emptyProvExtra),
      loadSponsorEmployers({ db, judge: employerVerdict }).catch(emptySponsorRows),
      loadOccStats(db).catch(emptyOccRows),
      loadCityStats(db).catch(emptyCityRows),
      loadDailySeries(db).catch(emptyDailyRows),
      db.query(SQL.PNP_DRAWS_RECENT).catch(emptyQueryResult),
      db.query(SQL.DESIGNATED_PILOT_NAMES).catch(emptyQueryResult),
      db.query(SQL.COMPANY_BRIEFS).catch(emptyQueryResult),
    ])
    core = putHomeCache(homeCoreOf({
      proof,
      provExtra,
      sponsorRows,
      boards: buildSponsorBoards(sponsorRows),
      occRows,
      cityRows,
      dailyRows,
      drawRows: drawRes.rows,
      drawsLimit: DRAWS_LIMIT,
      pilotRows: pilotRes.rows,
      briefRows: briefRes.rows,
    }))
  }
  const user = await getUser(await headers()).catch(nullUser)
  const upd = await checkedAt(db).catch(emptyText)
  return (
    <Frame>
      <Header />
      <Pulse stats={homeStatsOf({ core, provPreset: provPresetOf({ user }), checkedAt: upd })} />
      <Footer />
    </Frame>
  )
}
