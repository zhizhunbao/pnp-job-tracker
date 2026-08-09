// 判定层六张表的进程内缓存(单一件):/api/pathways 与 /api/triple-verdict 共用同一个对象。
// 🔴 详情页是全站流量最大的页,判定层六张表禁每请求现算(prod-pool-wedge 教训)——
// 缓存必须是跨路由单件,不是每个 route 模块各存一份(那是两倍的整库扫描)。
// TTL 10 分钟,Render 单实例,重启即失效;与 /api/quiz topCache 同手法。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { loadVerdictData } from './chatTools'
import type { VerdictData } from './pathVerdict'

let cache: { at: number; data: VerdictData } | null = null
const TTL = 10 * 60_000

export async function getVerdictData(): Promise<VerdictData> {
  if (!cache || Date.now() - cache.at > TTL) {
    const payload = await getPayload({ config: await config })
    cache = { at: Date.now(), data: await loadVerdictData((payload.db as any).pool) }
  }
  return cache.data
}
