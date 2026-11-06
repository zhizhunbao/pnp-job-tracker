/**
 * start 域的服务端件:现查一份首页聚合并存进缓存(2026-11-05 自页面门搬来;只从 ./server 门经 homecore 用)。
 * 七条查询并发,公司简介等担保雇主名出来后只查这些家(交集下沉到 SQL;原先整表 2.6 万家读进来再筛,
 * 首页缓存每过期一次堆涨 50MB,是生产爆堆 502 的推手之一)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { SQL } from '@/lib/db'
import type { Db } from '@/lib/db'
import { loadSponsorEmployers } from '@/lib/employers/server'
import { loadTotalAndProof } from '@/lib/jobs/server'
import { employerVerdict } from '@/lib/ruling/server'
import { loadOccStats, loadProvExtra } from '@/lib/stats/server'
import { DRAWS_LIMIT } from './constants'
import {
  emptyOccRows, emptyProvExtra, emptyQueryResult, emptySponsorRows, homeCoreOf, nullProof, putHomeCache,
  sponsorNamesOf,
} from './functions'
import type { HomeStatsCore } from './types'

/**
 * 现查一份首页聚合并存进缓存。每条各自吞错给空值(该块不渲,绝不显示 0),整份永不抛。
 *
 * @param db 连接池。
 * @returns 那份聚合。
 */
export async function loadHomeCore(db: Db): Promise<HomeStatsCore> {
  const [proof, provExtra, sponsorRows, occRows, drawRes, pilotRes, newsRes] = await Promise.all([
    loadTotalAndProof(db).catch(nullProof),
    loadProvExtra(db).catch(emptyProvExtra),
    loadSponsorEmployers({ db, judge: employerVerdict }).catch(emptySponsorRows),
    loadOccStats(db).catch(emptyOccRows),
    db.query(SQL.PNP_DRAWS_RECENT).catch(emptyQueryResult),
    db.query(SQL.DESIGNATED_PILOT_NAMES).catch(emptyQueryResult),
    db.query(SQL.NEWS_RECENT_80).catch(emptyQueryResult),
  ])
  const briefRes = await db.query(SQL.COMPANY_BRIEFS, [sponsorNamesOf(sponsorRows)]).catch(emptyQueryResult)
  return putHomeCache(homeCoreOf({
    proof,
    provExtra,
    sponsorRows,
    occRows,
    drawRows: drawRes.rows,
    drawsLimit: DRAWS_LIMIT,
    pilotRows: pilotRes.rows,
    briefRows: briefRes.rows,
    newsRows: newsRes.rows,
  }))
}
