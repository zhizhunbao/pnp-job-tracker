import type { CollectionConfig } from 'payload'

// AIP 指定雇主名单 — ETL 写入(NL/NB/NS)。NL 一省取官方省站全量名录(639 家,带申报 NOC),
// NB/NS 仍来自旧聚合源(无 NOC 信息)。供 Jobs/Companies 交叉匹配 isDesignatedEmployer;
// nocs 供判定层数「哪些雇主申报过某职业」(如 NL 639 家里 3 家申报过木工 72310)。
export const DesignatedEmployers: CollectionConfig = {
  slug: 'designated-employers',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'province', 'location', 'isTech'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'province', type: 'text', index: true },
    { name: 'location', type: 'text' },
    { name: 'isTech', type: 'checkbox', defaultValue: false },
    { name: 'source', type: 'text', admin: { description: 'AIP官方名单来源(NL/NB/NS)' } },
    { name: 'nocs', type: 'text', admin: { description: '雇主申报的 NOC 码(逗号连接)。仅 NL(官方省站名录)有;空 = 未申报职位(NL)或来源不含此信息(NB/NS)' } },
    { name: 'url', type: 'text', admin: { description: '雇主页出处(NL 官方名录逐家页);判定层引用此表事实时的 evidence' } },
    { name: 'fetched', type: 'text', admin: { description: '本站抓取日(evidence 随行)' } },
  ],
}
