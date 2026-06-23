import type { CollectionConfig } from 'payload'

// 城市维度 — ETL(mart)写入。来自岗位数据里出现的所有城市(去重)。
export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'province'], group: 'Data (ETL)' },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true, admin: { description: '2位省码' } },
  ],
}
