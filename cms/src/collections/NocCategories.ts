import type { CollectionConfig } from 'payload'

// NOC 分类维度 — ETL(mart)写入。大/中/小分类 + TEER 的层级组合(数据集出现的)。
export const NocCategories: CollectionConfig = {
  slug: 'noc-categories',
  admin: { useAsTitle: 'fine', defaultColumns: ['broad', 'mid', 'fine', 'teer'], group: 'Data (ETL)' },
  fields: [
    { name: 'broad', type: 'text', index: true, admin: { description: '大分类' } },
    { name: 'mid', type: 'text', index: true, admin: { description: '中分类' } },
    { name: 'fine', type: 'text', admin: { description: '小分类' } },
    { name: 'teer', type: 'number', index: true },
  ],
}
