import type { CollectionConfig } from 'payload'

// 职业在招量聚合 — ETL(09_build_mart)写入,一行一个 NOC。
//
// 🔴 为什么要有这张表(2026-08-12 Frank「把这个数据现在数据库里聚合好」):
//    选职业控件的热门榜先前是**每次请求现算**一个 GROUP BY(还带 percentile_cont 求中位),
//    慢到只能靠进程内缓存兜着,前端还得分两次拉(先内置 14 个兜底、再换真榜)——
//    用户看到的就是「一点一点刷出来」。脏活归 ETL:那边一次算完,这里只是读。
//    落盘即按 open 降序(消费端不再排序);open 上有索引,取前 N 是一次索引扫描。
export const NocOpenings: CollectionConfig = {
  slug: 'noc-openings',
  admin: { useAsTitle: 'noc', defaultColumns: ['noc', 'titleZh', 'open', 'eligible', 'medianSalary'], group: 'Data (ETL)' },
  fields: [
    { name: 'noc', type: 'text', index: true, admin: { description: 'NOC 2021 五位码' } },
    { name: 'open', type: 'number', index: true, admin: { description: '在招岗位数(status=open)' } },
    { name: 'eligible', type: 'number', admin: { description: '其中 pnpEligible 的岗位数' } },
    { name: 'medianSalary', type: 'number', admin: { description: '在招岗年薪中位(与旧 SQL 的 percentile_cont(0.5) 同口径)' } },
    { name: 'broad', type: 'text', index: true, admin: { description: '本站浏览大类(该职业岗位里出现最多的那个)' } },
    { name: 'title', type: 'text', admin: { description: 'NOC 官方英文名(一个字不动)' } },
    { name: 'titleZh', type: 'text' },
    { name: 'titleZhShort', type: 'text', admin: { description: '窄位短名(04g 产,三语)' } },
    { name: 'titleKoShort', type: 'text' },
    { name: 'titleEnShort', type: 'text' },
  ],
}
