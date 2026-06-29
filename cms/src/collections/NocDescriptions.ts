import type { CollectionConfig } from 'payload'

// NOC 2021 官方职业名 + 主要职责 — ETL(mart)写入,源 StatCan Elements 开放 CSV。
// 每行=一个 5 位 NOC。供 NOC/职位弹框显示「官方职业名 + 官方职责」。只收数据集出现过的 NOC。
export const NocDescriptions: CollectionConfig = {
  slug: 'noc-descriptions',
  admin: { useAsTitle: 'title', defaultColumns: ['noc', 'title'], group: 'Data (ETL)' },
  fields: [
    { name: 'noc', type: 'text', index: true, admin: { description: 'NOC 2021 5 位码' } },
    { name: 'title', type: 'text', admin: { description: '官方职业名(Class title)' } },
    { name: 'duties', type: 'textarea', admin: { description: '主要职责(换行分隔)' } },
    { name: 'requirements', type: 'textarea', admin: { description: '任职要求(换行分隔)' } },
    { name: 'fetched', type: 'text' },
  ],
}
