// 模型输出 → 我们认的值(省名别名、topic 收敛),外加单请求的查询记忆。
//
// 红线:**认不出就丢** —— 宁可少一个省,不许把 NB 当 NS。模型给的字符串一律不可信,
// 两位码直接用,省名/中文别名查表,其余丢掉。
import { type ClaimTopic, PNP_PROVINCES } from './tools'
import type { SlotClaimTopic } from './types'

// ── 小工具 ──────────────────────────────────────────────────────────────────

/** 一次请求内的查询记忆:多个职业工具会重复调 assembleReportFacts(同 noc 同 SQL),同参只查一次。 */
export function memoPool(pool: any) {
  const cache = new Map<string, Promise<any>>()
  return {
    query(sql: string, params?: unknown[]) {
      const k = `${sql}||${JSON.stringify(params ?? [])}`
      const hit = cache.get(k)
      if (hit) return hit
      const p: Promise<any> = pool.query(sql, params)
      cache.set(k, p)
      return p
    },
  }
}

export const PROV_ALIAS: Record<string, string> = {
  ONTARIO: 'ON', 安省: 'ON', 安大略: 'ON', 안타리오: 'ON',
  'BRITISH COLUMBIA': 'BC', 卑诗: 'BC', 卑詩: 'BC', 不列颠哥伦比亚: 'BC', BC省: 'BC',
  ALBERTA: 'AB', 阿省: 'AB', 阿尔伯塔: 'AB', 亚伯达: 'AB',
  SASKATCHEWAN: 'SK', 萨省: 'SK', 薩省: 'SK', 萨斯喀彻温: 'SK',
  MANITOBA: 'MB', 曼省: 'MB', 曼尼托巴: 'MB',
  'NOVA SCOTIA': 'NS', 新斯科舍: 'NS', 诺省: 'NS',
  'NEW BRUNSWICK': 'NB', 新不伦瑞克: 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL', NEWFOUNDLAND: 'NL', 纽芬兰: 'NL',
  'PRINCE EDWARD ISLAND': 'PE', PEI: 'PE', 爱德华王子岛: 'PE',
  QUEBEC: 'QC', 魁省: 'QC', 魁北克: 'QC',
}
export const ALL_PROVS = new Set([...PNP_PROVINCES, 'QC'])
/** 模型输出不可信:两位码直接用,省名/中文别名查表,认不出就丢(宁可少一个省,不许把 NB 当 NS)。 */
export function normProv(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (!s) return null
  if (ALL_PROVS.has(s)) return s
  return PROV_ALIAS[s] ?? PROV_ALIAS[s.replace(/[省州]$/, '')] ?? null
}

const TOPICS: ClaimTopic[] = ['coverage', 'thresholds', 'jobs', 'draws', 'ops', 'ee', 'private-promise']
export const normTopic = (raw: unknown): SlotClaimTopic => (TOPICS.includes(String(raw ?? '') as ClaimTopic) ? (String(raw) as ClaimTopic) : 'other')
