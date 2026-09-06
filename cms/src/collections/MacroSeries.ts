import type { CollectionConfig } from 'payload'

// 宏观时间序列长表(把脉页省份段,契约 docs/design/把脉页省份段-契约-20260906.md §2)— ETL 写入,
// 源=StatCan WDS 四表 + IRCC 开放数据三表 + EE 历次抽选(etl/mart 段21 汇装)。
// 一行 = 一个(geo, key, period)点;唯一键 geo+key+period(DDL docs/sql/macro-series.sql)。
// 🔴 官方缺位的点根本不出行(ETL 侧不折 0);as_of 说的是「这个点截至什么时候」——
// 完整年 = YYYY,进行年 YTD = YYYY-MM,季/月 = period 本身,前端必须照它标口径。
export const MacroSeries: CollectionConfig = {
  slug: 'macro-series',
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['geo', 'key', 'period', 'value', 'unit', 'asOf'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'geo', type: 'text', required: true, index: true, admin: { description: 'CA | 十省两位码(领地不收)' } },
    { name: 'key', type: 'text', required: true, index: true, admin: { description: '指标键(契约 §3 键表)' } },
    { name: 'period', type: 'text', required: true, admin: { description: '季/月度=refPer YYYY-MM-DD;年度=YYYY' } },
    { name: 'freq', type: 'text', admin: { description: 'Q | M | A' } },
    { name: 'value', type: 'number', admin: { description: '值;官方缺位的点不出行,不折 0' } },
    { name: 'asOf', type: 'text', admin: { description: '完整年=YYYY;进行年 YTD=YYYY-MM;季/月=period 本身' } },
    { name: 'unit', type: 'text', admin: { description: 'people | dollars_millions | percent | nominations' } },
    { name: 'source', type: 'text', admin: { description: '官方页 URL(alloc 逐年各归各的出处页)' } },
    { name: 'fetched', type: 'text' },
  ],
}
