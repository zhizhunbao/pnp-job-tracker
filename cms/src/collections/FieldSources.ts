import type { CollectionConfig } from 'payload'

// 字段级来源维度(E4-04)— ETL(build_field_sources.py→mart)写入。
// 每行 = 一个前端字段的数据集级 citation(kind=dataset,抓取验证过的 title/description 原文)
// 或派生口径(kind=derived,本站口径一句)。前端 SourceLine 按 field 查;记录级 URL 优先于本表。
export const FieldSources: CollectionConfig = {
  slug: 'field-sources',
  admin: { useAsTitle: 'field', defaultColumns: ['field', 'kind', 'publisher', 'status'], group: 'Data (ETL)' },
  fields: [
    { name: 'field', type: 'text', index: true, admin: { description: '前端字段键(ColKey/弹框字段)' } },
    { name: 'kind', type: 'text', admin: { description: 'dataset=外部数据集 | derived=本站派生' } },
    { name: 'publisher', type: 'text' },
    { name: 'url', type: 'text' },
    { name: 'title', type: 'text', admin: { description: '来源页 <title> 原文(不经 LLM 不翻译)' } },
    { name: 'description', type: 'textarea', admin: { description: '来源页 meta description 原文' } },
    { name: 'status', type: 'text', admin: { description: 'verified | unverified | derived' } },
    { name: 'fetched', type: 'text' },
    { name: 'note', type: 'textarea', admin: { description: '派生字段的本站口径说明' } },
  ],
}
