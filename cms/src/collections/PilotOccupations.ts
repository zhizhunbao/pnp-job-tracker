import type { CollectionConfig } from 'payload'

// RCIP/FCIP 社区 × 职业清单(E6-11 批B)— ETL 写入,源=各社区官方程序站。
// 官方只给行业名不给 NOC 的行:sectorOnly=true 且 noc 空(留痕不硬编码,同 PE/NL 惯例)。
export const PilotOccupations: CollectionConfig = {
  slug: 'pilot-occupations',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['community', 'noc', 'title'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'community', type: 'text', required: true, index: true },
    { name: 'province', type: 'text' },
    { name: 'type', type: 'text', admin: { description: 'RCIP | FCIP' } },
    { name: 'noc', type: 'text', index: true, admin: { description: '5 位码;官方只给职业/行业名时为空' } },
    { name: 'title', type: 'text', admin: { description: '官方原文职业/行业名' } },
    { name: 'sectorOnly', type: 'checkbox', defaultValue: false },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
  ],
}
