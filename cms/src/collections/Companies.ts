import type { CollectionConfig } from 'payload'

// 公司 — ETL 写入(公司目录/官网)。按公司组织数据的核心实体。
export const Companies: CollectionConfig = {
  slug: 'companies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'region', 'website', 'isDesignatedEmployer', 'isAgency'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'website', type: 'text' },
    { name: 'websiteSource', type: 'text', admin: { description: '官网来路:空=雇主自报/名录;jd=帖内线索;searched=自动检索(前端加小字,E8-04 D2)' } },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'region', type: 'text', index: true },
    { name: 'sectors', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'isDesignatedEmployer', type: 'checkbox', defaultValue: false },
    { name: 'isAgency', type: 'checkbox', defaultValue: false, admin: { description: '中介/派遣 — 不会担保' } },
    { name: 'source', type: 'text' },
    // LMIA 外劳雇佣记录(E6-02,ESDC 季度开放数据近 8 季聚合)——历史事实,非「能担保」判定
    { name: 'lmiaPositions', type: 'number', admin: { description: '获批 LMIA 职位数(近两年)' } },
    { name: 'lmiaLmias', type: 'number', admin: { description: '获批 LMIA 份数(近两年)' } },
    { name: 'lmiaLastQuarter', type: 'text', admin: { description: '最近获批季度,如 2025Q4' } },
    { name: 'lmiaStreams', type: 'text', admin: { description: '股别分布(展示串),如 High Wage 44 · Low Wage 12' } },
  ],
}
