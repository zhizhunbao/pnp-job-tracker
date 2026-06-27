import type { CollectionConfig } from 'payload'

// 政策文件 — 每个职位关联到适用的政策原文(本地路径 + 官方URL)。
export const PolicyDocs: CollectionConfig = {
  slug: 'policy-docs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'province'],
    group: 'Reference (CMS)',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'province', type: 'text', index: true },
    { name: 'sourceUrl', type: 'text', admin: { description: '官方政策URL' } },
    { name: 'localPath', type: 'text', admin: { description: 'data/policy/ 下的本地原文路径' } },
    { name: 'body', type: 'textarea' },
  ],
}
