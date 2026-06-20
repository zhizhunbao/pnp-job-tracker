import type { CollectionConfig } from 'payload'

// AIP 指定雇主名单 — ETL 写入(NL/NB/NS)。供 Jobs/Companies 交叉匹配 isDesignatedEmployer。
export const DesignatedEmployers: CollectionConfig = {
  slug: 'designated-employers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'province', 'location', 'isTech'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true },
    { name: 'location', type: 'text' },
    { name: 'isTech', type: 'checkbox', defaultValue: false },
    { name: 'source', type: 'text', admin: { description: 'AIP官方名单来源(NL/NB/NS)' } },
  ],
}
