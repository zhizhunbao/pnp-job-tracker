import type { CollectionConfig } from 'payload'

// 联邦 Express Entry「类别抽选」职业维度 — ETL(mart)写入。每行=某类别内一个职业。
// 全国单一源(canada.ca)。与 PNP 是两条不同路 → 独立信号。前端按 label 分组渲染 + 高亮本岗。
export const EeCategories: CollectionConfig = {
  slug: 'ee-categories',
  admin: { useAsTitle: 'title', defaultColumns: ['label', 'noc', 'teer', 'title'], group: 'Data (ETL)' },
  fields: [
    { name: 'category', type: 'text', index: true, admin: { description: '类别 key(healthcare/stem/…)' } },
    { name: 'label', type: 'text', index: true, admin: { description: '类别中文标签(医疗社服/STEM/…)' } },
    { name: 'noc', type: 'text', index: true },
    { name: 'teer', type: 'number' },
    { name: 'title', type: 'text' },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
    { name: 'drawCrs', type: 'number', admin: { description: '该类别最近一次抽选 CRS 分数线' } },
    { name: 'drawDate', type: 'text', admin: { description: '该类别最近一次抽选日期' } },
    { name: 'drawSize', type: 'number', admin: { description: '该类别最近一次抽选发出邀请数' } },
  ],
}
