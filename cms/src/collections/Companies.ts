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
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'region', type: 'text', index: true },
    { name: 'sectors', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'isDesignatedEmployer', type: 'checkbox', defaultValue: false },
    { name: 'isAgency', type: 'checkbox', defaultValue: false, admin: { description: '中介/派遣 — 不会担保' } },
    { name: 'source', type: 'text' },
  ],
}
