import type { CollectionConfig } from 'payload'

// 省提名官方**门槛**维度(E13-01 规则引擎)— ETL(mart)写入,一行一条可核验的官方门槛。
// 现有 BC(Skills Immigration Program Guide 官方 PDF 抓:语言 / 最低家庭收入 / 经验 / 雇主侧两条)。
// 三张 pnp_* 表各答一个问题:occupations=在不在清单、score_factors=能打几分、requirements=先要满足什么。
// ⚠️ 红线:阈值一个都不许前端编;抓不到就是没有(报告说「本站未收录」),不拿别省的门槛套。
export const PnpRequirements: CollectionConfig = {
  slug: 'pnp-requirements',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['province', 'subject', 'factor', 'op', 'value', 'label'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'province', type: 'text', index: true },
    { name: 'program', type: 'text', admin: { description: 'PNP / AIP —— 与 pnp_occupations 同族分路' } },
    { name: 'stream', type: 'text', admin: { description: '官方通道名;通用要求写「(all streams)」' } },
    { name: 'subject', type: 'text', admin: { description: 'applicant=落在申请人 / employer=落在雇主(OINP 起雇主也有门槛)' } },
    { name: 'factor', type: 'text', index: true, admin: { description: 'language / income / experience / education / empYears / empStaff' } },
    { name: 'op', type: 'text', admin: { description: '>= / <= / in / none(none=官方明说这档不要求)' } },
    { name: 'value', type: 'number', admin: { description: '数值阈值(CLB 4 / 24 个月 / 31264 加元)' } },
    { name: 'valueText', type: 'text', admin: { description: '非数值阈值(学历档名等)' } },
    { name: 'unit', type: 'text' },
    { name: 'appliesTeer', type: 'text', admin: { description: '"2,3,4,5" —— 空=不分 TEER' } },
    { name: 'appliesArea', type: 'text', admin: { description: 'metro-vancouver / rest-of-bc —— 空=全省' } },
    { name: 'appliesFamilySize', type: 'number', admin: { description: '最低收入表专用(1..7,7=7 人及以上)' } },
    { name: 'basis', type: 'text', admin: { description: 'occMedian 等「阈值不是绝对数」的口径' } },
    { name: 'label', type: 'text', admin: { description: '官方原文(英文)—— 报告挂出处供核对' } },
    { name: 'section', type: 'text', admin: { description: '官方文件节号(3.4 / 3.10 / 6.8)' } },
    { name: 'seq', type: 'number' },
    { name: 'effective', type: 'text', admin: { description: '官方生效日 —— 过期检测锚点' } },
    { name: 'url', type: 'text' },
    { name: 'pageUrl', type: 'text' },
    { name: 'fetched', type: 'text' },
  ],
}
