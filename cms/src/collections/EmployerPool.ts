import type { CollectionConfig } from 'payload'

// 雇主池主表(雇主板重构批一,2026-08-30;设计稿 docs/design/雇主板重构-20260829.md)——
// ETL 写入(etl/employers 是唯一口径来源,板与顾问只读)。一行 = 一雇主:池主键 key =
// slug(有公司详情页)或 `n:` + 归一名(只在 LMIA/指定名单里出现过的雇主)。
// 🔴 建表走 docs/sql/employer-pool.sql 手写 DDL(含 payload_locked_documents_rels 补列),
// 这里的字段只为对齐库列与 admin 展示,别指望 DB_PUSH 建它。
export const EmployerPool: CollectionConfig = {
  slug: 'employer-pool',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'province', 'city', 'designated', 'openJobsTotal'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'key', type: 'text', required: true, index: true, admin: { description: '池主键:slug 或 n:+归一名' } },
    { name: 'slug', type: 'text', index: true, admin: { description: '有公司详情页才有;空 = 池内只有名字' } },
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'industry', type: 'text' },
    { name: 'province', type: 'text', index: true },
    { name: 'city', type: 'text' },
    { name: 'designated', type: 'checkbox', defaultValue: false, admin: { description: '指定雇主(AIP/RCIP/FCIP 名单命中);星级权重里最重的一档' } },
    { name: 'designatedPrograms', type: 'json', admin: { description: '命中的项目清单 string[](["AIP","RCIP",…])' } },
    { name: 'designatedProvinces', type: 'json', admin: { description: '命中的省清单 string[]' } },
    { name: 'openJobsTotal', type: 'number', admin: { description: '在招总量(全大类合计);裸 LMIA 总量永不入排序,这个才入' } },
    { name: 'histJobs', type: 'number', admin: { description: '历史累计岗位数(含已下架)' } },
    { name: 'provincesActive', type: 'number' },
    { name: 'citiesActive', type: 'number' },
    { name: 'websiteKnown', type: 'checkbox', defaultValue: false, admin: { description: '本站是否已知官网' } },
    { name: 'lmiaSkilledTotal', type: 'number', admin: { description: '技能类 LMIA 获批数(旁证,不单独入星)' } },
    { name: 'lmiaLastQuarter', type: 'text', admin: { description: '最近一期 LMIA 季度标(如 2025Q2);空 = 无记录' } },
    { name: 'fetched', type: 'text', admin: { description: '本站构建日(evidence 随行)' } },
  ],
}
