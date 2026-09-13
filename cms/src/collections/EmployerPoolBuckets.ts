import type { CollectionConfig } from 'payload'

// 雇主 × 行业组桶行(雇主板重构批一,2026-08-30;设计稿 docs/design/雇主板重构-20260829.md)——
// ETL 写入。切面星住桶行:同一雇主在不同行业下星级不同(裸 LMIA 总量霸榜的老病根,
// 证据必须按行业交叉)。indGroup='' = 指定雇主但无在招线索的通用桶;'other' = 未分类岗桶。
// 2026-09-13 Frank「八组」:桶键由本站 27 大类(列 broad)改切 8 行业组(列 ind_group,键 = etl/noc GROUP_KEYS,
// 与把脉页 IND_KEYS 同一份);DDL docs/sql/employer-pool-groups-20260913.sql(RENAME COLUMN,唯一键与索引跟随)。
// 🔴 建表走 docs/sql/employer-pool.sql 手写 DDL(含唯一键 (employer_key,ind_group)、切面索引、
// payload_locked_documents_rels 补列),别指望 DB_PUSH 建它。
// 🔴 entryShare / wageMedAnnual / wageIndexPct 可空保 null —— 空 = 无在招不表态,不是 0。
export const EmployerPoolBuckets: CollectionConfig = {
  slug: 'employer-pool-buckets',
  admin: {
    useAsTitle: 'employerKey',
    defaultColumns: ['employerKey', 'indGroup', 'star', 'openJobs', 'entryShare'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'employerKey', type: 'text', required: true, index: true, admin: { description: '= employer_pool.key' } },
    { name: 'indGroup', type: 'text', index: true, admin: { description: '行业组键(8 组);other = 未分类岗桶;空串 = 指定雇主无线索通用桶' } },
    { name: 'openJobs', type: 'number', admin: { description: '该行业组下在招量' } },
    { name: 'latestPosted', type: 'text', admin: { description: '该行业组下最新发布日;空 = 无在招' } },
    { name: 'topTitles', type: 'json', admin: { description: '该行业组下代表职位名 string[]' } },
    { name: 'entryJobs', type: 'number', admin: { description: '入门可及岗数(不要经验/带训)' } },
    { name: 'entryShare', type: 'number', admin: { description: '入门可及占比;空 = 无在招不表态,不是 0' } },
    { name: 'minExperience', type: 'text', admin: { description: '该行业组最低经验档;空 = 官方未写' } },
    { name: 'lmiaSkilled', type: 'number', admin: { description: '该行业组技能类 LMIA 获批数(旁证)' } },
    { name: 'lmiaLastQuarter', type: 'text', admin: { description: '该行业组最近一期 LMIA 季度标;空 = 无记录' } },
    { name: 'star', type: 'number', admin: { description: '切面星级 1-5:指定雇主 >> 在招活跃+入门可及 > 技能类 LMIA' } },
    { name: 'wageMedAnnual', type: 'number', admin: { description: '该行业组年薪中位;空 = 无水位数据,不折 0' } },
    { name: 'wageIndexPct', type: 'number', admin: { description: 'vs 同行业组同省中位的百分位;空 = 无水位数据' } },
  ],
}
