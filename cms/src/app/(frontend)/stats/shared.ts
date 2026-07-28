// 地区统计共享常量/类型(E5-04)—— 非 client 模块:服务端页面(generateMetadata/SQL)与客户端视图都要用。
// 老坑 6:服务端组件从 'use client' 模块导入常量会拿到 undefined —— 共享常量必须住这种普通模块。

export type StatRow = {
  province: string; broad: string
  mid: string   // NOC 中类;'all'=大类汇总行(旧行/列未落地时读取层回退 'all')
  openJobs: number | null; new7d: number | null
  medianWageAnnual: number | null; medianSalaryAnnual: number | null
  namedJobs: number | null; streamLabels: string; aipJobs: number | null
  topCities: string; fetched: string
  difficulty?: string | Record<string, unknown> | null   // E12-07 难度指数(jsonb,仅 broad=all 行)
}
export type SrcRow = { field: string; publisher: string; url: string; fetched: string }
// 批B(#133):省卡 IRCC 体量(provinces.info jsonb 透传,与 E8-12 省弹框同源同口径)
export type ProvVolNum = { n: number; year: string }
export type ProvVol = { study?: ProvVolNum; tfwp?: ProvVolNum; imp?: ProvVolNum; pnpPr?: ProvVolNum }
export type ProvExtra = { info: ProvVol | null; tier: string | null }

// URL slug ↔ NOC 大类(数据值);顺序即展示顺序
export const BROAD_SLUGS: [string, string][] = [
  ['management', '管理'], ['business', '商务'], ['tech', '科技'], ['health', '医疗'], ['education', '教育'],
  ['culture-sports', '文体'], ['services', '服务'], ['trades', '技工'], ['resources', '资源'], ['manufacturing', '制造'],
]
export const slugToBroad = (s: string) => BROAD_SLUGS.find(([k]) => k === s)?.[1]
// 大类英文名(第 11 轮 #29:SSR <title> 不许中英混杂;与客户端 i18n 'broad.*' EN 值保持一致)
export const BROAD_EN: Record<string, string> = {
  '管理': 'Management', '商务': 'Business', '科技': 'Tech', '医疗': 'Health', '教育': 'Education',
  '文体': 'Arts & Sport', '服务': 'Services', '技工': 'Trades', '资源': 'Resources', '制造': 'Manufacturing',
}
export const broadToSlug = (b: string) => BROAD_SLUGS.find(([, v]) => v === b)?.[0]
export const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS', 'NB', 'NL', 'PE']
export const PROV_NAME: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', SK: 'Saskatchewan', MB: 'Manitoba', QC: 'Quebec',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
}

// E8-14 统计主图的两个数据源(ETL 算好,前端零计算透传)
export type OccRow = { noc: string; province: string; titleZh: string; titleZhShort: string; titleEn: string; titleKo: string
  teer: number | null; broad: string; openJobs: number | null; new7d: number | null
  medianSalaryAnnual: number | null; namedJobs: number | null }
export type CityRow = { city: string; cityZh: string; cityKo: string; province: string; openJobs: number | null; new7d: number | null
  medianSalaryAnnual: number | null; namedJobs: number | null }
