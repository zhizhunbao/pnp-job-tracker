/**
 * 答题域的 HTTP 边缘件（第十一抽屉）：热门职业清单的 SWR 缓存。
 * 它不是 HTTP 芯本体（quiz 路由未瘦身），但注释原话就是「它本来就是 quiz route 的缓存」——
 * 借别域 server 门取数的特权只在本抽屉，所以 2026-08-23 从 functions 迁来（边界闸②开张存量清零）。
 * instrumentation 预热与请求路径写同一份状态（CACHE.top）。
 *
 * @author Frank
 * @time 2026-08-19 02:12:57
 */
import { fetchTopNocs } from '../jobs/server'
import type { Db } from '../db'
import { TTL } from './constants'
import { CACHE } from './variables'
import type { DropFn, FirstStoreFn, StoreFn, TopOut, TopRows, UnflagFn } from './types'

/**
 * 热门职业清单,SWR:命中(含过期)立即返回;过期后台刷。只有整个进程生涯的第一请求真等查询
 * (判定合一批3 前置。为什么在本域:route 的模块级 Map 只有 route 自己够得着,instrumentation
 * 预热填不进去 —— 冷启动后的第一位访客实测吃 8.4s(08-10 生产探针),预热必须和请求路径写
 * 同一份缓存)。
 *
 * @param pool 能查的连接(池由调用方注进来)。
 * @param n 清单条数。
 * @returns 热门职业清单(可能是过期缓存,后台刷新中)。
 */
// eslint-disable-next-line local/one-parameter -- 既有门面:route 与 instrumentation 两个调用点的形态(连接 + 条数)定死在此
// eslint-disable-next-line local/routes-shape -- SWR 边缘缓存件（非 HTTP 芯）：借 server 特权仅此；quiz 路由瘦身批并入 quizRoute
export async function getTopNocsCached(pool: Db, n: number): TopOut {
  const hit = CACHE.top.get(n)
  if (hit != null) {
    if (Date.now() - hit.at >= TTL && hit.refreshing === false) {
      hit.refreshing = true
      fetchTopNocs({ db: pool, limit: n }).then(makeStore(n)).catch(makeUnflag(n))
    }
    return hit.rows
  }
  const inFlight = CACHE.topPending.get(n)
  if (inFlight != null) {
    return inFlight
  }
  const task = fetchTopNocs({ db: pool, limit: n }).then(makeFirstStore(n)).finally(makeDrop(n))
  CACHE.topPending.set(n, task)
  return task
}

/**
 * 后台刷成功的落格(then 传具名函数;闭包住条数)。
 *
 * @param n 条数。
 * @returns 落格函数。
 */
// eslint-disable-next-line local/routes-shape -- SWR 边缘缓存件（非 HTTP 芯）：借 server 特权仅此；quiz 路由瘦身批并入 quizRoute
function makeStore(n: number): StoreFn {
  return function store(rows: TopRows): void {
    CACHE.top.set(n, { at: Date.now(), rows: rows, refreshing: false })
  }
}

/**
 * 后台刷失败的收尾:旧值继续顶,下次再试(闭包住条数)。
 *
 * @param n 条数。
 * @returns 收尾函数。
 */
// eslint-disable-next-line local/routes-shape -- SWR 边缘缓存件（非 HTTP 芯）：借 server 特权仅此；quiz 路由瘦身批并入 quizRoute
function makeUnflag(n: number): UnflagFn {
  return function unflag(_e: Error): void {
    const hit = CACHE.top.get(n)
    if (hit != null) {
      hit.refreshing = false
    }
  }
}

/**
 * 首查成功的落格 + 透传(闭包住条数)。
 *
 * @param n 条数。
 * @returns 落格函数。
 */
// eslint-disable-next-line local/routes-shape -- SWR 边缘缓存件（非 HTTP 芯）：借 server 特权仅此；quiz 路由瘦身批并入 quizRoute
function makeFirstStore(n: number): FirstStoreFn {
  return function firstStore(rows: TopRows): TopRows {
    CACHE.top.set(n, { at: Date.now(), rows: rows, refreshing: false })
    return rows
  }
}

/**
 * 首查收尾:清在途标记(成败都清;闭包住条数)。
 *
 * @param n 条数。
 * @returns 收尾函数。
 */
// eslint-disable-next-line local/routes-shape -- SWR 边缘缓存件（非 HTTP 芯）：借 server 特权仅此；quiz 路由瘦身批并入 quizRoute
function makeDrop(n: number): DropFn {
  return function drop(): void {
    CACHE.topPending.delete(n)
  }
}
