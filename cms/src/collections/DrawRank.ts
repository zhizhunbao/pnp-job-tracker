import type { CollectionConfig } from 'payload'

// 抽选页排名表(2026-10-12 抽选页三段式,docs/design/资讯/抽选-三段式-20261012.md)— ETL 写入:etl/mart/rank 子域读
// pnp_draws / pnp_ops_stats / pathways / macro_series 四张 mart 表 → data/mart/draw_rank.json → seed。
// 一行 = 一张卡:配额卡(kind=quota,联邦 + 各省)与抽选节奏卡(kind=cadence,一条通道一张),名次与状态都在数据层算好,前端只读。
// ⚠️ 新表,生产库必须先手动跑 docs/sql/draw-rank-20261012.sql(含 payload_locked_documents_rels.draw_rank_id),再部署本改动。
export const DrawRank: CollectionConfig = {
  slug: 'draw-rank',
  admin: { useAsTitle: 'key', defaultColumns: ['kind', 'rank', 'key', 'province'], group: 'Data (ETL)' },
  fields: [
    { name: 'key', type: 'text', index: true, admin: { description: '卡片稳定键(通道键 / 省码:流名族 / ee-类别键 / 省码)' } },
    { name: 'kind', type: 'text', admin: { description: 'quota 配额卡 / cadence 抽选节奏卡' } },
    { name: 'rank', type: 'number', admin: { description: '名次(两种卡各排各的,1 起)' } },
    { name: 'score', type: 'number', admin: { description: '综合分(0~1)' } },
    { name: 'province', type: 'text', admin: { description: '省码(联邦 = FED)' } },
    { name: 'label', type: 'text', admin: { description: '联邦 EE 类别键(前端查 ee.* 词条出中 / 韩名);其余空串' } },
    { name: 'nameEn', type: 'text', admin: { description: '英文名(配额卡空串,前端按省码出省名)' } },
    { name: 'nameZh', type: 'text', admin: { description: '中文名(空串 = 没有;合卡看 covers)' } },
    { name: 'nameKo', type: 'text', admin: { description: '韩文名(同上)' } },
    { name: 'covers', type: 'json', admin: { description: '一次抽选覆盖的几条通道 [{en, zh, ko}](只有合卡才有)' } },
    { name: 'streams', type: 'json', admin: { description: '这张卡统计的抽选流名(点卡片按它筛事件流)' } },
    { name: 'scale', type: 'text', admin: { description: '最近一期的分制' } },
    { name: 'lastDate', type: 'text', admin: { description: '最近一期抽选日期(到日;NS 只到月)' } },
    { name: 'avgGapDays', type: 'number', admin: { description: '平均间隔天数(NULL = 算不出)' } },
    { name: 'status', type: 'text', admin: { description: 'ok 正常 / late 比平常晚 / idle 久未抽选' } },
    { name: 'drawsYtd', type: 'number', admin: { description: '今年抽选次数' } },
    { name: 'invitationsYtd', type: 'number', admin: { description: '今年邀请人数(NULL = 没公布)' } },
    { name: 'inviteUnit', type: 'text', admin: { description: '人数口径 invitation / selection / application' } },
    { name: 'nominationsYtd', type: 'number', admin: { description: '今年已发提名(NULL = 没有 / 本站未收录)' } },
    { name: 'allocation', type: 'number', admin: { description: '配额卡:2026 配额 / 联邦永居目标(NULL = 本站未收录)' } },
    { name: 'allocationKind', type: 'text', admin: { description: 'quota 省配额 / prTarget 联邦永居目标' } },
    { name: 'asOf', type: 'text', admin: { description: '统计日(汇装当天)' } },
  ],
}
