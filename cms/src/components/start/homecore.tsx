/**
 * start 域的服务端件:取首页聚合(缓存 + 单飞,现查的那一下注 loadHomeCore 进去;2026-11-05 按段懒加载批)。
 * 页面门与 /api/stats/pulse 共用这一份,只从 ./server 门出。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import type { Db } from '@/lib/db'
import { sharedHomeOf } from './functions'
import { loadHomeCore } from './homeload'
import type { HomeStatsCore } from './types'

/**
 * 取首页聚合:新鲜给缓存,过期同一刻只放一个请求去查。
 *
 * @param db 连接池(页面门 / 路由芯注入)。
 * @returns 那份聚合。
 */
export function getHomeCore(db: Db): Promise<HomeStatsCore> {
  return sharedHomeOf<Db>({ db, load: loadHomeCore })
}
