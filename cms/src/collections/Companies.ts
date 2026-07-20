import type { CollectionConfig } from 'payload'

// 公司 — ETL 写入(公司目录/官网)。按公司组织数据的核心实体。
export const Companies: CollectionConfig = {
  slug: 'companies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'region', 'website', 'isDesignatedEmployer', 'isAgency'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'website', type: 'text' },
    { name: 'websiteSource', type: 'text', admin: { description: '官网来路:空=雇主自报/名录;jd=帖内线索;searched=自动检索(前端加小字,E8-04 D2)' } },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'region', type: 'text', index: true },
    { name: 'sectors', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'isDesignatedEmployer', type: 'checkbox', defaultValue: false },
    { name: 'isAgency', type: 'checkbox', defaultValue: false, admin: { description: '中介/派遣 — 不会担保' } },
    { name: 'source', type: 'text' },
    // LMIA 外劳雇佣记录(E6-02,ESDC 季度开放数据近 8 季聚合)——历史事实,非「能担保」判定
    { name: 'lmiaPositions', type: 'number', admin: { description: '获批 LMIA 职位数(近两年)' } },
    { name: 'lmiaLmias', type: 'number', admin: { description: '获批 LMIA 份数(近两年)' } },
    { name: 'lmiaLastQuarter', type: 'text', admin: { description: '最近获批季度,如 2025Q4' } },
    { name: 'lmiaStreams', type: 'text', admin: { description: '股别分布(展示串),如 High Wage 44 · Low Wage 12' } },
    // K 公司懒探索(2026-07-19):首开公司弹框时 AI 联网调查一次,存这四列永久复用;与 directory 自带 website/description 分开存
    { name: 'aiBrief', type: 'textarea', admin: { description: 'AI 检索整理的公司简介(懒生成)' } },
    { name: 'aiWebsite', type: 'text', admin: { description: 'AI 检索到的官网(非库内 directory 原有,前端标注区分)' } },
    { name: 'aiSources', type: 'textarea', admin: { description: '检索出处 URL 列表(JSON 数组串)' } },
    { name: 'aiFetched', type: 'date', admin: { description: 'AI 调查时间' } },
    // 雇主 D(2026-07-19):行业=在库岗 NOC 大类多数派;别名=Wikidata 官方跨语言标签(不机翻);知名=有 Wikipedia 条目
    { name: 'industry', type: 'text', admin: { description: '主营行业(NOC 大类多数派,数据层算)' } },
    { name: 'aliasZh', type: 'text', admin: { description: '中文别名(Wikidata zh 标签,查不到留空)' } },
    { name: 'aliasKo', type: 'text', admin: { description: '韩文别名(Wikidata ko 标签)' } },
    { name: 'wikiUrl', type: 'text', admin: { description: 'Wikipedia 条目(E12-08 后不再单独出「知名」徽标,作公司分知名度维依据)' } },
    // E12-08 公司档(1-5):担保档=公司名旁药丸;四维明细 jsonb(担保/活跃/薪资/知名)
    { name: 'sponsorGrade', type: 'number', index: true, admin: { description: '担保记录档 1-5(E12-08;空=无 LMIA 记录不评,≠不担保)' } },
    { name: 'scoreDetail', type: 'json', admin: { description: '公司四维档明细 {sponsor/active/salary/fame:{g,v}}' } },
  ],
}
