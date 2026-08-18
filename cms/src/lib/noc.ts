// NOC 分类的**显示**层:分类名取译、职业名译名、大分类配色。
// 分类名/层级(broad/mid/fine/teer)由 ETL(etl/noc.py → mart)算好存在 job 字段上,
// 前端不再用 NOC 码现算 —— 单一来源在数据层,这里只负责怎么显示。
import type { Lang, TFn } from '@/lib/i18n'
import type { NocDesc } from '@/app/(frontend)/jobs/types'

// 中/小分类显示名(值仍是数据层中文,筛选/查询语义不变)。
// 2026-08-03 起**名字住维度表**:分类换成 NOC 官方层级(89 个中类 + 162 个小类)之后,
// 再靠 i18n 里人肉维护 cat.* 就是等着英文界面冒中文(#247 那类事故)——
// noc_categories 每行自带 mid_en/mid_ko/fine_en/fine_ko,页面拿到 dims 时登记一次。
// 登记表查不到才退回老路:cat.* → broad.*(老值仍在库里) → 原值。
const CAT_L10N: Record<string, { en?: string; ko?: string }> = {}

export function registerCatLabels(rows: { broad?: string; mid?: string; fine?: string; broadEn?: string; broadKo?: string; midEn?: string; midKo?: string; fineEn?: string; fineKo?: string }[]): void {
  for (const r of rows) {
    if (r.broad && (r.broadEn || r.broadKo)) CAT_L10N[r.broad] = { en: r.broadEn, ko: r.broadKo }
    if (r.mid && (r.midEn || r.midKo)) CAT_L10N[r.mid] = { en: r.midEn, ko: r.midKo }
    if (r.fine && (r.fineEn || r.fineKo)) CAT_L10N[r.fine] = { en: r.fineEn, ko: r.fineKo }
  }
}

export function catName(t: TFn, v: string): string {
  const lang = t.lang ?? 'zh'
  if (lang !== 'zh') {
    const hit = CAT_L10N[v]?.[lang === 'ko' ? 'ko' : 'en']
    if (hit) return hit
  }
  for (const k of ['cat.' + v, 'broad.' + v]) { const s = t(k); if (s !== k) return s }
  return v
}

// #147:界面语言下的职业名译名(英文界面/无译名→空,调用方不渲染灰注)。英文名永远是主文案(Frank 拍板「英文在前」)
export const nocLocalTitle = (n: NocDesc | null | undefined, lang: Lang): string =>
  (lang === 'zh' ? n?.titleZh : lang === 'ko' ? n?.titleKo : '') || ''

export type Cat = { bg: string; fg: string }
const NA: Cat = { bg: '#fafafa', fg: '#9ca3af' }
// 同一行业族共用色相(蓝=办公室、青=钱与法、天蓝紫=科技、绿紫=人、粉=文体、
// 黄=卖、橙=吃住、红灰=蓝领、青柠=运、土色=一二产),扫一眼能按族分堆。
const BROAD_COLOR: Record<string, Cat> = {
  管理层: { bg: '#dbeafe', fg: '#1e40af' }, 商务: { bg: '#e0e7ff', fg: '#3730a3' },
  行政: { bg: '#eef2ff', fg: '#4338ca' }, 文员: { bg: '#f1f5f9', fg: '#334155' },
  金融: { bg: '#ccfbf1', fg: '#115e59' }, 会计: { bg: '#d1fae5', fg: '#065f46' },
  法律: { bg: '#e2e8f0', fg: '#1f2937' },
  IT: { bg: '#cffafe', fg: '#155e75' }, 工程: { bg: '#e0f2fe', fg: '#075985' },
  科学: { bg: '#ede9fe', fg: '#5b21b6' },
  医疗: { bg: '#dcfce7', fg: '#166534' }, 教育: { bg: '#fae8ff', fg: '#86198f' },
  社会服务: { bg: '#f5d0fe', fg: '#701a75' },
  艺术: { bg: '#fce7f3', fg: '#9d174d' }, 体育: { bg: '#ffe4e6', fg: '#9f1239' },
  销售: { bg: '#fef3c7', fg: '#92400e' }, 零售: { bg: '#fef9c3', fg: '#854d0e' },
  餐饮: { bg: '#ffedd5', fg: '#9a3412' }, 住宿: { bg: '#fed7aa', fg: '#7c2d12' },
  生活服务: { bg: '#fff7ed', fg: '#7c2d12' },
  技工: { bg: '#fee2e2', fg: '#991b1b' }, 建筑: { bg: '#e7e5e4', fg: '#57534e' },
  运输: { bg: '#d9f99d', fg: '#3f6212' }, 物流: { bg: '#ecfccb', fg: '#4d7c0f' },
  农业: { bg: '#dcfce7', fg: '#14532d' }, 矿业: { bg: '#fde68a', fg: '#713f12' },
  制造: { bg: '#f3f4f6', fg: '#374151' },
}
export const colorOf = (broad?: string): Cat => (broad && BROAD_COLOR[broad]) || NA
