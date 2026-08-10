// 判定层六张表的进程内缓存(单一件):/api/pathways 与 /api/triple-verdict 共用同一个对象。
// 🔴 详情页是全站流量最大的页,判定层六张表禁每请求现算(prod-pool-wedge 教训)——
// 缓存必须是跨路由单件,不是每个 route 模块各存一份(那是两倍的整库扫描)。
// TTL 10 分钟,Render 单实例,重启即失效;与 /api/quiz topCache 同手法。
import { getPayload } from 'payload'

import config from '@/payload.config'
import { loadVerdictData } from './chatTools'
import type { DesignatedEmployerRow, VerdictData } from './pathVerdict'

let cache: { at: number; data: VerdictData } | null = null
const TTL = 10 * 60_000

export async function getVerdictData(): Promise<VerdictData> {
  if (!cache || Date.now() - cache.at > TTL) {
    const payload = await getPayload({ config: await config })
    cache = { at: Date.now(), data: await loadVerdictData((payload.db as any).pool) }
  }
  return cache.data
}

/**
 * 指定雇主名录**按省**的全量行(判定卡的雇主名字匹配用;matchDesignation 是纯函数,候选由这里喂)。
 * 🔴 不能改用 VerdictData.designatedEmployers ——那一份是 **NL 专用**(pathVerdict 拿它当
 *    「NL 名录里有几家申报过这个 NOC」的分母),扩成四省会把那个分母一起改掉。
 * 单省最大 NS 1,574 行 ≈ 60KB,四省全热也就 ~200KB;详情页是全站流量最大的页,
 * 名录扫描禁每请求现算(prod-pool-wedge 教训)→ 与 getVerdictData 同 TTL 同手法。
 * 查失败**不进缓存**(不把一次抖动钉死 10 分钟);返回 [] → 判定落「名录没认出」= 本站缺口。
 */
const dirCache = new Map<string, { at: number; rows: DesignatedEmployerRow[] }>()

export async function getDesignatedEmployers(province: string): Promise<DesignatedEmployerRow[]> {
  const prov = (province || '').trim()
  if (!prov) return []
  const hit = dirCache.get(prov)
  if (hit && Date.now() - hit.at <= TTL) return hit.rows

  const payload = await getPayload({ config: await config })
  const res = await (payload.db as any).pool.query(
    `SELECT name, province, location, is_tech, source, nocs, url, fetched
       FROM designated_employers WHERE province = $1`,
    [prov],
  ).catch(() => null)
  if (!res) return []

  const rows: DesignatedEmployerRow[] = (res.rows ?? []).map((d: any): DesignatedEmployerRow => ({
    name: d.name ?? '', province: d.province ?? '', location: d.location ?? '', isTech: !!d.is_tech,
    source: d.source ?? '', nocs: d.nocs ?? '',
    ...(d.url ? { url: d.url } : {}), ...(d.fetched ? { fetched: String(d.fetched).slice(0, 10) } : {}),
  }))
  dirCache.set(prov, { at: Date.now(), rows })
  return rows
}
