import type { CollectionConfig } from 'payload'

// 雇主 × 本站大类桶行(雇主板重构批一,2026-08-30;设计稿 docs/design/雇主板重构-20260829.md)——
// ETL 写入。切面星住桶行:同一雇主在不同职业大类下星级不同(裸 LMIA 总量霸榜的老病根,
// 证据必须按职业大类交叉)。broad='' = 指定雇主但无在招线索的通用桶。
// 🔴 建表走 docs/sql/employer-pool.sql 手写 DDL(含唯一键 (employer_key,broad)、切面索引、
// payload_locked_documents_rels 补列),别指望 DB_PUSH 建它。
// 🔴 entryShare / wageMedAnnual / wageIndexPct 可空保 null —— 空 = 无在招不表态,不是 0。
export const EmployerPoolBuckets: CollectionConfig = {
  slug: 'employer-pool-buckets',
  admin: {
    useAsTitle: 'employerKey',
    defaultColumns: ['employerKey', 'broad', 'star', 'openJobs', 'entryShare'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'employerKey', type: 'text', required: true, index: true, admin: { description: '= employer_pool.key' } },
    { name: 'broad', type: 'text', index: true, admin: { description: '本站大类;空串 = 指定雇主无线索通用桶' } },
    { name: 'openJobs', type: 'number', admin: { description: '该大类下在招量' } },
    { name: 'latestPosted', type: 'text', admin: { description: '该大类下最新发布日;空 = 无在招' } },
    { name: 'topTitles', type: 'json', admin: { description: '该大类下代表职位名 string[]' } },
    { name: 'entryJobs', type: 'number', admin: { description: '入门可及岗数(不要经验/带训)' } },
    { name: 'entryShare', type: 'number', admin: { description: '入门可及占比;空 = 无在招不表态,不是 0' } },
    { name: 'minExperience', type: 'text', admin: { description: '该大类最低经验档;空 = 官方未写' } },
    { name: 'lmiaSkilled', type: 'number', admin: { description: '该大类技能类 LMIA 获批数(旁证)' } },
    { name: 'lmiaLastQuarter', type: 'text', admin: { description: '该大类最近一期 LMIA 季度标;空 = 无记录' } },
    { name: 'star', type: 'number', admin: { description: '切面星级 1-5:指定雇主 >> 在招活跃+入门可及 > 技能类 LMIA' } },
    { name: 'wageMedAnnual', type: 'number', admin: { description: '该大类年薪中位;空 = 无水位数据,不折 0' } },
    { name: 'wageIndexPct', type: 'number', admin: { description: 'vs 同大类中位的百分位;空 = 无水位数据' } },
  ],
}
