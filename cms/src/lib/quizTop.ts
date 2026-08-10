// 热门职业清单缓存(判定合一批3 前置):SWR + 启动预热共用一份状态。
// 为什么单拎一个模块:route 的模块级 Map 只有 route 自己够得着,instrumentation 预热填不进去 ——
// 冷启动后的第一位访客实测吃 8.4s(08-10 生产探针),预热必须和请求路径写同一份缓存。
import { fetchTopNocs } from './jobsSql'

const TTL = 10 * 60_000
const cache = new Map<number, { at: number; rows: unknown[]; refreshing?: boolean }>()
const pending = new Map<number, Promise<unknown[]>>()

/** SWR:命中(含过期)立即返回;过期后台刷。只有整个进程生涯的第一请求真等查询。 */
export async function getTopNocsCached(pool: any, n: number): Promise<unknown[]> {
  const hit = cache.get(n)
  if (hit) {
    if (Date.now() - hit.at >= TTL && !hit.refreshing) {
      hit.refreshing = true
      fetchTopNocs(pool, n).then((rows) => cache.set(n, { at: Date.now(), rows }))
        .catch(() => { hit.refreshing = false })   // 刷失败:旧值继续顶,下次再试
    }
    return hit.rows
  }
  // instrumentation 预热与首个 HTTP 请求可能同时撞进来。没有在途去重时会并发跑两次
  // 4 万岗 GROUP BY(08-10 冷启动实测 8s),预热反而把数据库压力翻倍。
  const inFlight = pending.get(n)
  if (inFlight) return inFlight
  const task = fetchTopNocs(pool, n)
    .then((rows) => { cache.set(n, { at: Date.now(), rows }); return rows })
    .finally(() => pending.delete(n))
  pending.set(n, task)
  return task
}
