import type { CollectionConfig } from 'payload'

// E8-14 统计主图「横轴=城市」的数据源(2,386 行)。ETL 算好,前端零计算透传。
// 2026-09-11 城市段重设计批:内容改由 seed 收尾在库内按职位板同口径重算(SQL.REFRESH_CITY_STATS,
// 快照=对账后的 DB,消掉与职位板 18~22% 的口径差);pilot / pilotCommunity 两列同批加
// (城市级专属通道信号;DDL docs/sql/pulse-city-20260911.sql 先行)。
export const StatsCity: CollectionConfig = {
  slug: 'stats-city',
  admin: { useAsTitle: 'city', defaultColumns: ['city', 'province', 'openJobs'], group: 'Data (ETL)' },
  fields: [
    { name: 'city', type: 'text', index: true }, { name: 'province', type: 'text', index: true },
    { name: 'openJobs', type: 'number' }, { name: 'new7d', type: 'number' },
    { name: 'medianWageAnnual', type: 'number' }, { name: 'medianSalaryAnnual', type: 'number' }, { name: 'salaryN', type: 'number' }, { name: 'namedJobs', type: 'number' },
    { name: 'pilot', type: 'text' }, { name: 'pilotCommunity', type: 'text' },
    { name: 'byBroad', type: 'json' },
    { name: 'fetched', type: 'text' },
  ],
}
