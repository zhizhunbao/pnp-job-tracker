import type { CollectionConfig } from 'payload'

// NOC 分类维度 — ETL(mart)写入。大/中/小分类 + TEER 的层级组合(数据集出现的)。
export const NocCategories: CollectionConfig = {
  slug: 'noc-categories',
  admin: { useAsTitle: 'fine', defaultColumns: ['broad', 'mid', 'fine', 'teer'], group: 'Data (ETL)' },
  fields: [
    { name: 'broad', type: 'text', index: true, admin: { description: '大分类' } },
    { name: 'mid', type: 'text', index: true, admin: { description: '中分类' } },
    { name: 'fine', type: 'text', admin: { description: '小分类' } },
    { name: 'teer', type: 'number', index: true },
    // 中/小分类的英韩名跟着分类走同一条管线(2026-08-03):先前显示层靠 i18n 里人肉维护的 cat.*,
    // 官方分类一换,英文界面立刻冒中文。名字来自 StatCan 官方类别名(英)+ 本地模型译(韩)。
    { name: 'broadEn', type: 'text', admin: { description: '大分类(本站浏览分类的英文名)' } },
    { name: 'broadKo', type: 'text' },
    { name: 'midEn', type: 'text', admin: { description: '中分类(官方英文名,去掉套话前缀)' } },
    { name: 'midKo', type: 'text' },
    { name: 'fineEn', type: 'text', admin: { description: '小分类(官方英文名,去掉套话前缀)' } },
    { name: 'fineKo', type: 'text' },
    // 2026-09-13 雇主板批二:大类所属的行业组键(8 组,etl/noc GROUP_KEYS;未分类 = 空串)——
    // 前端 noc → 组 的换算读这一列,不再各自抄分组表。DDL docs/sql/employer-pool-groups-20260913.sql。
    { name: 'indGroup', type: 'text', index: true, admin: { description: '行业组键(health/stem/…);空串 = 未分类' } },
  ],
}
