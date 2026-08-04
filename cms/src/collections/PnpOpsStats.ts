import type { CollectionConfig } from 'payload'

// 三省(AB/BC/SK)运营统计维度(G5,对话即产品 §三 `lookupOps`)— ETL(mart)写入,前端/人工只读。
// 答的是「等多久 / 名额还剩多少 / 被捞概率多大」:配额、已用、待处理、积压游标、EOI 池人数、处理周数、SIRS 分数段分布。
// 与另三张 pnp_* 分工:occupations=在不在清单、score_factors=能打几分、requirements=先要满足什么、本表=还要等多久。
// ⚠️ 红线:value 可空 —— 官方隐私抑制值(AB「Less than 10」、BC「<5」)与不适用一律 NULL + valueText 存原文,
//    绝不折成 0;这张表的全部意义就是让「0 / 本站没有 / 官方不公布」三件事分得开。
export const PnpOpsStats: CollectionConfig = {
  slug: 'pnp-ops-stats',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['province', 'metric', 'scope', 'value', 'valueText', 'asOf'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'province', type: 'text', index: true, admin: { description: 'AB / BC / SK' } },
    { name: 'program', type: 'text', admin: { description: 'PNP / AIP —— 与 pnp_occupations 同族分路' } },
    { name: 'metric', type: 'text', index: true, admin: { description: 'quota / used / pending / backlogCursor / poolSize / processingWeeks / bandCount' } },
    { name: 'scope', type: 'text', admin: { description: '具体范围值(官方通道名 / SIRS 分数段 "80-89" / all)' } },
    { name: 'scopeKind', type: 'text', admin: { description: 'stream / category / scoreBand / all —— 说明 scope 是哪一类' } },
    { name: 'label', type: 'text', admin: { description: '官方原文(英文)—— 报告挂出处供核对' } },
    { name: 'value', type: 'number', admin: { description: '🔴 可空:隐私抑制(「Less than 10」/「<5」)或不适用一律留空,原文进 valueText,绝不写 0' } },
    { name: 'valueText', type: 'text', admin: { description: '官方原文的非数值表述("Less than 10" / "<5" / "n/a")' } },
    { name: 'unit', type: 'text', admin: { description: 'persons / weeks / nominations / percent' } },
    { name: 'asOf', type: 'text', admin: { description: '官方口径日(ISO 字符串)—— 过期检测锚点' } },
    { name: 'period', type: 'text', admin: { description: '统计期("2026" / "2026-Q2" / "2026-07")' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
    { name: 'section', type: 'text', admin: { description: '官方文件节号/表名' } },
    { name: 'seq', type: 'number' },
  ],
}
