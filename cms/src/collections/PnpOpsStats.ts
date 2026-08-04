import type { CollectionConfig } from 'payload'

// 四省(AB/BC/SK/MB)运营统计维度(G5,对话即产品 §三 `lookupOps`)— ETL(mart)写入,前端/人工只读。
// 答的是「等多久 / 名额还剩多少 / 被捞概率多大」:配额、已用、待处理、积压游标、EOI 池人数、处理周数、SIRS 分数段分布。
// 与另三张 pnp_* 分工:occupations=在不在清单、score_factors=能打几分、requirements=先要满足什么、本表=还要等多久。
// ⚠️ 红线:value 可空 —— 官方隐私抑制值(AB「Less than 10」、BC「<5」)与不适用一律 NULL + valueText 存原文,
//    绝不折成 0;这张表的全部意义就是让「0 / 本站没有 / 官方不公布」三件事分得开。
export const PnpOpsStats: CollectionConfig = {
  slug: 'pnp-ops-stats',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['province', 'metric', 'scope', 'value', 'valueText', 'asOf'],
    group: 'Data (ETL)',
  },
  fields: [
    { name: 'province', type: 'text', index: true, admin: { description: 'AB / BC / SK' } },
    { name: 'program', type: 'text', admin: { description: 'PNP / AIP —— 与 pnp_occupations 同族分路' } },
    { name: 'metric', type: 'text', index: true, admin: { description: 'AB: allocation/issued/remaining/to_process/assessing_up_to/eoi_pool/eoi_pool_total · SK: processing_weeks/allocation/nominations_ytd/capped_pct/capped_spots/priority_sector · BC: sirs_pool/processing_months · MB: allocation/nominations_ytd/nominations_enhanced_ytd/refusals_ytd/laa_ytd/applications_received_ytd/in_assessment/pending_assessment/inventory/processing_days(_approved,_refused)/processing_commitment。⚠️ 处理时长的后缀=官方发布的单位,不换算(SK 周 / BC 月 / MB 天)' } },
    { name: 'scope', type: 'text', admin: { description: '具体范围值:官方通道名 / 行业 / SIRS 分数段 "100 - 109" / 阶段名 "Request for review";省级留空串。官方措辞原样,报告要引用' } },
    { name: 'scopeKind', type: 'text', admin: { description: 'stream / sector / category / scoreRange / stage —— 说明 scope 是哪一类;省级留空串' } },
    { name: 'streamKey', type: 'text', admin: { description: '跨指标 join 键(ETL 归一:去括号补充说明+小写压空白)。官网两张表通道名写法不一,不归一则配额与池人数拼不上且静默漏配。只对 scopeKind=stream 算,不展示给用户' } },
    { name: 'label', type: 'text', admin: { description: '官方原文(英文)—— 报告挂出处供核对' } },
    { name: 'value', type: 'number', admin: { description: '🔴 可空:隐私抑制(「Less than 10」/「<5」)或不适用一律留空,原文进 valueText,绝不写 0' } },
    { name: 'valueText', type: 'text', admin: { description: '官方原文的非数值表述("Less than 10" / "<5" / "n/a")' } },
    { name: 'unit', type: 'text', admin: { description: 'people / spots / weeks / months / days / nominations / applications / invitations / percent / text / flag' } },
    { name: 'asOf', type: 'text', admin: { description: '官方口径日(ISO 字符串)—— 过期检测锚点;官方没印就留空,别拿别的日子顶(SK/MB 与 BC 处理时长都没有,看 period)' } },
    { name: 'period', type: 'text', admin: { description: '统计期("2026" / "2026Q2" / "2026 Jan-Jun" / "2026-06" —— MB 库存是该月首个工作日的快照,不是「当前」)' } },
    { name: 'url', type: 'text' },
    { name: 'fetched', type: 'text' },
    { name: 'section', type: 'text', admin: { description: '官方文件节号/表名' } },
    { name: 'seq', type: 'number' },
  ],
}
