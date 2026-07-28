import type { CollectionConfig } from 'payload'

// E8-14 每日快照(趋势图的唯一数据来源)。ETL 每轮只产出**当天**的行,seed 按
// (date, province, broad) UPSERT 追加 —— **这张表不参与 dims 的「清空 + 重灌」**,那会把历史抹掉。
// 粒度 = 日 × 省 × 大类(broad='all' 为该省汇总行),由 11_build_stats 从 stats 大类层直接投影。
// ⚠️ 历史补不回来:今天不落表,今天这个点就永远没有了。
export const StatsDaily: CollectionConfig = {
  slug: 'stats-daily',
  admin: { useAsTitle: 'date', defaultColumns: ['date', 'province', 'broad', 'openJobs'], group: 'Data (ETL)' },
  fields: [
    { name: 'date', type: 'text', index: true, admin: { description: 'YYYY-MM-DD(ETL 跑的那天)' } },
    { name: 'province', type: 'text', index: true },
    { name: 'broad', type: 'text', admin: { description: "职业大类;'all' = 该省汇总" } },
    { name: 'openJobs', type: 'number' },
    { name: 'new7d', type: 'number' },
    { name: 'medianSalaryAnnual', type: 'number' },
    { name: 'namedJobs', type: 'number' },
  ],
}
