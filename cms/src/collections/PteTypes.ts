import type { CollectionConfig } from 'payload'

// PTE Core 题型维度(2026-09-03 Frank「上」:pte 研究域升产品域,设计稿 docs/design/PTE刷题-20260903.md)
// — ETL(etl/pte pte-mart 步)写入。一行 = 一种题型,三语名 + 所属 section + 考试序 + 题面是否以音频呈现。
// 首批四型 RA / RS / ASQ / WFD;其余 15 型批二后扩。code 与 etl/pte 的 CORE_TYPES 同码。
export const PteTypes: CollectionConfig = {
  slug: 'pte-types',
  admin: { useAsTitle: 'code', defaultColumns: ['code', 'section', 'nameZh', 'nameEn', 'audio'], group: 'Data (ETL)' },
  fields: [
    { name: 'code', type: 'text', required: true, index: true, admin: { description: '标准题型码(RA / RS / ASQ / WFD …)' } },
    { name: 'section', type: 'text', admin: { description: 'Speaking / Writing / Reading / Listening' } },
    { name: 'seq', type: 'number', admin: { description: '考试序(页面胶囊按它排)' } },
    { name: 'nameZh', type: 'text' },
    { name: 'nameEn', type: 'text', admin: { description: '官方英文题型名(Pearson)' } },
    { name: 'nameKo', type: 'text' },
    { name: 'audio', type: 'checkbox', admin: { description: '题面以音频呈现(先听后答)' } },
  ],
}
