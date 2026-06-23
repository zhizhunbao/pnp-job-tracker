import type { CollectionConfig } from 'payload'

// 区/社区维度 — ETL(mart)写入。目前为大渥太华各社区(Kanata/Nepean/Orléans…)。
export const Districts: CollectionConfig = {
  slug: 'districts',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'city', 'province'], group: 'Data (ETL)' },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'city', type: 'text', index: true },
    { name: 'province', type: 'text', index: true, admin: { description: '2位省码' } },
  ],
}
