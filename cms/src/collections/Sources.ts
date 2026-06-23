import type { CollectionConfig } from 'payload'

// 来源维度 — ETL(mart)写入。岗位原始来源板(indeed/lever/Job Bank…)。
export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: { useAsTitle: 'name', defaultColumns: ['name'], group: 'Data (ETL)' },
  fields: [{ name: 'name', type: 'text', required: true, index: true }],
}
