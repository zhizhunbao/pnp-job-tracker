import type { CollectionConfig } from 'payload'

// 经验级别维度 — ETL(mart)写入。co-op/junior/intermediate/senior/unknown。
export const ExperienceLevels: CollectionConfig = {
  slug: 'experience-levels',
  admin: { useAsTitle: 'name', defaultColumns: ['name'], group: 'Data (ETL)' },
  fields: [{ name: 'name', type: 'text', required: true, index: true }],
}
