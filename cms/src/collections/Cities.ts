import type { CollectionConfig } from 'payload'

// 城市维度 — ETL(mart)写入。来自岗位数据里出现的所有城市(去重)。
export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'province'], group: 'Data (ETL)' },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true, admin: { description: '2位省码' } },
    // #151:通行中/韩译名(clean/04g;小镇无通行译名=留空,前端只显英文)
    { name: 'nameZh', type: 'text', admin: { description: '城市中文通行译名(显示用灰注)' } },
    { name: 'nameKo', type: 'text', admin: { description: '城市韩文通行译名(显示用灰注)' } },
    // 2026-09-11 城市段批二:五格城市刻度(statcan 段6;人工核定城市清单外 = null 不折 0;
    // DDL docs/sql/pulse-city-20260911.sql 已先行)
    { name: 'population', type: 'number', admin: { description: 'CSD 人口(StatCan 17-10-0155 年度估计)' } },
    { name: 'popPeriod', type: 'text', admin: { description: '人口期标(refPer)' } },
    { name: 'unempRate', type: 'number', admin: { description: '🔴 所在都会区(CMA)失业率,非本市口径(14-10-0459 月度季调)' } },
    { name: 'unempPeriod', type: 'text', admin: { description: '失业率期标(月)' } },
    { name: 'cma', type: 'text', admin: { description: '所在 CMA 成员名' } },
  ],
}
