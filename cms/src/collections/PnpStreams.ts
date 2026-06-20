import type { CollectionConfig } from 'payload'

// 省提名通道 — 参考数据,在 Admin 人工维护(内容管理)。
export const PnpStreams: CollectionConfig = {
  slug: 'pnp-streams',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'province', 'ignoresCRS', 'requiresJobOffer'],
    group: 'Reference (CMS)',
  },
  fields: [
    { name: 'key', type: 'text', unique: true, index: true, admin: { description: '如 OINP-EJO / SINP-TECH' } },
    { name: 'name', type: 'text', required: true },
    { name: 'province', type: 'text', index: true },
    { name: 'isExpressEntry', type: 'checkbox', defaultValue: false, admin: { description: 'EE对齐(有CRS地板)' } },
    { name: 'requiresJobOffer', type: 'checkbox', defaultValue: true },
    { name: 'ignoresCRS', type: 'checkbox', defaultValue: false, admin: { description: 'base非EE,不看CRS' } },
    { name: 'officialUrl', type: 'text' },
    { name: 'notes', type: 'textarea' },
  ],
}
