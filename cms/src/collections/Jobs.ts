import type { CollectionConfig } from 'payload'

// 职位 — ETL 写入(评分后)。externalId 用于 upsert 去重。
export const Jobs: CollectionConfig = {
  slug: 'jobs',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'province', 'noc', 'score', 'status'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'company', type: 'relationship', relationTo: 'companies' },
    { name: 'noc', type: 'text', index: true, admin: { description: 'NOC 2021 5位码' } },
    { name: 'province', type: 'text', index: true },
    { name: 'city', type: 'text' },
    { name: 'region', type: 'text', index: true },
    { name: 'applyUrl', type: 'text', admin: { description: '第一方投递链接' } },
    { name: 'officialUrl', type: 'text' },
    { name: 'salary', type: 'text' },
    { name: 'datePosted', type: 'date' },
    { name: 'source', type: 'text', admin: { description: 'ATS名/JobBank/...' } },
    { name: 'isAgency', type: 'checkbox', defaultValue: false },
    { name: 'pnpStreams', type: 'relationship', relationTo: 'pnp-streams', hasMany: true },
    { name: 'policyRefs', type: 'relationship', relationTo: 'policy-docs', hasMany: true },
    {
      name: 'accessibility',
      type: 'select',
      defaultValue: 'unknown',
      options: ['co-op', 'junior', 'intermediate', 'senior', 'unknown'],
    },
    { name: 'score', type: 'number', index: true, admin: { description: '移民价值评分 0-100' } },
    { name: 'firstSeen', type: 'date' },
    { name: 'lastSeen', type: 'date' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      index: true,
      options: ['open', 'closed'],
    },
    { name: 'externalId', type: 'text', unique: true, index: true, admin: { description: 'posting_id,用于增量去重' } },
  ],
}
