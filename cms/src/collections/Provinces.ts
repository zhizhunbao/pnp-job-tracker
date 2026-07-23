import type { CollectionConfig } from 'payload'

// 省份维度 — ETL(mart)写入。加拿大 10 省。
export const Provinces: CollectionConfig = {
  slug: 'provinces',
  admin: { useAsTitle: 'name', defaultColumns: ['code', 'name'], group: 'Data (ETL)' },
  fields: [
    { name: 'code', type: 'text', required: true, index: true, unique: true, admin: { description: '2位省码,如 ON' } },
    { name: 'name', type: 'text', required: true, admin: { description: '全称,如 Ontario' } },
    { name: 'info', type: 'json', admin: { description: 'E8-12 省弹框体量卡:IRCC 学签/工签存量、PR 登陆、提名配额({study,tfwp,imp,pnpPr,alloc},各带年份)' } },
  ],
}
