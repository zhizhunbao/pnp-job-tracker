import type { CollectionConfig } from 'payload'

// 省提名通道职业维度 — ETL(mart)写入。每行=某省某具名通道内的一个职业。
// 前端按 province + label 分组,在 AI 顾问弹框上半部渲染清单 + 高亮本岗 NOC。
// type=indemand(命中=符合) / ineligible(命中=不符合,如 AB AAIP 排除清单)。
export const PnpOccupations: CollectionConfig = {
  slug: 'pnp-occupations',
  admin: { useAsTitle: 'name', defaultColumns: ['province', 'label', 'noc', 'name'], group: 'Data (ETL)' },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'stream', type: 'text', admin: { description: '通道官方名(英文)' } },
    { name: 'label', type: 'text', index: true, admin: { description: '通道短标签(前端显示,如「OINP 紧缺技能」)' } },
    { name: 'type', type: 'text', admin: { description: 'indemand(命中=符合) / ineligible(命中=不符合)' } },
    { name: 'noc', type: 'text', index: true },
    { name: 'name', type: 'text' },
    { name: 'gtaRestricted', type: 'checkbox', defaultValue: false, admin: { description: 'ON 限大多伦多区域外' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
  ],
}
