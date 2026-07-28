import type { CollectionConfig } from 'payload'

// E8-14 统计主图「横轴=职业」的数据源。粒度 = 职业 × 省;province='all' 为全国行。
// 现有 stats 表是 省×大类×中类,出不了具体职业 —— 这张补上。ETL 算好,前端零计算透传。
export const StatsOccupation: CollectionConfig = {
  slug: 'stats-occupation',
  admin: { useAsTitle: 'titleZh', defaultColumns: ['noc', 'province', 'titleZh', 'openJobs'], group: 'Data (ETL)' },
  fields: [
    { name: 'noc', type: 'text', index: true },
    { name: 'province', type: 'text', index: true, admin: { description: "'all' = 全国行" } },
    { name: 'titleZh', type: 'text' }, { name: 'titleEn', type: 'text' },
    { name: 'teer', type: 'number' }, { name: 'broad', type: 'text' },
    { name: 'openJobs', type: 'number' }, { name: 'new7d', type: 'number' },
    { name: 'medianSalaryAnnual', type: 'number' }, { name: 'namedJobs', type: 'number' },
    { name: 'fetched', type: 'text' },
  ],
}
