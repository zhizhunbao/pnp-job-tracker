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

// URL slug ↔ 本站大类(数据值);顺序即展示顺序。单一来源 = etl/noc_buckets.py 的 BROADS,改那边要同步这里。
export const BROAD_SLUGS: [string, string][] = [
  ['management', '管理层'], ['business', '商务'], ['administration', '行政'], ['office', '文员'], ['finance', '金融'],
  ['accounting', '会计'], ['legal', '法律'], ['it', 'IT'], ['engineering', '工程'], ['science', '科学'],
  ['healthcare', '医疗'], ['education', '教育'], ['social-services', '社会服务'], ['arts', '艺术'], ['sport', '体育'],
  ['sales', '销售'], ['retail', '零售'], ['food-service', '餐饮'], ['hospitality', '住宿'], ['personal-services', '生活服务'],
  ['trades', '技工'], ['construction', '建筑'], ['transport', '运输'], ['logistics', '物流'], ['agriculture', '农业'],
  ['mining', '矿业'], ['manufacturing', '制造'],
]
export const slugToBroad = (s: string) => BROAD_SLUGS.find(([k]) => k === s)?.[1]
// 大类英文名(第 11 轮 #29:SSR <title> 不许中英混杂;与客户端 i18n 'broad.*' EN 值保持一致)
export const BROAD_EN: Record<string, string> = {
  '管理层': 'Management', '商务': 'Business', '行政': 'Administration', '文员': 'Office clerks', '金融': 'Finance',
  '会计': 'Accounting', '法律': 'Legal', 'IT': 'IT', '工程': 'Engineering', '科学': 'Science',
  '医疗': 'Healthcare', '教育': 'Education', '社会服务': 'Social services', '艺术': 'Arts', '体育': 'Sport',
  '销售': 'Sales', '零售': 'Retail', '餐饮': 'Food service', '住宿': 'Hospitality', '生活服务': 'Personal services',
  '技工': 'Trades', '建筑': 'Construction', '运输': 'Transport', '物流': 'Logistics', '农业': 'Agriculture',
  '矿业': 'Mining', '制造': 'Manufacturing',
}
export const broadToSlug = (b: string) => BROAD_SLUGS.find(([, v]) => v === b)?.[0]
export const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NS', 'NB', 'NL', 'PE']
export const PROV_NAME: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', SK: 'Saskatchewan', MB: 'Manitoba', QC: 'Quebec',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
}

// E8-14 统计主图的两个数据源(ETL 算好,前端零计算透传)
// E13-03 派生指标(契约 v3,见 docs/implementation/E13-把脉首页/00_总设计与口径.md §3 修订 v3):
//   上前端的只有 new14d / new14dPrev(分母)/ mom14d(14 天发帖环比)/ avgDaysOpen / pulseScore。
//   **30 天口径与下架口径都不进这个类型**:
//     · mom30d 的分母窗卡在抓取全国化爬坡期(全员假涨),有成熟度闸门,约 8-31 后才可信;
//     · closed30d/net30d 的判死日≠真实下架日,7-25 起的排水期虚高。
//   凡上前端的数字必须经得起「怎么算的」追问 —— 两者同入 E13-04。
//   列可能还没落库:读取层逐列探测(见 lib.ts loadOccStats),缺列即 null,
//   前端「null=该卡/该行/该榜整块不渲染」(绝不显示 0 或 NaN)。
export type OccRow = { noc: string; province: string; titleZh: string; titleZhShort: string; titleEn: string; titleKo: string
  teer: number | null; broad: string; mid: string; fine: string; openJobs: number | null; new7d: number | null
  medianWageAnnual: number | null; wageLowAnnual: number | null; wageHighAnnual: number | null
  medianSalaryAnnual: number | null; salaryN: number | null; namedJobs: number | null
  new14d: number | null; new14dPrev: number | null; mom14d: number | null
  avgDaysOpen: number | null; pulseScore: number | null
  pnpProvs: string | null; channelTier: string | null }
export type CityRow = { city: string; cityZh: string; cityKo: string; province: string; openJobs: number | null; new7d: number | null
  medianWageAnnual: number | null; medianSalaryAnnual: number | null; salaryN: number | null; namedJobs: number | null }
