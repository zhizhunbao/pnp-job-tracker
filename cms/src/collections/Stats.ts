import type { CollectionConfig } from 'payload'

// 地区统计维度(E5-04)— ETL(11_build_stats.py→mart)写入,页面只 SELECT 渲染。
// 每行 = 省 × NOC 大类(broad='all'=省级汇总);口径见各字段注释(页面「口径说明」同源)。
export const Stats: CollectionConfig = {
  slug: 'stats',
  admin: { useAsTitle: 'province', defaultColumns: ['province', 'broad', 'openJobs', 'namedJobs'], group: 'Data (ETL)' },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'broad', type: 'text', index: true, admin: { description: 'NOC 大类(数据值)| all=省级汇总' } },
    { name: 'mid', type: 'text', admin: { description: 'NOC 中类(数据值)| all=大类汇总(下钻 L2,2026-07-19)' } },
    { name: 'openJobs', type: 'number', admin: { description: '在招岗数(本站抓取口径)' } },
    { name: 'new7d', type: 'number', admin: { description: '7 天新增(datePosted 近 7 天)' } },
    { name: 'medianWageAnnual', type: 'number', admin: { description: '中位年薪(ESDC 口径:桶内各岗 NOC×省中位的中位数)' } },
    { name: 'medianSalaryAnnual', type: 'number', admin: { description: '帖面中位年薪(本站折算口径,对照)' } },
    { name: 'namedJobs', type: 'number', admin: { description: '省具名通道命中岗数' } },
    { name: 'streamLabels', type: 'text', admin: { description: '命中的通道名(、分隔)' } },
    { name: 'aipJobs', type: 'number' },
    { name: 'topCities', type: 'textarea', admin: { description: 'json:[{city,n}] 前 5 城市' } },
    { name: 'fetched', type: 'text' },
  ],
}
