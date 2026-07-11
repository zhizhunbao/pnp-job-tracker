import type { CollectionConfig } from 'payload'

// 榜单维度(E5-02,PRD F8)— ETL(10_build_rankings.py→mart)写入,页面只 SELECT 渲染(计算下沉铁律)。
// 每行 = 某榜单(slug)的一名(kind=job 逐岗 / kind=company 公司聚合);展示字段已冗余,页面零 join。
export const Rankings: CollectionConfig = {
  slug: 'rankings',
  admin: { useAsTitle: 'slug', defaultColumns: ['slug', 'rank', 'kind', 'title', 'company'], group: 'Data (ETL)' },
  fields: [
    { name: 'slug', type: 'text', index: true, admin: { description: '榜单 slug(weekly-top / sponsor-likely)' } },
    { name: 'rank', type: 'number' },
    { name: 'kind', type: 'text', admin: { description: 'job | company' } },
    { name: 'externalId', type: 'text', admin: { description: 'kind=job:回 /jobs 定位用' } },
    { name: 'title', type: 'text' },
    { name: 'company', type: 'text' },
    { name: 'companySlug', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'province', type: 'text' },
    { name: 'noc', type: 'text' },
    { name: 'teer', type: 'number' },
    { name: 'score', type: 'number' },
    { name: 'salaryText', type: 'text' },
    { name: 'salaryAnnual', type: 'number' },
    { name: 'pnpStream', type: 'text' },
    { name: 'eeCategory', type: 'text' },
    { name: 'datePosted', type: 'text' },
    { name: 'applyUrl', type: 'text' },
    { name: 'officialUrl', type: 'text' },
    { name: 'openJobs', type: 'number' },
    { name: 'namedJobs', type: 'number' },
    { name: 'avgScore', type: 'number' },
    // #21(第 17 轮拍板):sponsor-likely 第一排序键上榜可见——近两年获批 LMIA 技能股职位数 + 最近季度
    { name: 'lmiaPositions', type: 'number' },
    { name: 'lmiaQuarter', type: 'text' },
  ],
}
