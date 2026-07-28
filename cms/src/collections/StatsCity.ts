import type { CollectionConfig } from 'payload'

// E8-14 统计主图「横轴=城市」的数据源(2,386 行)。ETL 算好,前端零计算透传。
export const StatsCity: CollectionConfig = {
  slug: 'stats-city',
  admin: { useAsTitle: 'city', defaultColumns: ['city', 'province', 'openJobs'], group: 'Data (ETL)' },
  fields: [
    { name: 'city', type: 'text', index: true }, { name: 'province', type: 'text', index: true },
    { name: 'openJobs', type: 'number' }, { name: 'new7d', type: 'number' },
    { name: 'medianWageAnnual', type: 'number' }, { name: 'medianSalaryAnnual', type: 'number' }, { name: 'salaryN', type: 'number' }, { name: 'namedJobs', type: 'number' },
    { name: 'fetched', type: 'text' },
  ],
}
