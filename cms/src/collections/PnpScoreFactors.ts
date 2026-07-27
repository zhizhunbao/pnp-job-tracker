import type { CollectionConfig } from 'payload'

// 省提名「注册打分表」维度(E12-09)— ETL(mart)写入,一行一档。
// 现有 BC SIRS(200 分制,官方 Program Guide PDF 抓);ON 改制后 EOI 未开、官方未公布分数表 → 暂无行。
// ⚠️ 红线:这是**官方分值表**,不是本站算法。前端按它做的自评分只能叫「按官方分值表自算」,
// 与官方审核结果不是一回事(官方以文件审核为准);任何展示都必须带 guideEffective 与官方链接。
export const PnpScoreFactors: CollectionConfig = {
  slug: 'pnp-score-factors',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['province', 'factor', 'kind', 'label', 'points'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'system', type: 'text', admin: { description: '分制名(SIRS 等)——各省互不相通,展示必带' } },
    { name: 'factor', type: 'text', index: true, admin: { description: 'work / education / language / wage / area' } },
    { name: 'kind', type: 'text', admin: { description: 'row=档位 / bonus=加分 / rule=规则(wage 那种不穷举的)' } },
    { name: 'seq', type: 'number', admin: { description: '同节内顺序(官方表的行序)' } },
    { name: 'label', type: 'text' },
    { name: 'points', type: 'number', admin: { description: 'rule 行为空' } },
    { name: 'xorPrev', type: 'checkbox', admin: { description: '与上一条加分二选一(官方原文的「…, or」)' } },
    { name: 'rule', type: 'text', admin: { description: 'rule 行的公式与边界(JSON 串)' } },
    { name: 'factorMax', type: 'number', admin: { description: '该节上限(官方 Max)' } },
    { name: 'maxTotal', type: 'number', admin: { description: '该省总分上限' } },
    { name: 'guideEffective', type: 'text', admin: { description: '官方指南生效日期——过期检测锚点' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
  ],
}
